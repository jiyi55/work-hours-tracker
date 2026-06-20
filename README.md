# 工作时长统计 - 云端数据存储版

一款专为铁路乘务人员设计的工作时长统计工具，支持云端数据存储，多设备同步。

## 功能特点

- ✅ **云端数据存储**：数据保存在服务器数据库，换设备登录数据同步
- ✅ **用户认证系统**：邮箱注册登录，JWT Token 认证
- ✅ **月度工时统计**：月总工时（目标100h）、关键时长（目标50h）、出勤趟数
- ✅ **关键时段计算**：自动计算 12:00-14:00 和 22:00-次日06:00 的工作时长
- ✅ **小添乘功能**：一键增加16小时工时
- ✅ **记录管理**：添加、删除出勤记录
- ✅ **月份切换**：查看和补录历史月份数据
- ✅ **响应式设计**：支持电脑和手机访问

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite（文件型数据库，无需额外安装）
- **认证**：JWT (JSON Web Token)
- **前端**：原生 HTML/CSS/JavaScript
- **密码加密**：bcryptjs

## 快速开始

### 方式一：一键部署到 Railway（推荐，5分钟搞定）

Railway 提供免费额度，足够个人使用。

1. 访问 https://railway.app 注册账号
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择包含本项目代码的仓库
4. 等待自动部署完成
5. 在 Settings 中设置环境变量：
   ```
   JWT_SECRET=你的自定义密钥（随机字符串）
   ```
6. 部署完成后即可通过 Railway 提供的域名访问

### 方式二：部署到 Render

1. 访问 https://render.com 注册账号
2. 点击 "New" → "Web Service"
3. 连接 GitHub 仓库
4. 配置：
   - Runtime: Node
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node server.js`
5. 添加环境变量：
   ```
   JWT_SECRET=你的自定义密钥
   ```
6. 点击 "Create Web Service" 等待部署

### 方式三：本地运行

```bash
# 进入服务器目录
cd server

# 安装依赖
npm install

# 复制环境变量配置
cp ../.env.example .env
# 编辑 .env 修改 JWT_SECRET

# 启动服务
npm start
```

访问 http://localhost:3000 即可使用。

### 方式四：Docker 部署

```bash
# 构建镜像
docker build -t work-hours-tracker .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e JWT_SECRET=your-secret-key \
  work-hours-tracker
```

## 项目结构

```
work-hours-cloud/
├── server/                 # 后端代码
│   ├── server.js          # 主服务文件
│   ├── database.js        # 数据库配置
│   ├── routes/
│   │   ├── auth.js        # 认证路由（注册/登录）
│   │   └── records.js     # 记录管理路由
│   ├── package.json       # 依赖配置
│   └── package-lock.json
├── public/                 # 前端静态文件
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   └── app.js             # 前端逻辑
├── data/                   # 数据库文件目录（自动创建）
│   └── work_hours.db      # SQLite 数据库文件
├── .env.example           # 环境变量示例
├── Dockerfile             # Docker 配置
└── README.md              # 项目说明
```

## API 接口文档

### 认证接口

#### 注册
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### 记录接口

#### 获取月度记录
```
GET /api/records?month=2024-06
Authorization: Bearer {token}

Response:
{
  "records": [
    {
      "id": 1,
      "date": "2024-06-01",
      "startTime": "0800",
      "endTime": "2000",
      "totalHours": 12,
      "keyHours": 2
    }
  ]
}
```

#### 添加记录
```
POST /api/records
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2024-06-01",
  "startTime": "0800",
  "endTime": "2000"
}

Response:
{
  "record": {
    "id": 1,
    "date": "2024-06-01",
    "startTime": "0800",
    "endTime": "2000",
    "totalHours": 12,
    "keyHours": 2
  }
}
```

#### 删除记录
```
DELETE /api/records/{id}
Authorization: Bearer {token}

Response:
{
  "success": true
}
```

## 关键时段说明

系统自动计算以下两个时段的工作时长：

1. **午间时段**：12:00 - 14:00（2小时）
2. **夜间时段**：22:00 - 次日06:00（8小时）

## 数据备份

SQLite 数据库文件位于 `data/work_hours.db`，定期备份此文件即可备份所有数据。

## 安全说明

- 密码使用 bcrypt 加密存储
- 使用 JWT Token 进行身份认证
- 生产环境请务必修改 JWT_SECRET 为复杂随机字符串
- 建议启用 HTTPS

## 许可证

MIT License
