# Dev Doc: Web Snake Game

## Overview
Single-file web-based Snake game (`snake-game.html`, ~810 lines). No external dependencies. Canvas-rendered, controlled via arrow keys or WASD. Features: 4 difficulty levels, random wall obstacles (scattered or connected), localStorage leaderboard top-10, restart button.

## Project Structure
```
/Users/xudeyan/Desktop/deyan-claude/
├── snake-game.html   # The game (HTML + CSS + JS, ~810 lines)
├── plan.md           # Design plan
└── dev.md            # This document
```

## Architecture

### File layout
```
snake-game.html
├── <style>     ~195 lines   CSS — dark theme, overlay, leaderboard, difficulty buttons, restart btn
├── <body>     ~10 lines     HTML — canvas + overlay placeholder
└── <script>   ~600 lines    JS — SnakeGame class + DIFFICULTY config + init
```

### State Machine
```
  ┌──────────┐  direction key    ┌──────────┐  boundary/self/wall    ┌───────────┐
  │  INITIAL │ ────────────────> │ PLAYING  │ ────────────────────> │ GAME OVER │
  │          │ <── Space ─────── │          │                        │           │
  └──────────┘                   └──────────┘                        └─────┬─────┘
       ^                                                                   │
       └────────────── Space / restart button ─────────────────────────────┘
```
- INITIAL: difficulty selector visible, 1-4 keys switch difficulty, direction key starts.
- PLAYING: game loop active, overlay hidden.
- GAME OVER: leaderboard + restart button shown via `handleGameOver()`.

## Data Model

### Snake: `{x: number, y: number}[]`
- **Head-first**: `snake[0]` is head.
- Starts with 3 segments at grid center.
- Movement: `unshift(newHead)` then conditionally `pop()` (skip pop = grow).

### Walls: `{x: number, y: number}[]`
- Generated at `resetState()`, before `spawnFood()`.
- Count and pattern depend on `this.difficulty` (see **Difficulty System**).

### Difficulty: `'easy' | 'medium' | 'hard' | 'hell'`
- Instance property `this.difficulty`, default `'medium'`.
- Persisted to `localStorage` key `snake_difficulty`.
- Loaded in constructor via `loadDifficulty()`.

### Speed: `number` (ms)
- Instance property `this.speed`, set from `DIFFICULTY[difficulty].speed`.
- Used in `setInterval(gameStep, this.speed)`.

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

## Difficulty System (难度选择) — v2.5

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

### Wall generation modes
**scattered**: Pick N random `(x, y)` pairs, skip occupied. Same as original behavior.

**connected**: Generate N line segments. Each segment:
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
| `snake_difficulty` | `'easy'|'medium'|'hard'|'hell'` | `loadDifficulty()` / `saveDifficulty()` |

## Key Implementation Details

### Rendering pipeline (`render()`)
1. **Clear** canvas.
2. **Grid lines** — subtle (`rgba(255,255,255,0.03)`) at tile boundaries.
3. **Walls** — dark gray fill (`#30363d`) with diagonal cross pattern (`#21262d`). Rendered after grid, before snake.
4. **Snake** (tail-first): head `#3fb950` + glow + white eyes tracking direction; body gradient green→teal with rounded corners.
5. **Food** — red circle `#f85149` + `shadowBlur=12` glow + inner white highlight.
6. **Score** — `得分: ${score}`, bold monospace, top-left corner.

### Game loop
- Dynamic speed from `this.speed` (set at `startGame()` from difficulty config).
- `setInterval(this.gameStep, this.speed)`.
- Stopped on game over via `clearInterval(this.gameLoopId)`.

### Food spawning (`spawnFood()`)
1. Build occupied set: snake segments + wall tiles.
2. Win check: `occupied.size >= tileCount * tileCount` → `handleGameOver('🎉 恭喜通关！', ...)`.
3. Random roll until free cell found (max 1000 attempts).

### Responsive sizing (`resizeCanvas()`)
- `maxSize = min(innerWidth, innerHeight) * 0.88`, clamped `[300, 600]`.
- `tileSize = floor(maxSize / 25)`, canvas = `tileSize * 25`.
- Snake/food/wall positions in tile-space never change on resize.

## Keyboard Input Map

| Physical Keys | Action |
|---------------|--------|
| ↑ / W / w | Move up |
| ↓ / S / s | Move down |
| ← / A / a | Move left |
| → / D / d | Move right |
| `1` `2` `3` `4` | Switch difficulty (initial state only) |
| Space | Restart (from gameover or initial) |
| Any direction key (initial state) | Start game |

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
- Space key also works.

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
| Score text | `#c9d1d9` | Light gray |
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
| Food on snake/walls | Occupied-set exclusion + re-roll |
| Snake fills grid | Win condition → `handleGameOver()` |
| Window resize mid-game | TileSize only; tile-space unchanged |
| Arrow key page scroll | `preventDefault()` |
| Multiple restarts | Full `resetState()`, difficulty preserved |
| localStorage unavailable | try-catch, returns `[]` or ignores save |
| Date comparison (leaderboard) | Reference equality `entry === newEntry` |
| Difficulty defaults on corrupt | `loadDifficulty()` validates against DIFFICULTY keys |
| Connected wall segment OOB | Segment pre-validation before placement |
