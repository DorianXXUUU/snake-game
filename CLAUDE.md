# CLAUDE.md

Snake game 项目文档，供 Claude Code 快速理解项目并高效工作。

## 项目概览

纯前端贪吃蛇游戏，零外部依赖，浏览器直接打开即玩。支持桌面键盘 + 手机触屏。

## 文件结构

```
├── snake-game.html    # HTML + JS (~860 行) — 主文件
├── style.css          # 全部样式 (~310 行)
├── dev.md             # 详细开发文档（架构、数据模型、渲染管线）
├── plan.md            # 设计计划 + 验证清单
├── README.md          # 项目简介 + 版本记录
├── .gitignore         # macOS / 编辑器 / .claude / Node
└── LICENSE            # MIT
```

## 架构要点

- **单类设计**：`SnakeGame` class（ES6），实例化于 `DOMContentLoaded`
- **渲染**：Canvas 2D API，25×25 逻辑网格，tileSize 自适应
- **状态机**：`initial` → `playing` → `gameover` → (Space/按钮) → `initial`
- **暂停**：`isPaused` 布尔标记，独立于 `state`，P/Esc 切换
- **无框架**：纯 Vanilla JS，无 TypeScript，无 npm，无构建步骤

## 运行方式

```bash
open snake-game.html                          # 桌面直接打开
cd ~ && python3 -c "
import os
os.chdir('/path/to/Snake')
from http.server import HTTPServer, SimpleHTTPRequestHandler
HTTPServer(('0.0.0.0', 8090), SimpleHTTPRequestHandler).serve_forever()
"                                              # 手机测试服务器
```

> ⚠️ `python3 -m http.server` 在 conda Python 3.12 中 `os.getcwd()` 权限错误，需用上述 `-c` 方式绕过

## 注意事项

- **无测试**：所有修改需在浏览器手动验证（或 Chrome DevTools 手机模拟）
- **无 git 自动回滚**：修改前建议先 commit
- **Canvas 渲染**：墙壁/蛇/食物全部通过 Canvas API 绘制，不经过 DOM
- **方向处理**：键盘和触屏统一走 `_handleDirectionInput()`，不要在两处重复逻辑
- **音效**：AudioContext 懒初始化，静默降级（失败不影响游戏）
- **暂停按钮**：位于 `#pause-btn`（右上角），playing/paused 可见；退出按钮 `#quit-btn`（左上角）
- **localStorage key**：`snake_difficulty`、`snake_high_scores`

## 之前修复过的问题

| 问题 | 修复 |
|------|------|
| `spawnFood()` 1000 次随机失败无兜底 | 500 次随机 + 遍历扫描第一个空格 |
| `_ensureAudio()` 无 try-catch | 返回 null，三个 play 方法 `if (!ctx) return` |
| CSS `.wall-tile` 死代码 | 删除（墙壁用 Canvas 绘制） |
| HTML overlay 占位符冗余 | 精简为空 `<div>` |
| 触屏点难度误触发开始 | 移除 canvas tap-to-start，新增「开始游戏」按钮 |
| 文档与代码不一致 | dev.md / plan.md 同步更新为当前状态 |
| 无法从游戏中退出 | 新增 ✕ 退出按钮（调用 restart） |

## 编辑建议

- HTML 中 JS 从 `<script>` 开始到 `</script>` 结束，修改 JS 时注意缩进一致性（4 空格）
- CSS 修改时注意选择器优先级，难度标签用了 `!important`
- 新增按钮需在对应生命周期方法中控制显隐：`startGame()` / `endGame()` / `restart()`
- 触屏逻辑在 `_onTouchStart` / `_onTouchMove` / `_onTouchEnd` 中，使用 `passive: false`
