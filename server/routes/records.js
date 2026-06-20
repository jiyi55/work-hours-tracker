const express = require('express');
const db = require('../database');
const { authMiddleware } = require('./auth');

const router = express.Router();

// 计算工时的辅助函数
function calculateWorkHours(startTime, endTime) {
    const startHour = parseInt(startTime.substring(0, 2));
    const startMin = parseInt(startTime.substring(2, 4));
    const endHour = parseInt(endTime.substring(0, 2));
    const endMin = parseInt(endTime.substring(2, 4));

    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes;
    const totalHours = totalMinutes / 60;

    // 计算关键时长
    let keyMinutes = 0;

    // 时段1: 12:00-14:00
    const key1Start = 12 * 60;
    const key1End = 14 * 60;
    keyMinutes += overlapMinutes(startMinutes, endMinutes, key1Start, key1End);

    // 时段2: 22:00-24:00
    const key2Start = 22 * 60;
    const key2End = 24 * 60;
    keyMinutes += overlapMinutes(startMinutes, endMinutes, key2Start, key2End);

    // 时段3: 00:00-06:00 (第二天)
    const key3Start = 0;
    const key3End = 6 * 60;
    if (endMinutes > 24 * 60) {
        const day2Start = Math.max(startMinutes, 24 * 60) - 24 * 60;
        const day2End = endMinutes - 24 * 60;
        keyMinutes += overlapMinutes(day2Start, day2End, key3Start, key3End);
    }

    const keyHours = keyMinutes / 60;

    return { totalHours, keyHours };
}

function overlapMinutes(start1, end1, start2, end2) {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    if (overlapStart < overlapEnd) {
        return overlapEnd - overlapStart;
    }
    return 0;
}

// 获取指定月份的记录
router.get('/', authMiddleware, (req, res) => {
    const { month } = req.query; // 格式: YYYY-MM

    if (!month) {
        return res.status(400).json({ error: '缺少月份参数' });
    }

    const userId = req.user.userId;
    
    const records = db.prepare(`
        SELECT id, date, start_time as startTime, end_time as endTime, 
               total_hours as totalHours, key_hours as keyHours
        FROM records 
        WHERE user_id = ? AND date LIKE ?
        ORDER BY date ASC, created_at ASC
    `).all(userId, `${month}%`);

    res.json({ records });
});

// 添加记录
router.post('/', authMiddleware, (req, res) => {
    const { date, startTime, endTime } = req.body;
    const userId = req.user.userId;

    if (!date || !startTime || !endTime) {
        return res.status(400).json({ error: '缺少必要参数' });
    }

    // 验证时间格式
    if (!/^\d{4}$/.test(startTime) || !/^\d{4}$/.test(endTime)) {
        return res.status(400).json({ error: '时间格式不正确' });
    }

    const { totalHours, keyHours } = calculateWorkHours(startTime, endTime);

    const result = db.prepare(`
        INSERT INTO records (user_id, date, start_time, end_time, total_hours, key_hours)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, date, startTime, endTime, totalHours, keyHours);

    const record = {
        id: result.lastInsertRowid,
        date,
        startTime,
        endTime,
        totalHours,
        keyHours
    };

    res.json({ record });
});

// 删除记录
router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    // 先检查记录是否属于该用户
    const record = db.prepare('SELECT id FROM records WHERE id = ? AND user_id = ?').get(id, userId);
    if (!record) {
        return res.status(404).json({ error: '记录不存在' });
    }

    db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(id, userId);

    res.json({ success: true });
});

// 获取月度统计
router.get('/stats/:month', authMiddleware, (req, res) => {
    const { month } = req.params; // 格式: YYYY-MM
    const userId = req.user.userId;

    const stats = db.prepare(`
        SELECT 
            COUNT(*) as tripCount,
            COALESCE(SUM(total_hours), 0) as totalHours,
            COALESCE(SUM(key_hours), 0) as keyHours
        FROM records 
        WHERE user_id = ? AND date LIKE ?
    `).get(userId, `${month}%`);

    res.json({
        tripCount: stats.tripCount,
        totalHours: stats.totalHours,
        keyHours: stats.keyHours
    });
});

module.exports = router;
