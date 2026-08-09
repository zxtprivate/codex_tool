# RabbitMQ 中文控制台

一个运行在本地的 RabbitMQ Management API 中文管理界面。默认连接地址预填为 `192.168.6.60:15672`，但可以连接任意可访问的 RabbitMQ Management 地址。

## 功能

- 中文 Dashboard：节点、消息、连接、通道、消费者、速率
- 虚拟主机（VHost）管理
- 队列（Queue）查看、创建、读取消息、清空、删除
- 交换机（Exchange）查看、创建、测试发布、删除
- 绑定（Binding）查看、创建、删除
- 用户、标签、VHost 权限管理
- Connection 查看和强制断开
- Channel / Consumer 查看
- 系统节点资源与健康检查
- 深色 / 浅色模式
- 危险操作要求输入资源名称二次确认
- RabbitMQ 密码仅保存于本地 Node 进程内存，浏览器只保存 HttpOnly Session Cookie

## 安全设计

1. 浏览器不会直接请求 RabbitMQ，因此 RabbitMQ 不需要开启 CORS。
2. RabbitMQ 用户名和密码只保存在当前 Node.js 进程内存，不写入 localStorage、文件或数据库。
3. 控制台 Session 默认 8 小时过期；重启控制台后所有已登录凭据立即消失。
4. Docker Compose 默认只把控制台绑定到 `127.0.0.1:8787`。
5. 建议不要把 RabbitMQ Management (`15672`) 或 AMQP (`5672`) 暴露到公网。

## 本地开发运行

需要 Node.js 20+。

```bash
npm install
npm run dev
```

浏览器访问：

```text
http://localhost:5173
```

Vite 会把 `/api` 代理到本地后端 `http://127.0.0.1:8787`。

## 本地生产运行

```bash
npm install
npm run build
npm start
```

浏览器访问：

```text
http://127.0.0.1:8787
```

## Docker 运行

```bash
docker compose up -d --build
```

浏览器访问：

```text
http://127.0.0.1:8787
```

## 默认连接值

首次登录页面默认：

- 协议：HTTP
- RabbitMQ 地址：`192.168.6.60`
- Management：`15672`
- AMQP：`5672`

这些只是默认值，可以直接修改。

## RabbitMQ 权限

完整管理功能需要 RabbitMQ 管理用户具有足够的 Management UI / HTTP API 权限。普通业务用户即使能够通过 AMQP 使用某个 VHost，也不一定有权查看全局连接、用户或节点信息。

## HTTP API

本项目根据 RabbitMQ 4.3 Management HTTP API 实现。消息的 HTTP 发布/读取适合测试与排查，不建议替代业务程序中的 AMQP 客户端。

官方文档：

- https://www.rabbitmq.com/docs/management
- https://www.rabbitmq.com/docs/http-api-reference
- https://www.rabbitmq.com/docs/access-control

## 目录

```text
rabbitmq-cn-console/
├── server/          # 本地 Node/Express 代理，持有短期 RabbitMQ 凭据
├── web/             # React + TypeScript + Ant Design + ECharts
├── Dockerfile
├── docker-compose.yml
└── README.md
```
