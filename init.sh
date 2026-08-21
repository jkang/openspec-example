#!/bin/bash

# OpenSpec Practice - 项目初始化与启动脚本
# 统一管理多语言/多模块架构的启动与测试

set -e

# 端口配置
NODE_PORT=3000
NODE_PROD_PORT=3002
PYTHON_PORT=8000
VUE_PORT=5173

# 检查并释放被占用的端口
function free_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo "-> 端口 $port 被占用 (PID: $pid)，正在释放..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
        echo "-> 端口 $port 已释放"
    fi
}

function show_help() {
    echo "========================================================"
    echo " OpenSpec Practice - Harness 启动脚本"
    echo " 架构层级: "
    echo " 1. Node.js 后端  (ecommerce/ecommerce-mini)"
    echo " 2. Python 后端   (ecommerce/ecommerce-mini-python)"
    echo " 3. Vue 3 前端    (ecommerce/ecommerce-mini-frontend)"
    echo "========================================================"
    echo "用法: ./init.sh [command]"
    echo ""
    echo "可用命令:"
    echo "  --- Node.js ---"
    echo "  node:install    - 安装 Node.js 后端依赖 (如有)"
    echo "  node:start      - 启动 Node.js 开发服务器 (端口 3000)"
    echo "  node:prod       - 启动 Node.js 生产服务器 (端口 3002)"
    echo "  node:test       - 运行 Node.js 测试套件"
    echo ""
    echo "  --- Python ---"
    echo "  python:install  - 安装 Python 后端依赖"
    echo "  python:start    - 启动 FastAPI 开发服务器 (端口 8000)"
    echo "  python:test     - 运行 Python 冒烟测试"
    echo ""
    echo "  --- Vue Frontend ---"
    echo "  vue:install     - 安装前端依赖"
    echo "  vue:start       - 启动 Vite 开发服务器 (端口 5173)"
    echo "  vue:build       - 构建前端产物"
    echo ""
    echo "  --- BDD & E2E Tests ---"
    echo "  e2e:install     - 安装全局 BDD 与 Playwright 环境"
    echo "  e2e:run         - 运行全局 Cucumber E2E 测试"
    echo ""
    echo "  --- 全局 (Global) ---"
    echo "  test:all        - 运行所有后端的测试"
    echo "========================================================"
}

case "$1" in
    node:install)
        echo "-> 初始化 Node.js 模块..."
        cd ecommerce/ecommerce-mini && npm install
        ;;
    node:start)
        echo "-> 启动 Node.js 开发服务器..."
        free_port $NODE_PORT
        cd ecommerce/ecommerce-mini && npm start
        ;;
    node:prod)
        echo "-> 启动 Node.js 生产服务器..."
        free_port $NODE_PROD_PORT
        cd ecommerce/ecommerce-mini && npm run start:prod
        ;;
    node:test)
        echo "-> 运行 Node.js 测试..."
        cd ecommerce/ecommerce-mini && npm test
        ;;
    python:install)
        echo "-> 初始化 Python 模块..."
        cd ecommerce/ecommerce-mini-python && pip install -r requirements.txt
        ;;
    python:start)
        echo "-> 启动 Python 开发服务器..."
        free_port $PYTHON_PORT
        cd ecommerce/ecommerce-mini-python && PYTHONPATH=. python3 -m uvicorn src.api.server:app --reload
        ;;
    python:test)
        echo "-> 运行 Python 测试..."
        cd ecommerce/ecommerce-mini-python && PYTHONPATH=. python3 -m pytest
        ;;
    vue:install)
        echo "-> 初始化 Vue 前端模块..."
        cd ecommerce/ecommerce-mini-frontend && npm install
        ;;
    vue:start)
        echo "-> 启动 Vue 开发服务器..."
        free_port $VUE_PORT
        cd ecommerce/ecommerce-mini-frontend && npm run dev
        ;;
    vue:build)
        echo "-> 构建 Vue 前端产物..."
        cd ecommerce/ecommerce-mini-frontend && npm run build
        ;;
    e2e:install)
        echo "-> 初始化 BDD 测试环境..."
        cd e2e-tests && npm install
        ;;
    e2e:run)
        echo "-> 运行全局 Cucumber E2E 测试..."
        if [ ! -x e2e-tests/node_modules/.bin/cucumber-js ]; then
            echo "-> 缺少 cucumber-js 请先运行 ./init.sh e2e:install"
            exit 1
        fi

        # 释放端口并拉起服务（Node 3000 / Vue 5173 必需，Python 8000 尽力而为）
        free_port $NODE_PORT
        free_port $VUE_PORT
        E2E_NODE_PID=""
        E2E_VUE_PID=""
        E2E_PY_PID=""
        function e2e_cleanup() {
            # 先杀直接子进程，再按端口清理其派生的 node/vite/uvicorn 进程
            [ -n "$E2E_NODE_PID" ] && kill $E2E_NODE_PID 2>/dev/null || true
            [ -n "$E2E_VUE_PID" ] && kill $E2E_VUE_PID 2>/dev/null || true
            [ -n "$E2E_PY_PID" ] && kill $E2E_PY_PID 2>/dev/null || true
            free_port $NODE_PORT
            free_port $VUE_PORT
            [ -n "$E2E_PY_PID" ] && free_port $PYTHON_PORT
        }
        trap e2e_cleanup EXIT

        echo "-> 启动 Node.js 后端 (NODE_ENV=test, 端口 $NODE_PORT)..."
        (cd ecommerce/ecommerce-mini && NODE_ENV=test npm start > /tmp/e2e-node.log 2>&1) &
        E2E_NODE_PID=$!

        echo "-> 启动 Vue 前端 (端口 $VUE_PORT)..."
        (cd ecommerce/ecommerce-mini-frontend && npm run dev > /tmp/e2e-vue.log 2>&1) &
        E2E_VUE_PID=$!

        if (cd ecommerce/ecommerce-mini-python && python3 -c "import uvicorn" 2>/dev/null); then
            echo "-> 启动 Python 后端 (APP_ENV=test, 端口 $PYTHON_PORT)..."
            free_port $PYTHON_PORT
            (cd ecommerce/ecommerce-mini-python && APP_ENV=test PYTHONPATH=. python3 -m uvicorn src.api.server:app > /tmp/e2e-python.log 2>&1) &
            E2E_PY_PID=$!
        else
            echo "-> 跳过 Python 后端（未安装 uvicorn，E2E UI 链路不依赖 8000 端口）"
        fi

        # 等待服务就绪
        function wait_for_url() {
            local url=$1
            local retries=30
            until curl -sf "$url" > /dev/null 2>&1; do
                retries=$((retries - 1))
                if [ $retries -le 0 ]; then
                    echo "-> 等待 $url 就绪超时"
                    exit 1
                fi
                sleep 1
            done
        }
        wait_for_url "http://localhost:$NODE_PORT/api/products"
        wait_for_url "http://localhost:$VUE_PORT"

        cd e2e-tests && npm run test:e2e
        ;;
    test:all)
        echo "-> 运行所有测试..."
        echo "[1/2] 运行 Node.js 测试..."
        cd ecommerce/ecommerce-mini && npm test
        cd ../..
        echo "[2/2] 运行 Python 测试..."
        cd ecommerce/ecommerce-mini-python && PYTHONPATH=. python3 -m pytest
        ;;
    *)
        show_help
        ;;
esac
