#!/bin/bash

# OpenSpec Practice - 项目初始化与启动脚本
# 统一管理多语言/多模块架构的启动与测试

set -e

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
        cd ecommerce/ecommerce-mini && npm start
        ;;
    node:prod)
        echo "-> 启动 Node.js 生产服务器..."
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
        cd ecommerce/ecommerce-mini-python && python -m uvicorn src.api.server:app --reload
        ;;
    python:test)
        echo "-> 运行 Python 测试..."
        cd ecommerce/ecommerce-mini-python && pytest
        ;;
    vue:install)
        echo "-> 初始化 Vue 前端模块..."
        cd ecommerce/ecommerce-mini-frontend && npm install
        ;;
    vue:start)
        echo "-> 启动 Vue 开发服务器..."
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
        cd e2e-tests && npm run test:e2e
        ;;
    test:all)
        echo "-> 运行所有测试..."
        echo "[1/2] 运行 Node.js 测试..."
        cd ecommerce/ecommerce-mini && npm test
        cd ../..
        echo "[2/2] 运行 Python 测试..."
        cd ecommerce/ecommerce-mini-python && pytest
        ;;
    *)
        show_help
        ;;
esac
