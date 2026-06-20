FROM node:18-alpine

WORKDIR /app

# 复制服务器文件
COPY server/ ./server/

# 复制前端文件
COPY public/ ./public/

# 安装依赖
WORKDIR /app/server
RUN npm install --production

# 创建数据目录
RUN mkdir -p /app/data

# 环境变量
ENV PORT=3000
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "server.js"]
