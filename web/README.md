# Schedule I Mixer: web app

The React + TypeScript + Vite app. For what it does, how to run it and how the game data works, see the [main README](../README.md).

## Structure

```
src/
├── engine/               Game logic, with no React (runs in tests and the Web Worker)
│   ├── data.ts           Loads the root JSON files and checks every effect/ingredient name
│   ├── effectSet.ts      Effect sets as bitmasks
│   ├── mix.ts            One mixing step (mix) and an explained version for the UI (describeMix)
│   ├── price.ts          Asking price, multiplier and recipe cost
│   ├── search.ts         The search engine: Query in, ranked Results out
│   ├── worker.ts         Runs search() in a Web Worker
│   ├── useSearch.ts      React hook that drives the worker (progress, cancel)
│   └── *.test.ts         Vitest tests
├── pages/                Finder, Simulator and My stock
├── components/           Effect chips and effect pickers
├── stock.tsx             Available products/ingredients, saved in localStorage
├── router.ts             Hash routes such as #/simulator?product=OG%20Kush&recipe=Cuke
└── App.tsx               Header, navigation and page switching
```

## Notes

- **Game data** is imported from the repository root through the `@data` alias (`vite.config.ts` and `tsconfig.app.json`), so there's only one copy of it.
- **Effect sets** are plain numbers used as bitmasks, one bit per effect in `effects.json` order. There are more than 32 effects, so `effectSet.ts` uses arithmetic rather than JavaScript's 32-bit bitwise operators. The search splits each set into two 32-bit words for speed.
- **`CompiledIngredient` in `search.ts`** repeats the rules in `mix.ts` using bit operations. A test checks they always agree, so change both together.
- **Tests:** `engine.test.ts` replays the wiki recipes and checks prices. `search.test.ts` compares the search against brute force and the wiki's exhaustive profit tables. The 8-mix profit test takes about 10 seconds.
