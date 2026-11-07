# Contributing

Thanks for taking a look. This project is small on purpose; keep changes focused.

## Development

```bash
npm install
npm run dev
npm run build
npm run smoke   # headless API/DOM smoke test, needs Chrome
```

`scripts/smoke.mjs` uses `CHROME_PATH` and `APP_URL` if the defaults do not fit
your machine.

## Guidelines

- **Keep the layers separate.** `index.js` wires modules; feature modules should
  receive `app` and not import each other.
- **Data stays external.** No real project, vault, person or private path should
  be committed. Demo data lives in `src/demo/` and is fictional.
- **Tune through `tuning.js`.** New visual values should be added to
  `TUNE_DEFAULTS` + `BASE_CONFIG` and applied in `apply()`.
- **Preserve the DOM contract.** Classes and ids are used by the CSS and by
  hosts that embed the console; prefer adding new hooks over renaming old ones.
- **No new runtime dependencies** without a clear reason. `three` is the only
  runtime dependency today.
- **Test the visual path.** At minimum run `npm run build` and check the home
  page, overlay, hover label and the tuning panel at 1440 and 720 widths.

## Commit style

Short imperative subjects, for example:

```
refactor: split black hole pass into its own module
feat: expose per-project halo tuning
fix: keep disk flow frozen at speed 0
```
