require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
const recordsRouter = require('./routes/records');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/records', recordsRouter);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 处理前端路由（单页应用）
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
    console.log(`工作时长统计服务已启动`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`API 地址: http://localhost:${PORT}/api`);
});
