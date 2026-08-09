#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js。请先安装 Node.js 20 或更高版本。"
  read -r -p "按回车退出..."
  exit 1
fi
echo "Node: $(node -v)"
echo "正在安装/检查依赖..."
npm install
echo "启动 RabbitMQ 中文控制台..."
npm run dev
