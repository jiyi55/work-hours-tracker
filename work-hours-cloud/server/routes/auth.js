const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'work-hours-tracker-secret-key-2024';

// 注册
router.post('/register', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查邮箱是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
        return res.status(400).json({ error: '该邮箱已注册' });
    }

    // 加密密码
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 插入用户
    const result = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);
    
    const userId = result.lastInsertRowid;
    
    // 生成 token
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
        token,
        user: { id: userId, email }
    });
});

// 登录
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
        return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 生成 token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
        token,
        user: { id: user.id, email: user.email }
    });
});

// 验证 token 中间件
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
}

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: { id: req.user.userId, email: req.user.email } });
});

module.exports = { router, authMiddleware };
