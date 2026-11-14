import { useEffect, useReducer, useState } from "react";
import { StoreCtx } from "./state/hooks";
import { loadState, persistState, reducer } from "./state/store";
import { Itinerary } from "./components/Itinerary";
import { Checklist } from "./components/Checklist";
import { googleWeather } from "./lib/transport";
import type { CityId } from "./types";
import { Explorer } from "./components/Explorer";
import { JapanMap } from "./components/JapanMap";
import { RoadTrips } from "./components/RoadTrips";
import { FujiPlanner } from "./components/FujiPlanner";
import { ThemeParks } from "./components/ThemeParks";
import { Money } from "./components/Money";
import { RoutePanel } from "./components/RoutePanel";
import { Confirm } from "./components/common";

const TABS = [
  { id: "plan", label: "Plan", icon: "🗓️" },
  { id: "explore", label: "Explore", icon: "✨" },
  { id: "map", label: "Map", icon: "🗾" },
  { id: "book", label: "To book", icon: "✅" },
  { id: "money", label: "Money", icon: "💴" },
] as const;
const MORE = [
  { id: "route", label: "Change dates & route" },
  { id: "fuji", label: "Mt Fuji weather" },
  { id: "roads", label: "Road trips" },
  { id: "parks", label: "USJ & Disneyland" },
] as const;
type Tab = (typeof TABS)[number]["id"] | (typeof MORE)[number]["id"];
const ALL_TABS: readonly string[] = [...TABS, ...MORE].map((t) => t.id);

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [tab, setTab] = useState<Tab>(() => {
    try { const t = localStorage.getItem("aa.tab"); if (t && ALL_TABS.includes(t)) return t as Tab; } catch { /* ignore */ }
    return "plan";
  });
  const [resetAsk, setResetAsk] = useState(false);
  const [exploreCity, setExploreCity] = useState<CityId | "all">("all");
  const goExplore = (c?: CityId) => { setExploreCity(c ?? "all"); setTab("explore"); };
  useEffect(() => { persistState(state); }, [state]);
  useEffect(() => { try { localStorage.setItem("aa.tab", tab); } catch { /* ignore */ } window.scrollTo({ top: 0 }); }, [tab]);

  return (
    <StoreCtx.Provider value={{ state, dispatch }}>
      <div className="app">
        <header className="top">
          <div>
            <h1>Adventure Atlas</h1>
            <p className="sub">Shanghai → Fukuoka → Osaka → Tokyo · 20 Dec 2026 – 10 Jan 2027 · 3 adults + 1 baby</p>
            <div className="wxbtns">
              <a className="btn sm ghost" href={googleWeather("Shanghai")} target="_blank" rel="noopener noreferrer">☁️ Shanghai weather</a>
              <a className="btn sm ghost" href={googleWeather("Japan")} target="_blank" rel="noopener noreferrer">☁️ Japan weather</a>
            </div>
          </div>
          <button className="btn ghost sm" onClick={() => setResetAsk(true)} title="Reset all changes">Reset</button>
        </header>
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              <span aria-hidden="true">{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
          <select className="more" aria-label="More" value={MORE.some((m) => m.id === tab) ? tab : ""} onChange={(e) => e.target.value && setTab(e.target.value as Tab)}>
            <option value="">More…</option>
            {MORE.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </nav>
        <main role="tabpanel">
          {tab === "plan" && <Itinerary goExplore={goExplore} goBook={() => setTab("book")} />}
          {tab === "book" && <Checklist goExplore={() => goExplore()} />}
          {tab === "route" && <RoutePanel />}
          {tab === "explore" && <Explorer key={exploreCity} city={exploreCity} />}
          {tab === "map" && <JapanMap />}
          {tab === "roads" && <RoadTrips />}
          {tab === "fuji" && <FujiPlanner />}
          {tab === "parks" && <ThemeParks />}
          {tab === "money" && <Money />}
        </main>
        <footer className="foot">Changes are saved on this device. Costs marked “estimate” are estimates; check opening hours over New Year. Photos: Wikimedia Commons, with author and licence on each photo.</footer>
      </div>
      {resetAsk && (
        <Confirm title="Reset everything?" danger confirmLabel="Reset" onCancel={() => setResetAsk(false)} onConfirm={() => { dispatch({ type: "reset" }); setResetAsk(false); }}>
          <p>This clears the plan and puts the route, ticks and budget back to the start on this device. Your real bookings aren't affected.</p>
        </Confirm>
      )}
    </StoreCtx.Provider>
  );
}
