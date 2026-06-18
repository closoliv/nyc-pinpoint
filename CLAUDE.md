# NYC Pinpoint — Project Context for Claude

## What This Is

NYC Pinpoint is a daily geography game set in New York City, inspired by maptap.gg. Each day, players get 3 clues — one per category — and must drop a pin on a map of NYC's 5 boroughs as close as possible to the correct location. The closer the guess, the more points earned.

It's a side project built to share among friends. No paywall, no auth, no backend. Clean and simple.

---

## Tech Stack

- **React + Vite** — frontend framework and dev server
- **Mapbox GL JS** — map rendering (`mapbox-gl` npm package)
- **Static JSON** — clue data lives in `src/data/clues.json`, no database
- **localStorage** — persists daily game state so players can't replay
- **Vercel** — deployment, auto-deploys on push to `main`
- **No backend, no auth, no CMS**

Mapbox token is stored as `VITE_MAPBOX_TOKEN` in `.env` locally and as an environment variable in Vercel. Never committed to the repo. Production uses a token restricted (via Mapbox URL restrictions) to the production domain; Preview and Development use an unrestricted token since Vercel preview URLs are dynamic and can't be allowlisted.

---

## Game Mechanics

### Round Structure
- 3 rounds per game, one clue per category in this fixed order:
  1. **Landmark** — player is just given the name of a place and must pin it
  2. **Cross Street** — a descriptive clue about a specific intersection
  3. **Pop Culture** — an oblique reference to a film, TV, or music location

### Daily Puzzle
- Date-seeded: today's date → deterministic seed → picks one clue from each category
- Everyone gets the same puzzle each day
- Logic lives in `src/utils/gameUtils.js` → `getDailyClues()`

### Scoring
- Max **1000 points per round**, 3000 total
- Distance-based decay:
  - 0–100m: 1000 pts (full marks)
  - 100m–5km: linear decay
  - 5km+: 0 pts
- Designed to feel **generous close in, harsh far out**
- Logic: `calculateScore()` in `src/utils/gameUtils.js`

### Share Card Emoji Thresholds
- 🟢 750–1000 pts
- 🟡 400–749 pts
- 🔴 0–399 pts

Share card format:
```
NYC Pinpoint — June 17
🟢 🟡 🔴
847 / 3000
```

### One-and-Done
- Once a player completes the daily puzzle, returning to the game shows their score and share prompt — no replay
- State is stored in localStorage under key `nyc-pinpoint-YYYY-MM-DD`

---

## Map Rules

- Restricted to NYC's 5 boroughs via `maxBounds`
- Min zoom: 9 (full 5 boroughs visible), Max zoom: 15
- **All labels stripped** — no street names, no POI names, no neighborhood labels. The map is intentionally flat. This is core to the game — labels would give away answers.
- Labels are hidden by setting all `symbol` layers to `visibility: none` on map load
- Base style: `mapbox://styles/mapbox/light-v11` with labels stripped
- User pin: blue dot
- Answer pin: green dot
- Line between guess and answer: red dashed line
- After reveal: map flies to fit both pins in view

---

## UX Decisions

- **Mobile-first** — primarily designed for phone browsers, also works on desktop
- **Running score** — total points visible in the header throughout the game
- **Round indicators** — 3 pip bars in the header: gray = upcoming, black = active, green = complete
- **Result reveal flow**:
  1. Player drops a pin anywhere on the map
  2. "Submit Guess" button appears (floating, bottom center)
  3. On submit: correct answer pin appears, dashed line drawn between pins, map flies to fit both
  4. Result tooltip floats over the map, anchored to the answer pin: emoji + points earned + answer label + distance + fun fact. Flips above/below and left/right-aligns to stay on-screen and avoid covering the pins.
  5. "Next Round →" or "See Final Score" button advances
- **Score card** — slides up from bottom on game complete, shows breakdown per round + share button
- **Share** — uses `navigator.share` on mobile, falls back to clipboard copy on desktop

---

## Clue Schema

All clues live in `src/data/clues.json` as a JSON array. Each clue has these 7 fields:

```json
{
  "id": "katz-deli",
  "category": "landmark|cross_street|pop_culture",
  "borough": "manhattan|brooklyn|queens|bronx|staten_island",
  "clue": "The clue text shown to the player",
  "answer_label": "Katz's Delicatessen",
  "lat": 40.7223,
  "lng": -73.9874,
  "fun_fact": "Shown after the reveal. Optional but encouraged."
}
```

### Notes on clue writing
- **Landmark clues**: `clue` and `answer_label` are the same — just the place name. Testing geography, not trivia.
- **Cross street clues**: descriptive or historical hook. The interesting part is the cultural/historical angle, not just "name this intersection."
- **Pop culture clues**: oblique references. Never name the place directly. The harder, the better.
- `fun_fact` can be `null` but try to write one — it's what gives the game texture and makes people want to share.
- `borough` field is for future filtering/variety logic, not currently used in game logic.
- `category` field drives round assignment. Do not rename these values: `landmark`, `cross_street`, `pop_culture`.

### Current clue counts
- 10 landmarks, 10 cross streets, 10 pop culture = 30 total
- At 1 clue per category per day, this covers ~10 days before repeats
- Expanding the clue library is a priority

---

## File Structure

```
nyc-pinpoint/
├── public/
├── src/
│   ├── components/
│   │   ├── Map.jsx           # Mapbox map, pin drop, result reveal, line drawing
│   │   ├── GameHeader.jsx    # Title, score, round pips, clue text
│   │   ├── ResultTooltip.jsx # Floats over the map after each guess: score, distance, fun fact
│   │   └── ScoreCard.jsx     # End screen: breakdown, share button
│   ├── data/
│   │   └── clues.json        # All clue content — edit this to add/change clues
│   ├── hooks/
│   │   └── useGameState.js   # All game state: rounds, scores, guesses, localStorage
│   ├── utils/
│   │   └── gameUtils.js      # Pure functions: scoring, distance, daily seed, emoji thresholds
│   ├── App.jsx               # Root component, wires everything together
│   ├── App.css               # (unused, can ignore)
│   └── index.css             # All styles — mobile-first, single file for now
├── .env                      # VITE_MAPBOX_TOKEN=pk.xxx (never committed)
├── .gitignore                # Includes .env
├── LICENSE                   # MIT
├── CLAUDE.md                 # This file
└── package.json
```

---

## What's Not Built Yet (Good Next Steps)

- **Custom Mapbox style** — currently using light-v11 with labels hidden. A proper custom style in Mapbox Studio would look cleaner and more intentional.
- **Scoring curve tuning** — the current decay curve is a starting point. Play-test it and adjust the `calculateScore()` function in `gameUtils.js`.
- **More clues** — 30 clues is thin. Aim for 100+ per category before a wider launch.
- **Clue verification** — coordinates were generated and should be spot-checked in Google Maps, especially cross streets.
- **Game name** — placeholder is "NYC Pinpoint." A real name TBD closer to launch.
- **Animations** — result panel currently appears instantly. A slide-up animation would feel smoother.
- **Better empty state** — if a player has already completed today's puzzle and returns, the experience could be more polished.
- **Borough edge cases** — Statue of Liberty is tagged `manhattan` but is technically on its own island. A house rule is needed for similar edge cases.
- **Streak tracking** — future feature, would require more localStorage logic.
- **Donations** — Stripe or Ko-fi, low priority but on the roadmap.

---

## Deployment

- **Repo**: `https://github.com/closoliv/nyc-pinpoint` (public)
- **License**: MIT
- **Deployed on Vercel** — auto-deploys on push to `main`
- **Environment variable in Vercel**: `VITE_MAPBOX_TOKEN`, scoped per environment — Production uses a URL-restricted token, Preview/Development use an unrestricted one
- **Git Fork Protection**: enabled (Project Settings → Security), since the repo is public
- To deploy a change: edit locally → `git add . && git commit -m "message" && git push`
