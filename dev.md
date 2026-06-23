# Dev Doc: Web Snake Game

## Overview
Web-based Snake game, split across two files (`snake-game.html` ~920 lines JS+HTML, `style.css` ~418 lines CSS). No external dependencies. Canvas-rendered, controlled via arrow keys or WASD. Features: 4 difficulty levels, random wall obstacles (connected line segments), localStorage leaderboard top-10, Web Audio API sound effects, P/Esc pause/resume, device detection for platform-adaptive UI, touch support with swipe + buttons.

## Project Structure
```
snake-game/
├── snake-game.html   # HTML structure + SnakeGame class (~920 lines)
├── style.css          # All CSS styles (~418 lines)
├── README.md          # Project overview & changelog
├── dev.md             # This document
├── plan.md            # Design plan
├── .gitignore
└── LICENSE
```

## Architecture

### File layout
```
snake-game.html
├── <head>      ~7 lines     meta + <link rel="stylesheet" href="style.css">
├── <body>      ~12 lines    #app-container > #game-area > #game-wrapper + #ad-banner
└── <script>    ~900 lines   SnakeGame class + init
```

### DOM Structure
```
body
└── #app-container (flex column, min-height: 100vh)
    ├── #game-area (flex: 1, centers game vertically)
    │   └── #game-wrapper (position: relative)
    │       ├── canvas#snake-canvas
    │       ├── #overlay (absolute, covers canvas)
    │       ├── #pause-btn (absolute, top-right, z-index: 20)
    │       └── #quit-btn (absolute, top-left, z-index: 20)
    └── #ad-banner (bottom banner, full width)
```

### State Machine
```
  ┌──────────┐  direction key    ┌──────────┐  boundary/self/wall    ┌───────────┐
  │  INITIAL │ ────────────────> │ PLAYING  │ ────────────────────> │ GAME OVER │
  │          │ <── Space ─────── │  ↕ P/Esc │                        │           │
  └──────────┘                   └────┬─────┘                        └─────┬─────┘
       ^                              │ Pause / Resume                     │
       │                              v                                    │
       │                         ┌──────────┐                             │
       │                         │  PAUSED  │                             │
       │                         └──────────┘                             │
       └────────────── Space / restart button ─────────────────────────────┘
```
- INITIAL: difficulty selector visible, 1-4 keys switch difficulty, direction key or「开始游戏」button starts. Overlay has `.clickable` so buttons work on mobile.
- PLAYING: game loop active, overlay hidden. Score rendered top-center canvas in bright red. ⏸️ + ✕ buttons visible.
- PAUSED: isPaused=true, game loop stopped. Overlay shows「已暂停」+「▶ 继续游戏」(blue) +「🏠 返回主页」(gray). P/Esc resumes, Space restarts.
- GAME OVER: leaderboard +「↻ 重新开始」(green) +「🏠 返回主页」(gray) via `handleGameOver()`.

## Data Model

### Snake: `{x: number, y: number}[]`
- **Head-first**: `snake[0]` is head.
- Starts with 3 segments at grid center.
- Movement: `unshift(newHead)` then conditionally `pop()` (skip pop = grow).

### Walls: `{x: number, y: number}[]`
- Generated at `resetState()`, before `spawnFood()`.
- Count and pattern depend on `this.difficulty` (see **Difficulty System**).

### Difficulty: `'easy' | 'medium' | 'hard' | 'hell'`
- Instance property `this.difficulty`, default `'easy'`.
- Persisted to `localStorage` key `snake_difficulty`.
- Loaded in constructor via `loadDifficulty()`.

### Speed: `number` (ms)
- Instance property `this.speed`, set from `DIFFICULTY[difficulty].speed`.
- Used in `setInterval(gameStep, this.speed)`.

### Pause flag: `isPaused: boolean`
- Instance property, default `false`.
- When `true`, `gameStep()` returns immediately; direction keys are blocked.
- Reset on `resetState()`, `startGame()`, `restart()`.

### Direction buffering
- `direction` — active movement, applied at start of `gameStep()`.
- `nextDirection` — user's latest valid input, buffered between ticks.

### Anti-180 reversal check
```js
if (
    candidate.x + this.direction.x === 0 &&
    candidate.y + this.direction.y === 0
) return; // reject
```
Checked against `direction` (active), NOT `nextDirection`.

### Collision detection pipeline
| Order | Type | Code |
|-------|------|------|
| 1 | Boundary | `newHead.x < 0 \|\| >= tileCount \|\| newHead.y < 0 \|\| >= tileCount` |
| 2 | Self | `snake.slice(0, -1).some(s => s.x === newHead.x && s.y === newHead.y)` |
| 3 | Obstacle | `walls.some(w => w.x === newHead.x && w.y === newHead.y)` |

## Difficulty System (难度选择) — v2.6

### Configuration
```js
static DIFFICULTY = {
    easy:   { label:'简单', wallCount:[0,0], wallMode:'connected', wallSegLen:[4,8], speed:150 },
    medium: { label:'中级', wallCount:[1,1], wallMode:'connected', wallSegLen:[4,8], speed:130 },
    hard:   { label:'困难', wallCount:[2,2], wallMode:'connected', wallSegLen:[4,8], speed:110 },
    hell:   { label:'地狱', wallCount:[3,3], wallMode:'connected', wallSegLen:[4,8], speed:85  },
};
```

| Level | Walls | Pattern | Speed | 1-4 Key |
|-------|-------|---------|-------|----------|
| 简单 (Easy) | 0 segments | No walls | 150ms | `1` |
| 中级 (Medium) | 1 segment | Connected line (4–8 tiles) | 130ms | `2` |
| 困难 (Hard) | 2 segments | Connected lines (4–8 tiles each) | 110ms | `3` |
| 地狱 (Hell) | 3 segments | Connected lines (4–8 tiles each) | 85ms | `4` |

All difficulties use `wallMode: 'connected'`. Only segment count differs.

### Default
- `loadDifficulty()` returns `'easy'` when no saved preference.

### Wall generation (connected mode)
Generate N line segments. Each segment:
1. Pick random start position and direction (horizontal or vertical).
2. Pick random length from `wallSegLen` range.
3. Pre-validate: walk the entire segment, checking bounds and occupancy.
4. Only place if ALL tiles in the segment are free (atomic placement).
5. Max `targetCount * 30` attempts total.

### UI
- **Start screen**: `showInitialOverlay()` renders 4 pill buttons in a flex row.
- Active button: green bg (`#238636`) + green glow (`box-shadow`).
- Click a button → `setDifficulty(diff)` → save to localStorage + update `.active` classes.
- Keyboard `1`/`2`/`3`/`4` also switches in initial state.
- Hint text: "↑↓←→ / WASD 开始  |  1-4 切换难度".

### Persistence
| Key | Value | Methods |
|-----|-------|---------|
| `snake_difficulty` | `'easy'\|'medium'\|'hard'\|'hell'` | `loadDifficulty()` / `saveDifficulty()` |

## Sound Effects — v1.2.0

Zero-dependency Web Audio API synthesis. No external audio files.

| Sound | Method | Trigger | Implementation |
|-------|--------|---------|----------------|
| Start | `playStartSound()` | `startGame()` | Sine 330→660Hz, 120ms |
| Eat | `playEatSound()` | `gameStep()` — food collision | Dual square waves: 440→880Hz + 660→1320Hz |
| Death | `playDeathSound()` | `endGame()` (collisions only) | Sawtooth 300→80Hz + Triangle 60→30Hz |

- `_ensureAudio()` — lazy-init `AudioContext` (browser autoplay policy compliant). Returns `AudioContext` or `null` on failure (graceful degradation — game runs without sound).
- `this.audioCtx` — initialized on first user gesture (keydown).
- Win condition ("恭喜通关") goes through `spawnFood()` → `handleGameOver()`, bypassing `endGame()`, so no death sound plays on win.

## Pause Feature — v1.3.0 + v1.5.0

| Key / Button | State | Action |
|-----|-------|--------|
| P / Esc | `playing` / `paused` | Toggle pause |
| Space | `paused` | Restart |
| Any direction | `paused` | Blocked |
| ▶ 继续游戏 btn | `paused` | Resume game |
| 🏠 返回主页 btn | `paused` | Restart → initial screen |

- `isPaused` boolean flag independent of `state` machine.
- `pauseGame()`: clears interval, shows overlay with「已暂停」+ resume button + home button.
- `resumeGame()`: restarts interval, hides overlay.
- `gameStep()`: returns early when `isPaused` is true.
- `handleKeyDown()`: pause/space check runs before direction processing.
- Pause overlay elements have unified width 210px.

## Device Detection — v1.5.0

- `this.isMobile` set in constructor BEFORE `showInitialOverlay()`.
- Detection: UA regex (`/Mobi|Android|iPhone|iPad|iPod/i`) + `maxTouchPoints > 1 && /Macintosh/i` (iPadOS 13+).
- Controls hint text in 3 places:
  - `showInitialOverlay()`: keyboard hint vs touch hint
  - `showPauseOverlay()`: desktop shows keyboard hint, mobile hides it
  - `endGame()` / win: "按空格键" vs "点击下方按钮"

## Key Implementation Details

### Rendering pipeline (`render()`)
1. **Clear** canvas.
2. **Grid lines** — subtle (`rgba(255,255,255,0.03)`) at tile boundaries.
3. **Walls** — dark gray fill (`#30363d`) with diagonal cross pattern (`#21262d`). Rendered after grid, before snake.
4. **Snake** (tail-first): head `#3fb950` + glow + white eyes tracking direction; body gradient green→teal with rounded corners.
5. **Food** — red circle `#f85149` + `shadowBlur=12` glow + inner white highlight.
6. **Score** — `得分: ${score}`, bold monospace, top-center canvas (`canvas.width/2`), bright red `#f85149`, font-size 1.5× tileSize×0.7.

### Game loop
- Dynamic speed from `this.speed` (set at `startGame()` from difficulty config).
- `setInterval(this.gameStep, this.speed)`.
- Stopped on game over via `clearInterval(this.gameLoopId)`.
- Also stopped on pause, restarted on resume.

### Food spawning (`spawnFood()`)
1. Build occupied set: snake segments + wall tiles.
2. Win check: `occupied.size >= tileCount * tileCount` → `handleGameOver('🎉 恭喜通关！', ...)`.
3. Random roll until free cell found (max 500 attempts), then fallback to deterministic scan of all cells.

### Responsive sizing (`resizeCanvas()`)
- `maxSize = min(innerWidth, innerHeight) * 0.88`, clamped `[300, 600]`.
- `tileSize = floor(maxSize / 25)`, canvas = `tileSize * 25`.
- Snake/food/wall positions in tile-space never change on resize.

## Input Map

### Keyboard
| Physical Keys | State | Action |
|---------------|-------|--------|
| ↑ / W / w | initial | Start game (direction = up) |
| ↓ / S / s | initial | Start game (direction = down) |
| ← / A / a | initial | Start game (direction = left) |
| → / D / d | initial | Start game (direction = right) |
| ↑↓←→ / WASD | playing | Buffer direction (anti-180 guard) |
| ↑↓←→ / WASD | paused | Blocked |
| `1` `2` `3` `4` | initial | Switch difficulty |
| P / Esc | playing / paused | Toggle pause |
| Space | gameover / initial / paused | Restart |

### Touch & Buttons
| Gesture / Button | State | Action |
|-------------|-------|--------|
| Canvas swipe (≥20px) | playing | Control direction |
| Canvas swipe (≥20px) | initial | Start game with direction |
|「开始游戏」button | initial | Start game (direction = right) |
| ⏸️ button (top-right) | playing/paused | Toggle pause |
| ✕ button (top-left) | playing | Quit → initial screen |
|「▶ 继续游戏」button | paused | Resume game |
|「🏠 返回主页」button | paused / gameover | Restart → initial screen |
|「↻ 重新开始」button | gameover | Restart game |

## Leaderboard (排行榜)

### Storage
- `localStorage` key: `snake_high_scores`.
- Format: `[{score, date, difficulty, diffKey}, ...]`, top 10, descending.
- Date: `yyyy-mm-dd HH:MM` via `formatDateTime()`.
- `difficulty`: Chinese label; `diffKey`: `'easy'|'medium'|'hard'|'hell'`.

### Display
- **Top banner**: 🎯 本局 — current score + difficulty label (red-tinted background).
- **Ranked list**:
  - 🥇 #1 gold (`#f0c040`), 🥈 #2 silver, 🥉 #3 bronze; rest gray.
  - Date + color-coded difficulty label (简单=green, 中级=yellow, 困难=orange, 地狱=red).
  - Current score highlighted green (`.current` class).
  - Dark custom scrollbar (5px, `#30363d` thumb).
- **Empty state**: "暂无记录，快来挑战！" when no scores exist.

### Methods
| Method | Returns | Notes |
|--------|---------|-------|
| `formatDateTime()` | `"yyyy-mm-dd HH:MM"` | Pads to 2 digits |
| `getHighScores()` | `{score, date, difficulty, diffKey}[]` | `[]` on error |
| `saveScore(score)` | `{scores, newEntry}` | Stores label + key for CSS mapping |
| `buildLeaderboardHTML(scores, newEntry, score, diff)` | HTML string | Generates banner + ranked list with medal/difficulty classes |

## Restart Button
- `<button id="restart-btn">↻ 重新开始</button>` injected into overlay via `handleGameOver()`.
- Click → `this.restart()` → `showInitialOverlay()` (difficulty preserved).
- Overlay `.clickable` class enables `pointer-events: auto`.
- Space key also works (from gameover, initial, or paused states).

## Game Over Flow
```
endGame() / spawnFood() win
  → render()                         // draw final frame
  → handleGameOver(title, sub, hint)
    → saveScore(score)               // localStorage
    → buildLeaderboardHTML(scores, newEntry)
    → showOverlay(title, sub, hint, lbHTML + btnHTML)
    → overlay.classList.add('clickable')
    → btn.addEventListener('click', restart)
```

## Visual Style Reference
| Element | Color | Notes |
|---------|-------|-------|
| Page BG | `#0d1117` | GitHub dark |
| Canvas BG | `#161b22` | Slightly lighter |
| Canvas border | `#30363d` | Gray |
| Walls | `#30363d` + cross `#21262d` | Brick texture |
| Snake head | `#3fb950` | Bright green + glow |
| Snake body | gradient `#2ea043` → `#238636` | Green-to-teal |
| Food | `#f85149` | Red + shadowBlur glow |
| Score text | `#f85149` | Bright red, top-center, 1.5× size |
| Resume button | `#1f6feb` / `#58a6ff` border | Blue |
| Home button | `#21262d` / `#30363d` border | Dark gray |
| Ad banner BG | `#000000` | Black |
| Ad banner text | `#c4a030` | Dark golden yellow |
| Overlay message | `#f0f6fc` | White |
| Overlay hint | `#8b949e` | Muted gray |
| Difficulty btn | `#21262d` / active `#238636` | Pill button |
| Restart button | `#238636` / hover `#2ea043` | Green |

## Edge Cases Reference
| Case | Solution |
|------|----------|
| Rapid direction changes | `nextDirection` buffer, last key wins |
| 180° reversal | Anti-180 check vs `direction` |
| Same direction repeated | No-op vs `nextDirection` |
| Food on snake/walls | Occupied-set exclusion + random re-roll + deterministic fallback scan |
| Snake fills grid | Win condition → `handleGameOver()` |
| Window resize mid-game | TileSize only; tile-space unchanged |
| Arrow key page scroll | `preventDefault()` |
| Multiple restarts | Full `resetState()`, difficulty preserved |
| localStorage unavailable | try-catch, returns `[]` or ignores save |
| Date comparison (leaderboard) | Reference equality `entry === newEntry` |
| Difficulty defaults on corrupt | `loadDifficulty()` validates against DIFFICULTY keys |
| Connected wall segment OOB | Segment pre-validation before placement |
| Direction keys while paused | Blocked by early return in `handleKeyDown()` |
| Pause toggle not in playing state | `togglePause()` checks `this.state === 'playing'` |
| Multiple rapid pause toggles | `pauseGame()` always clears interval before setting flag |
| AudioContext blocked by browser | Lazy init on first user gesture via `_ensureAudio()` |
| Death sound on win | Win bypasses `endGame()` → no death sound played |
| Mobile buttons unclickable | `showInitialOverlay()` adds `.clickable` (not removes) |
| Wrong hint text on mobile | `this.isMobile` must be set BEFORE `showInitialOverlay()` in constructor |
| Score overlapped by quit button | Score moved to top-center canvas |
| iPadOS 13+ UA spoofing | Also check `maxTouchPoints > 1 && /Macintosh/i` |
| Banner not at page bottom | `#app-container` flex column + `#game-area` flex: 1 pushes banner down |
