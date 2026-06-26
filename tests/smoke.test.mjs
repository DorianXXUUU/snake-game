import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('snake-game.html', root), 'utf8');
const css = await readFile(new URL('style.css', root), 'utf8');
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

function assertIncludes(source, expected, label) {
    assert.ok(source.includes(expected), `${label} should include ${expected}`);
}

function extractInlineScript(source) {
    const match = source.match(/<script>([\s\S]*)<\/script>/);
    assert.ok(match, 'snake-game.html should include one inline script block');
    return match[1];
}

function assertBalancedBraces(source, label) {
    const open = (source.match(/{/g) || []).length;
    const close = (source.match(/}/g) || []).length;
    assert.equal(open, close, `${label} should have balanced braces`);
}

const script = extractInlineScript(html);

new Function(script);
assertBalancedBraces(css, 'style.css');

for (const id of [
    'app-container',
    'game-area',
    'game-wrapper',
    'snake-canvas',
    'overlay',
    'pause-btn',
    'quit-btn',
    'ad-banner',
]) {
    assertIncludes(html, `id="${id}"`, 'HTML');
}

for (const selector of [
    '#app-container',
    '#game-area',
    '#game-wrapper',
    '#overlay',
    '#pause-btn',
    '#quit-btn',
    '#start-btn',
    '.diff-btn',
    '#ad-banner',
]) {
    assertIncludes(css, selector, 'CSS');
}

for (const expected of [
    'class SnakeGame',
    'static TILE_COUNT = 25',
    'static DIFFICULTY',
    "easy:",
    "medium:",
    "hard:",
    "hell:",
    "localStorage.getItem('snake_difficulty')",
    "localStorage.setItem('snake_high_scores'",
    "addEventListener('touchstart'",
    "addEventListener('keydown'",
]) {
    assertIncludes(script, expected, 'game script');
}

assert.equal(pkg.scripts.test, 'node tests/smoke.test.mjs');
assert.ok(pkg.scripts.serve.includes('http.server 8080'));

console.log('Smoke checks passed');
