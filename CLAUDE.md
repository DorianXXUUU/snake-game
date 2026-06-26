# CLAUDE.md

Snake game 项目文档，供 Claude Code 快速理解项目并高效工作。

## 项目概览

纯前端贪吃蛇游戏，零外部依赖，浏览器直接打开即玩。支持桌面键盘 + 手机触屏，自动检测设备平台并显示对应的操作提示。

## 文件结构

```
├── snake-game.html    # HTML + JS (~920 行) — 主文件
├── style.css          # 全部样式 (~418 行)
├── package.json       # 可选 npm 脚本（serve / serve:local / test）
├── tests/
│   └── smoke.test.mjs # 零依赖冒烟测试
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
- **设备检测**：`this.isMobile`（UA 正则 + maxTouchPoints），控制三处 hint 文案
- **无框架**：纯 Vanilla JS，无 TypeScript，无 npm，无构建步骤

## DOM 结构

```
body
└── #app-container (flex column, min-height: 100vh)
    ├── #game-area (flex: 1, 居中游戏)
    │   └── #game-wrapper (relative, 包裹 canvas)
    │       ├── #score-display（已废弃 — 分数改在 canvas 内顶部居中绘制）
    │       ├── canvas#snake-canvas
    │       ├── #overlay (absolute, 覆盖 canvas)
    │       ├── #pause-btn (右上角, absolute, z-index: 20)
    │       └── #quit-btn (左上角, absolute, z-index: 20)
    └── #ad-banner (底部横幅, width: 100%)
```

## 运行方式

```bash
open snake-game.html                          # 桌面直接打开
npm run serve                                 # 手机 / 局域网测试服务器，端口 8080
npm run serve:local                           # 本机浏览器验证，端口 8080
```

无需安装外部依赖；`package.json` 只提供脚本入口。若遇到 Python 环境的 `http.server` 权限或 cwd 问题，可退回 README 中的直接打开方式，或用项目根目录作为工作目录启动服务。

## 测试方式

```bash
npm test
```

`tests/smoke.test.mjs` 只使用 Node 内置模块，检查 HTML 结构、内联脚本语法、关键 CSS 选择器、localStorage/touch/keyboard 源码入口和 npm 脚本配置。游戏行为仍需浏览器验证，清单见 `plan.md`。

## 注意事项

- **测试覆盖有限**：先跑 `npm test`，再按 `plan.md` 做浏览器验证（或 Chrome DevTools 手机模拟）
- **无 git 自动回滚**：修改前建议先 commit
- **Canvas 渲染**：墙壁/蛇/食物/分数全部通过 Canvas API 绘制，不经过 DOM
- **方向处理**：键盘和触屏统一走 `_handleDirectionInput()`，不要在两处重复逻辑
- **音效**：AudioContext 懒初始化，静默降级（失败不影响游戏）
- **暂停按钮**：位于 `#pause-btn`（右上角），playing/paused 可见；退出按钮 `#quit-btn`（左上角）
- **localStorage key**：`snake_difficulty`、`snake_high_scores`
- **设备检测**：`this.isMobile` 必须在 `showInitialOverlay()` 之前赋值，否则首次加载取不到
- **分数渲染**：位于 canvas 顶部居中，鲜红色 `#f85149`，字号为 tileSize×0.7×1.5
- **广告横幅**：`#ad-banner` 位于页面最底部，全宽，黑色底 + 暗金色文字

## Overlay 按钮布局

| 界面 | 按钮 | 状态 |
|------|------|------|
| 初始 | 难度选择（4 个 pill）+ 开始游戏 | `.clickable` |
| 暂停 | 继续游戏（蓝）+ 返回主页（灰）| `.clickable` |
| 结束 | 重新开始（绿）+ 返回主页（灰）+ 排行榜 | `.clickable` |

所有暂停 overlay 内元素统一宽度 210px。

## 平台自适应文案（`this.isMobile`）

| 位置 | 桌面端 | 移动端 |
|------|--------|--------|
| 初始 hint | `↑↓←→ / WASD 开始 \| 1-4 切换难度` | `选择难度，点击「开始游戏」` |
| 暂停 hint | `按 P / Esc 继续 \| 空格键重新开始` | 不显示 |
| 结束 hint | `按空格键重新开始` | `点击下方按钮重新开始` |

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
| 手机端难度/开始按钮无法点击 | `showInitialOverlay()` 改为 `add('clickable')` |
| 手机端显示键盘操作提示 | 新增 `this.isMobile` 检测，三处 hint 按平台分支 |
| 暂停后手机端无继续按钮 | 新增「▶ 继续游戏」按钮 |
| 退出按钮遮盖分数 | 分数移至 canvas 顶部居中 |
| 暂停 overlay 按钮宽度不一致 | 统一 `width: 210px` |

## 编辑建议

- HTML 中 JS 从 `<script>` 开始到 `</script>` 结束，修改 JS 时注意缩进一致性（4 空格）
- CSS 修改时注意选择器优先级，难度标签用了 `!important`
- 新增按钮需在对应生命周期方法中控制显隐：`startGame()` / `endGame()` / `restart()`
- 触屏逻辑在 `_onTouchStart` / `_onTouchMove` / `_onTouchEnd` 中，使用 `passive: false`
- 设备检测逻辑在 constructor 最前面（必须在 `showInitialOverlay()` 之前）
- 修改 DOM 结构时注意 `#game-area` 和 `#app-container` 的 flex 布局
