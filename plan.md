# Plan: Web Snake Game

## Context
Web-based Snake game split across two files (`snake-game.html` ~920 lines, `style.css` ~418 lines). Playable in desktop browser via arrow keys or WASD, and mobile via touch swipe + buttons. Features: 4 difficulty levels, random connected-line wall segments, localStorage leaderboard, Web Audio API sound effects, P/Esc pause/resume, device detection for platform-adaptive UI, resume & home buttons, restart button, ad banner.

## Files
- `/snake-game.html` — HTML structure + SnakeGame class
- `/style.css` — All CSS styles (dark theme, overlay, leaderboard, buttons)

## Architecture

### HTML
- `<canvas id="snake-canvas">` — rendering surface
- `<div id="overlay">` — start screen / pause overlay / game-over overlay, absolutely positioned
- `<button id="pause-btn">` — ⏸️ pause (top-right, visible during playing/paused)
- `<button id="quit-btn">` — ✕ quit (top-left, visible during playing)
- `<div id="ad-banner">` — bottom banner, full width
- `<link rel="stylesheet" href="style.css">` — external stylesheet
- DOM: `#app-container` > `#game-area` > `#game-wrapper` + `#ad-banner`

### CSS (~418 lines)
- Dark theme (`#0d1117` page, `#161b22` canvas), flexbox centering
- Canvas: rounded border, green-tinted box-shadow
- Overlay: `pointer-events: none` default; `.clickable` enables mouse events
- Difficulty buttons: `.diff-btn` pill style, `.active` = green bg + glow
- Leaderboard: scrollable top-10, `.current` row highlight
- Restart button: green with hover glow

### JavaScript — `SnakeGame` class (~900 lines)

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
| `isMobile` | boolean | Device detection (UA + maxTouchPoints) |
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
- Snake head has direction-following eyes
- Win condition (grid full)
- Web Audio API sound effects (start, eat, death) — zero external files
- P/Esc pause/resume with overlay + ▶ continue button + 🏠 home button
- Touch swipe direction control + start/resume/home/quit buttons
- Device detection: platform-adaptive hint text (keyboard vs touch)
- Score: top-center canvas, bright red, 1.5× font size
- Equal-width pause overlay elements (210px)
- Ad banner at page bottom

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
16. Mobile buttons unclickable → `showInitialOverlay()` adds `.clickable`
17. Wrong hint on mobile → `isMobile` set before `showInitialOverlay()` in constructor
18. iPadOS 13+ desktop UA → `maxTouchPoints > 1 && /Macintosh/i` fallback
19. Score vs quit button overlap → score moved to top-center canvas
20. Banner not at bottom → `#app-container` flex column, `#game-area` flex: 1

## Verification
1. Open game → 4 difficulty buttons visible, "简单" highlighted, hint depends on device
2. Mobile: hint = "选择难度，点击「开始游戏」"; Desktop: keyboard hint
3. Click each button → highlight changes, persists on reload
4. Press `1`/`2`/`3`/`4` → difficulty switches
5. Easy: 0 walls, 150ms speed
6. Medium: 1 connected segment (4-8 tiles), 130ms speed
7. Hard: 2 connected segments (4-8 tiles each), 110ms speed
8. Hell: 3 connected segments (4-8 tiles each), 85ms speed
9. Connected walls render as solid lines with cross pattern
10. Direction key starts game with correct difficulty
11. Game over → death sound, leaderboard + restart + home buttons appear
12. Press P during game → pause overlay with「继续游戏」+「返回主页」buttons
13. Press P/Esc again or click「继续游戏」→ resume
14. Click「返回主页」(pause or gameover) → back to initial screen
15. Press Space / direction keys while paused → no effect (except Space = restart)
16. Eat food → eat sound plays
17. Restart → same difficulty, new random walls
18. All 8 direction keys work, 180° reversal blocked
19. Win (fill grid) → "恭喜通关" overlay, no death sound
20. Score: top-center canvas, bright red `#f85149`, larger font
21. Pause overlay buttons equal width (210px)
22. Ad banner visible at page bottom, black bg, dark golden text
