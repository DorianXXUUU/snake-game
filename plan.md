# Plan: Web Snake Game

## Context
Self-contained web Snake game (~810 lines HTML). Playable in desktop browser via arrow keys or WASD. Features: 4 difficulty levels, random walls (scattered or connected segments), localStorage leaderboard, restart button.

## File
- `/Users/xudeyan/Desktop/deyan-claude/snake-game.html`

## Architecture

### HTML
- `<canvas id="snake-canvas">` — rendering surface
- `<div id="overlay">` — start screen / game-over overlay, absolutely positioned

### CSS (~195 lines)
- Dark theme (`#0d1117` page, `#161b22` canvas), flexbox centering
- Canvas: rounded border, green-tinted box-shadow
- Overlay: `pointer-events: none` default; `.clickable` enables mouse events
- Difficulty buttons: `.diff-btn` pill style, `.active` = green bg + glow
- Leaderboard: scrollable top-10, `.current` row highlight
- Restart button: green with hover glow

### JavaScript — `SnakeGame` class (~600 lines)

**State machine:** `initial` → `playing` → `gameover` → (Space/button) → `initial`

**Difficulty config:**
```js
static DIFFICULTY = {
    easy:   { label:'简单', wallCount:[0,0], wallMode:'connected', wallSegLen:[4,8], speed:150 },
    medium: { label:'中级', wallCount:[1,1], wallMode:'connected', wallSegLen:[4,8], speed:130 },
    hard:   { label:'困难', wallCount:[2,2], wallMode:'connected', wallSegLen:[4,8], speed:110 },
    hell:   { label:'地狱', wallCount:[3,3], wallMode:'connected', wallSegLen:[4,8], speed:85  },
};
```
Default: `'easy'`. All levels use connected mode; only segment count differs.

**Instance properties:**
| Property | Type | Purpose |
|----------|------|---------|
| `snake` | `{x,y}[]` | Head-first body, 3 seg at center |
| `walls` | `{x,y}[]` | Obstacles per difficulty config |
| `food` | `{x,y}` | Random, excludes snake + walls |
| `direction` | `{x,y}` | Active movement vector |
| `nextDirection` | `{x,y}` | Buffered input |
| `difficulty` | string | `'easy'|'medium'|'hard'|'hell'` |
| `speed` | number | ms tick, from difficulty config |
| `score` | number | Foods eaten |
| `state` | `'initial'|'playing'|'gameover'` | State machine |

**Methods:**
| Method | Description |
|--------|-------------|
| `constructor()` | Init props, load difficulty from localStorage, show initial overlay |
| `resetState()` | Reset snake/score, call `generateWalls()` + `spawnFood()` |
| `generateWalls()` | Place walls per difficulty: scattered single tiles or connected line segments |
| `startGame()` | Set speed from config, hide overlay, start interval loop |
| `gameStep()` | Apply direction, move, check 3 collision types, check food, render |
| `endGame()` | Stop loop, call `handleGameOver()` |
| `handleGameOver(title,sub,hint)` | Save score, build leaderboard HTML, show overlay with restart button |
| `spawnFood()` | Random free cell (not snake, not walls). Win if grid full |
| `render()` | Grid → walls → snake (tail-first) → food (glow) → score |
| `handleKeyDown(e)` | 8 direction keys + 1-4 difficulty + Space restart + anti-180 guard |
| `restart()` | Stop loop, reset state, call `showInitialOverlay()` |
| `resizeCanvas()` | Recalc tileSize, keep 25×25 logical grid |
| `loadDifficulty()` | Read from localStorage, fallback `'medium'` |
| `saveDifficulty()` | Write to localStorage |
| `setDifficulty(diff)` | Update `this.difficulty`, persist, refresh button highlights |
| `showInitialOverlay()` | Render difficulty buttons + title + hint, bind click handlers |
| `showOverlay(title,sub,hint,extra)` | Generic overlay HTML setter |
| `getHighScores()` | Parse localStorage top-10 |
| `formatDateTime()` | Return `"yyyy-mm-dd HH:MM"` string |
| `saveScore(score)` | Append {score, date, difficulty}, sort, keep top 10 |
| `buildLeaderboardHTML(scores, newEntry)` | Render `<ol>`, format: `yyyy-mm-dd HH:MM` + difficulty + score |

**Input map:**
| Keys | Action |
|------|--------|
| ↑↓←→ / WASD | Move (case-insensitive) |
| `1` `2` `3` `4` | Switch difficulty (initial only) |
| Space | Restart (gameover/initial) |

**Collision detection (checked in order):**
| # | Type | Check |
|---|------|-------|
| 1 | Boundary | head outside [0, tileCount) |
| 2 | Self | head in `snake.slice(0, -1)` |
| 3 | Obstacle | head in `walls` |

**Anti-180:** `candidate.x + direction.x === 0 && candidate.y + direction.y === 0` → reject

**Responsive:** 25×25 logical grid. `tileSize = floor(availableSize/25)`, canvas = `tileSize*25`. Clamp [300,600].

## Features Summary
- 4 difficulty levels with distinct wall patterns (scattered dots vs connected lines)
- Difficulty persisted in localStorage
- Keyboard `1-4` or click to switch difficulty on start screen
- Random walls never overlap snake or food
- Leaderboard top-10 (localStorage)
- Restart button + Space key
- Snake head has direction-following eyes
- Win condition (grid full)

## Edge Cases
1. Rapid direction changes → `nextDirection` buffer
2. 180° reversal → anti-180 check vs `direction`
3. Same direction repeated → no-op
4. Food on snake/walls → occupied-set exclusion
5. Grid full → win via `handleGameOver()`
6. Window resize mid-game → tile-space coords unchanged
7. Arrow key scroll → `preventDefault()`
8. Multiple restarts → full `resetState()`, difficulty preserved
9. localStorage error → try-catch, safe defaults
10. Connected wall segment OOB/occupied → full segment pre-validation
11. Corrupt difficulty in localStorage → validated against DIFFICULTY keys

## Verification
1. Open game → 4 difficulty buttons visible, "中级" highlighted, ←↑↓→/WASD hint
2. Click each button → highlight changes, persists on reload
3. Press `1`/`2`/`3`/`4` → difficulty switches
4. Easy: 5-8 scattered walls, 150ms speed
5. Medium: 10-15 scattered walls, 130ms speed
6. Hard: 6-10 connected segments (2-4 tiles), 110ms speed
7. Hell: 8-14 connected segments (3-6 tiles), 85ms speed
8. Connected walls render as solid lines (not scattered dots)
9. Direction key starts game with correct difficulty
10. Game over → leaderboard + restart button appear
11. Restart → same difficulty, new random walls
12. All 8 direction keys work, 180° reversal blocked
