# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/zevabagus-spec/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/zevabagus-spec/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Vaultlight: The Meridian Gallery Heist — a complete top-down stealth heist game that runs offline in a desktop browser from static files. You are Wren, a thief crossing the Meridian Gallery at night. Read the guards' patrol routes and vision cones, slip past the sweeping security cameras, lift the four display cases, pick the vault lock, take the Meridian Star, and reach the entry door before the alarm meter hits 100.

The approach: one gallery, three routes. The hall is split into three corridors by walls with gaps, so the thief can always choose a way around a patrol instead of through it. Guards walk fixed routes with line-of-sight vision cones that are clipped by walls and cover (a cone never shines through a wall), get suspicious, then chase; cameras sweep fixed arcs and feed the alarm instead of chasing. Tools cost Focus, earned from the display cases: a smoke bomb that blocks vision, and an EMP that darkens every camera for 8 seconds. Sneaking is slower but builds suspicion at less than half the rate. Three nights reuse the same hall with more guards, faster sweeps and a slower-cooling alarm, so the player reads the same room better each night. The alarm is the whole night in one number: it climbs while anyone is suspicious, cools while the thief is hidden, and at 100 the gallery locks down.

The game is vanilla JavaScript on a canvas, no library and no network request: every script, image and sound is a file under `game/` or generated at run time (the sounds are synthesized with WebAudio). The source is split into files with one job each — `config.js` (numbers), `level.js` (the floor plan), `vision.js` (line of sight and cones), `guards.js` (patrol and chase AI), `loot.js` (cases, the vault lock, tools, score), `audio.js` (synthesized sound), `input.js` (keyboard and click-to-move), `render.js` (everything drawn), `game.js` (state and rules), `shots.js` (the staged screenshot scenes) — so the structure reads as clearly as the game plays.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=pkrtjm47&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
