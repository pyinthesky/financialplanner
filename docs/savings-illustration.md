# Savings-Rate Illustration

The Knowledge Center offers an explicit **Explore the Savings Curve** button. It loads an educational example, not personal onboarding values. Nothing is read from or written to the plan, vault or export. All interaction is local. The source article opens only when selected, without a referrer or appended user data.

Inspiration: [Mr. Money Mustache, January 13, 2012](https://www.mrmoneymustache.com/2012/01/13/the-shockingly-simple-math-behind-early-retirement/), reviewed September 12, 2026. The app does not copy the article's graphic, fetch its assets or reproduce its prose. The default illustration uses its 5% real-return and 4% withdrawal assumptions with a separately selected 25% savings example. These are neither current forecasts nor recommended rates.

## Independent Model

Normalize annual income after taxes and before saving to 1. Let `s` be the saved fraction, `r` the constant annual real return and `w` the assumed initial withdrawal fraction. Start with zero investments and add `s` at each year end. Income and spending are constant in real terms.

- Annual spending: `1 - s`.
- Portfolio target: `T = (1 - s) / w`.
- After `n` years, balance: `s × ((1 + r)^n - 1) / r`.
- Solve for the target: `n = log(1 + T × r / s) / log(1 + r)`.
- At zero return: `n = T / s`.

The curve shows fractional-year interpolation of this annual formula; the target is first reached at the next whole year-end contribution. Independent tests simulate whole-year balances immediately before and after that target. Zero savings with positive spending has no finite horizon; zero spending gives a zero mathematical target. The visible slider avoids those unrealistic endpoints and spans 5%–95%.

At fixed income, saving more by reducing spending changes both contributions and the required portfolio. The numerical effect does not establish whether a spending reduction is feasible or desirable for a particular household.

## Limits

No pension, Social Security, starting assets, tax on withdrawals, account-access restrictions, variable returns, changing income, or changing health/housing costs are included. No retirement decumulation simulation is performed. Reaching a spending multiple does not prove lifelong funding or a safe withdrawal rate. Personal budgets and Scenario Laboratory remain the tools for the supported household projection.

The SVG is independently generated from the formula. A keyboard-operable savings slider moves its marker; adjustable return/withdrawal assumptions redraw the curve. The live text result and SVG description provide the selected value without requiring vision or pointer hover. Browser gates check explicit loading, keyboard changes and mobile containment.
