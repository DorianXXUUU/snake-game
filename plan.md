# Plan: Web Snake Game

## Context
Web-based Snake game split across two files (`snake-game.html` ~806 lines, `style.css` ~263 lines). Playable in desktop browser via arrow keys or WASD. Features: 4 difficulty levels, random connected-line wall segments, localStorage leaderboard, Web Audio API sound effects, P/Esc pause/resume, restart button.

## Files
- `/snake-game.html` — HTML structure + SnakeGame class
- `/style.css` — All CSS styles (dark theme, overlay, leaderboard, buttons)

## Architecture

### HTML
- `<canvas id="snake-canvas">` — rendering surface
- `<div id="overlay">` — start screen / pause overlay / game-over overlay, absolutely positioned
- `<link rel="stylesheet" href="style.css">` — external stylesheet

### CSS (~263 lines)
- Dark theme (`#0d1117` page, `#161b22` canvas), flexbox centering
- Canvas: rounded border, green-tinted box-shadow
- Overlay: `pointer-events: none` default; `.clickable` enables mouse events
- Difficulty buttons: `.diff-btn` pill style, `.active` = green bg + glow
- Leaderboard: scrollable top-10, `.current` row highlight
- Restart button: green with hover glow

### JavaScript — `SnakeGame` class (~790 lines)

**State machine:** `initial` → `playing` → `gameover` → (Space/button) → `initial`
- Pause: `playing` ↔ `paused` (via P/Esc), `paused` → `initial` (via Space)
- `isPaused` boolean flag independent of `state`

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
| `difficulty` | string | `'easy'\|'medium'\|'hard'\|'hell'` |
| `speed` | number | ms tick, from difficulty config |
| `score` | number | Foods eaten |
| `state` | `'initial'\|'playing'\|'gameover'` | State machine |
| `isPaused` | boolean | Pause flag (independent of state) |
| `gameLoopId` | number\|null | setInterval handle |
| `audioCtx` | AudioContext\|null | Lazy-init on first user gesture |

**Methods:**
| Method | Description |
|--------|-------------|
| `constructor()` | Init props, load difficulty from localStorage, show initial overlay |
| `resetState()` | Reset snake/score/isPaused, call `generateWalls()` + `spawnFood()` |
| `generateWalls()` | Place walls per difficulty: connected line segments |
| `startGame()` | Set isPaused=false, set speed from config, hide overlay, start interval loop, play start sound |
| `gameStep()` | Apply direction, move, check 3 collision types, check food, render. Early return if paused |
| `endGame()` | Stop loop, play death sound, call `handleGameOver()` |
| `handleGameOver(title,sub,hint)` | Save score, build leaderboard HTML, show overlay with restart button |
| `spawnFood()` | Random free cell (not snake, not walls). Win if grid full |
| `render()` | Grid → walls → snake (tail-first) → food (glow) → score |
| `handleKeyDown(e)` | 8 direction keys + 1-4 difficulty + P/Esc pause + Space restart + anti-180 guard |
| `restart()` | Stop loop, reset isPaused, reset state, call `showInitialOverlay()` |
| `resizeCanvas()` | Recalc tileSize, keep 25×25 logical grid |
| `loadDifficulty()` | Read from localStorage, fallback `'easy'` |
| `saveDifficulty()` | Write to localStorage |
| `setDifficulty(diff)` | Update `this.difficulty`, persist, regenerate walls/food, refresh button highlights |
| `showInitialOverlay()` | Render difficulty buttons + title + hint, bind click handlers |
| `showOverlay(title,sub,hint,extra)` | Generic overlay HTML setter |
| `getHighScores()` | Parse localStorage top-10 |
| `formatDateTime()` | Return `"yyyy-mm-dd HH:MM"` string |
| `saveScore(score)` | Append {score, date, difficulty}, sort, keep top 10 |
| `buildLeaderboardHTML(scores, newEntry)` | Render `<ol>`, format: date + difficulty + score |
| `togglePause()` | Switch between pause/resume (playing state only) |
| `pauseGame()` | Set flag, clear interval, show "⏸️ 已暂停" overlay |
| `resumeGame()` | Clear flag, hide overlay, restart interval |
| `showPauseOverlay()` | Render pause message + hint |
| `_ensureAudio()` | Lazy-init AudioContext on first call |
| `playEatSound()` | Dual square-wave ascending tones |
| `playDeathSound()` | Sawtooth descent + triangle low rumble |
| `playStartSound()` | Sine ascending blip |

**Input map:**
| Keys | State | Action |
|------|-------|--------|
| ↑↓←→ / WASD | initial | Start game with direction |
| ↑↓←→ / WASD | playing | Buffer direction (anti-180 guard) |
| ↑↓←→ / WASD | paused | Blocked |
| `1` `2` `3` `4` | initial | Switch difficulty |
| P / Esc | playing / paused | Toggle pause |
| Space | gameover / initial / paused | Restart |

**Collision detection (checked in order):**
| # | Type | Check |
|---|------|-------|
| 1 | Boundary | head outside [0, tileCount) |
| 2 | Self | head in `snake.slice(0, -1)` |
| 3 | Obstacle | head in `walls` |

**Anti-180:** `candidate.x + direction.x === 0 && candidate.y + direction.y === 0` → reject

**Responsive:** 25×25 logical grid. `tileSize = floor(availableSize/25)`, canvas = `tileSize*25`. Clamp [300,600].

## Features Summary
- 4 difficulty levels with connected wall segments
- Difficulty persisted in localStorage, default `'easy'`
- Keyboard `1-4` or click to switch difficulty on start screen
- Random walls never overlap snake or food
- Leaderboard top-10 (localStorage)
- Restart button + Space key (from gameover, initial, or paused)
- Snake head has direction-following eyes
- Win condition (grid full)
- Web Audio API sound effects (start, eat, death) — zero external files
- P/Esc pause/resume with overlay

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
12. Direction keys while paused → blocked by early return
13. Pause toggle outside playing state → `togglePause()` state check
14. Death sound on win → win bypasses `endGame()`, no death sound
15. AudioContext blocked → lazy init on first user gesture

## Verification
1. Open game → 4 difficulty buttons visible, "简单" highlighted, ←↑↓→/WASD hint
2. Click each button → highlight changes, persists on reload
3. Press `1`/`2`/`3`/`4` → difficulty switches
4. Easy: 0 walls, 150ms speed
5. Medium: 1 connected segment (4-8 tiles), 130ms speed
6. Hard: 2 connected segments (4-8 tiles each), 110ms speed
7. Hell: 3 connected segments (4-8 tiles each), 85ms speed
8. Connected walls render as solid lines with cross pattern
9. Direction key starts game with correct difficulty
10. Game over → death sound, leaderboard + restart button appear
11. Press P during game → pause overlay, game stops
12. Press P/Esc again → resume, game continues
13. Press Space while paused → restart to initial screen
14. Press direction keys while paused → no effect
15. Eat food → eat sound plays
16. Restart → same difficulty, new random walls
17. All 8 direction keys work, 180° reversal blocked
18. Win (fill grid) → "恭喜通关" overlay, no death sound
