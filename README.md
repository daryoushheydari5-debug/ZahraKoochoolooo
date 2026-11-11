# Adventure Atlas

Live site: https://daryoushheydari5-debug.github.io/ZahraKoochoolooo/

React + TypeScript (Vite) trip planner for Shanghai → Fukuoka → Osaka → Tokyo, 20 Dec 2026 – 10 Jan 2027.

## Run it
```
npm install
npm run dev        # http://localhost:5173
npm test           # 28 tests (calendar rules, Fuji ranking, rates, error states)
npm run build      # static site in dist/ (host on GitHub Pages, Netlify, etc.)
npm run build:single  # one self-contained HTML file in dist-single/
```

## Live data (all keyless, called from the browser)
| Feature | Service | If unavailable |
|---|---|---|
| Weather + Mt Fuji ranking | Open-Meteo (CC BY 4.0), 16-day horizon | "Forecast not available yet" / error state; last saved copy marked stale |
| AUD/JPY/CNY rates | Frankfurter (ECB), fallback ExchangeRate-API open access | last saved rate with timestamp + stale warning, or manual rate |
| Drive times | OSRM public server (OpenStreetMap) | typical estimate, labelled as such |
| Photos | Wikimedia Commons API (CC/PD only, author + licence shown) | hand-drawn illustration |
| Maps | OpenStreetMap tiles via Leaflet | pins + Google Maps links |

Inside a claude.ai artifact these hosts are blocked by the page's security policy, so the artifact version shows the fallbacks. Host `dist/` anywhere normal to get live data.

## Where things are
- `src/data/` activities, road trips, stays, default route
- `src/lib/` dates, schedule rules (clashes, booked protection), weather scoring, fx, routing, photos, swap suggestions
- `src/state/store.ts` reducer, persistence (localStorage), budget lines
- `src/components/` screens
