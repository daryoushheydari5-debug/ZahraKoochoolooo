import { useEffect, useReducer, useState } from "react";
import { StoreCtx } from "./state/hooks";
import { loadState, persistState, reducer } from "./state/store";
import { Calendar } from "./components/Calendar";
import { Explorer } from "./components/Explorer";
import { RoadTrips } from "./components/RoadTrips";
import { FujiPlanner } from "./components/FujiPlanner";
import { ThemeParks } from "./components/ThemeParks";
import { Money } from "./components/Money";
import { RoutePanel } from "./components/RoutePanel";
import { Confirm } from "./components/common";

const TABS = [
  { id: "plan", label: "Plan", icon: "🗓️" },
  { id: "route", label: "Route", icon: "🧭" },
  { id: "explore", label: "Explore", icon: "✨" },
  { id: "roads", label: "Road trips", icon: "🚗" },
  { id: "fuji", label: "Mt Fuji", icon: "🗻" },
  { id: "parks", label: "Parks", icon: "🎢" },
  { id: "money", label: "Money", icon: "💴" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [tab, setTab] = useState<Tab>(() => {
    try { const t = localStorage.getItem("aa.tab"); if (t && TABS.some((x) => x.id === t)) return t as Tab; } catch { /* ignore */ }
    return "plan";
  });
  const [resetAsk, setResetAsk] = useState(false);
  useEffect(() => { persistState(state); }, [state]);
  useEffect(() => { try { localStorage.setItem("aa.tab", tab); } catch { /* ignore */ } window.scrollTo({ top: 0 }); }, [tab]);

  return (
    <StoreCtx.Provider value={{ state, dispatch }}>
      <div className="app">
        <header className="top">
          <div>
            <h1>Adventure Atlas</h1>
            <p className="sub">Shanghai → Fukuoka → Osaka → Tokyo · 20 Dec 2026 – 10 Jan 2027 · 3 adults + 1 baby</p>
          </div>
          <button className="btn ghost sm" onClick={() => setResetAsk(true)} title="Reset all changes">Reset</button>
        </header>
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              <span aria-hidden="true">{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <main role="tabpanel">
          {tab === "plan" && <Calendar />}
          {tab === "route" && <RoutePanel />}
          {tab === "explore" && <Explorer />}
          {tab === "roads" && <RoadTrips />}
          {tab === "fuji" && <FujiPlanner />}
          {tab === "parks" && <ThemeParks />}
          {tab === "money" && <Money />}
        </main>
        <footer className="foot">Changes are saved on this device. Costs marked “estimate” are estimates; check opening hours over New Year. Photos: Wikimedia Commons, with author and licence on each photo.</footer>
      </div>
      {resetAsk && (
        <Confirm title="Reset everything?" danger confirmLabel="Reset" onCancel={() => setResetAsk(false)} onConfirm={() => { dispatch({ type: "reset" }); setResetAsk(false); }}>
          <p>This puts the route, calendar, votes, favourites and budget back to the starting plan on this device. Your real bookings aren't affected.</p>
        </Confirm>
      )}
    </StoreCtx.Provider>
  );
}
