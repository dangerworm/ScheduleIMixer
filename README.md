# Schedule I Mixer

A companion app for the game [Schedule I](https://store.steampowered.com/app/3164500/Schedule_I/) that works out how to mix products and ingredients to get the effects your customers want.

It runs entirely in the browser: no server and no database. Every search is calculated on the spot from the game data in this repository.

## Features

- **Finder**: search for recipes that give the effects you want (and avoid the ones you don't).
  - Start from any unmixed products, or from a drug you've already mixed.
  - Rank by **cheapest**, **fewest mixes** or **most profit**.
  - Limit the number of mixes and the ingredient cost.
  - "Not possible" is a definite answer: nothing within your limits gives those effects with your ingredients.
- **Simulator**: add ingredients one at a time and see the effects, transformations, price and profit after each step. Recipes are saved in the page address, so you can bookmark or share them.
- **My stock**: tick the products and ingredients you have access to. The Finder only uses those. Your choices are saved in your browser.

Only the game's standard mixing rules are supported, not saves with *Seeded Mixing* turned on.

## Getting started

You need [Node.js](https://nodejs.org/) 20 or later.

```bash
cd web
npm install
npm run dev     # http://localhost:5173
```

Other scripts, run from `web/`:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the test suite once (about 20 seconds) |
| `npx vitest` | Runs the tests in watch mode |
| `npm run build` | Type-checks and builds a static site into `web/dist/` |
| `npm run preview` | Serves the built site locally |
| `npm run lint` | Runs ESLint |

The built site is plain static files with relative paths, so it can be hosted anywhere, including GitHub Pages, or opened from a local web server.

## Repository layout

```
├── products.json                 Products, base prices and base effects
├── ingredients.json              Ingredients: price, unlock rank, effect and transformations
├── effects.json                  Effects: price multiplier and in-game colour
├── customers.json                Customers: region, standards and favourite effects
├── max-profit-strategies.json    The wiki's best-recipe tables, used as test data
├── web/                          The React + Vite web app (see web/README.md)
└── api/                          An earlier Windows Forms prototype (C#)
```

The JSON files in the root are the single source of game data. The web app imports them directly. The copies under `api/ScheduleI.Ui/` are older and use a different format.

## Game data

All data comes from the [Schedule 1 Wiki](https://schedule-1.fandom.com/wiki/Schedule_1_Wiki). Each file has a `source` block giving the page it came from and when it was retrieved. Wiki content is available under [CC BY-SA](https://www.fandom.com/licensing).

### How mixing works

These rules reproduce every recipe in the wiki's *Best Mixing Recipes* tables. Mixing in an ingredient:

1. **Applies its transformations** in the order they're listed in `ingredients.json`, to the effects the product had *before* this mix.
2. **Skips a transformation if its result is already present**, including a result produced earlier in the same mix.
3. **Then adds the ingredient's own effect**, if it's new and the product has fewer than 8 effects.

### How prices work

```
asking price = base price × (1 + sum of (effect multiplier − 1))
```

The result is rounded to the nearest dollar, with halves rounded to the even number, like Unity's `Mathf.RoundToInt`. For example, unmixed OG Kush is 35 × 1.10 = 38.5, which sells for $38.

| Product | Base price |
| --- | --- |
| Marijuana (all strains) | $35 |
| Methamphetamine | $70 |
| Shrooms | $100 |
| Cocaine | $150 |

The wiki lists the marijuana strains at $38–44 because those prices include each strain's own effect.

### Known errors on the wiki

The tests found these errors in the wiki's tables. The tests record them explicitly.

- **Granddaddy Purple, 7 mixes:** the ingredient cost is listed as $32, but the ingredients add up to $33.
- **Multiplier column:** 10 rows have the wrong multiplier, although their asking prices are correct.
- **Cocaine, 5 and 6 mixes:** the "guaranteed best" table reuses the Meth recipes. At Cocaine's price, better recipes exist:
  - 5 mixes: Mega Bean, Cuke, Banana, Horse Semen, Iodine makes **$488** profit (the wiki says $486). Confirmed by trying every 5-mix recipe.
  - 6 mixes: the same recipe with Viagor added after Banana makes **$553** (the wiki says $549).

### Updating after a game patch

1. **Edit the JSON files in the root.** Keep effect, ingredient and product names consistent: the app checks every name when it loads and reports any it doesn't recognise.
2. **Run `npm test` in `web/`.** If mixing rules or prices changed, update `max-profit-strategies.json` from the wiki as well.

## How the search works

There are millions of possible effect combinations (about 1.7 million within 8 mixes from a single starting product), so the app doesn't store them. Each search explores outwards from the starting products, trying the most promising recipes first:

- **Mix limit:** the search never goes past the mix limit you set.
- **Stops early:** when ranking by cost or number of mixes, the first matches found are the best ones, so it stops once it has enough.
- **Skips repeats:** many recipes lead to the same effects. It skips a route if it has already continued from those effects by a route that was no worse on both cost and mixes.
- **Shares work:** products with the same starting effects (Meth, Shrooms and Cocaine) are searched once.
- **Compact storage:** effect sets are stored as bitmasks, and the search state is kept in typed arrays.

Searches run in a Web Worker, so the page stays responsive and you can cancel long searches. Ranking every 8-mix recipe by profit takes about 3 seconds.

The tests check the search against a brute-force search that tries every recipe, and against the wiki's exhaustive profit tables. See `web/src/engine/search.ts` for details.

## Disclaimer

This is a fan-made tool. It isn't affiliated with or endorsed by TVGS, the developers of Schedule I.
