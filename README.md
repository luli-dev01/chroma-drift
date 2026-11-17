# Chroma Drift

An original twin-stick arena game for the make.fun **best-game-01** bounty,
built with plain Canvas 2D and Web Audio — no engine, no assets, no network.

The universe has gone grey. Pilot the last prism ship, shatter the grey
shards, gather the spectrum orbs they drop, and restore colour across
12 waves. Every 5th wave a **Monolith** boss arrives and bursts into
splinters. Fill the six-segment spectrum meter to unleash a **Nova**.

## Play

Serve the game folder with any static server, or use the bundled one:

```sh
node serve.ts          # then open http://localhost:8080
```

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Aim |
| Click / Space (hold) | Fire |
| Shift | Dash (brief invulnerability) |
| E | Nova, when the spectrum meter is full |
| P / Esc | Pause |
| M | Mute |
| R | Restart after game over / victory |

Complete loop: title screen → waves with banners → score, combo multiplier,
lives and HUD → game over or victory at wave 12 → restart.

## Layout

- `game/` — the playable game as static files (`index.html` + ES modules in `src/`)
- `screenshots/` — 4 screenshots taken from the game's deterministic `?shot=` scenes
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored library
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `serve.ts` — a tiny local static server for development

## Screenshots

The game stages deterministic scenes for its maker:
`?shot=start|play|boss|end&seed=N` (see `shots.json`). Each screenshot is a
real render of the game's own code in a browser.

## License

MIT — see `LICENSE`.
