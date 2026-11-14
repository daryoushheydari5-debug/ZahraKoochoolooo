import { useState } from "react";
import { useStore } from "../state/hooks";
import { CITY_NAMES, CITY_POS } from "../data/trip";
import { estimate, findPlace, fmtMins, googleDirections, straightKm, type Found, type LatLonLike, type Travel } from "../lib/directions";
import type { CityId } from "../types";
import { Ext } from "./common";

const BASES: CityId[] = ["sha", "fuk", "osa", "tok"];
type From = "auto" | CityId | "me";

/** Type an address: see it on the map, how long it takes each way, and open Google Maps directions. */
export function Directions({ found, setFound }: { found: Found | null; setFound: (f: Found | null) => void }) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [options, setOptions] = useState<Found[]>([]);
  const [from, setFrom] = useState<From>("auto");
  const [me, setMe] = useState<LatLonLike | null>(null);

  const baseOf = (b: CityId) => {
    const stay = state.legs.find((l) => !l.optional && l.city === b)?.stay;
    return { pos: stay?.pos ?? CITY_POS[b], label: stay ? stay.name : `central ${CITY_NAMES[b]}`, query: stay ? (stay.posExact ? stay.pos : stay.mapsQuery ?? stay.name) : `${CITY_NAMES[b]} Station` };
  };
  const nearest = found ? BASES.reduce((a, b) => (straightKm(CITY_POS[b], found) < straightKm(CITY_POS[a], found) ? b : a)) : "tok";
  const base: CityId = from === "auto" || from === "me" ? nearest : from;
  const hotel = baseOf(base);
  const start = from === "me" && me ? { pos: me, label: "where you are now" } : hotel;
  // From "where I am", leave the origin out so Google uses the phone's live location.
  const startQuery: LatLonLike | string | undefined = from === "me" ? undefined : hotel.query;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    setBusy(true); setErr(""); setOptions([]); setAsked(text);
    try {
      const rows = await findPlace(text);
      if (!rows.length) { setFound(null); setErr("Couldn't find that on the free map. The Google Maps buttons below still work with what you typed."); }
      else { setFound(rows[0]); setOptions(rows.slice(1)); }
    } catch {
      setFound(null); setErr("The map search isn't reachable right now. The Google Maps buttons below still work with what you typed.");
    } finally { setBusy(false); }
  }

  function useMe() {
    setFrom("me");
    if (me || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setMe({ lat: p.coords.latitude, lon: p.coords.longitude }), () => { setErr("Location is off, so directions start from your hotel instead."); setFrom("auto"); }, { timeout: 10000 });
  }

  const dest = asked;
  const est = found ? estimate(start.pos, found, found.country === "cn" ? "cn" : "jp") : null;
  const link = (m: Travel) => googleDirections(dest, m, startQuery);

  return (
    <section className="box directions" aria-label="Get directions">
      <h3 className="h3">🧭 Get directions</h3>
      <form className="dirform" onSubmit={search}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type an address or place, e.g. Shibuya Sky" aria-label="Address or place" enterKeyHint="search" />
        <button className="btn primary" disabled={busy || !q.trim()}>{busy ? "Finding…" : "Find"}</button>
      </form>
      <label className="inline small">Start from
        <select value={from} onChange={(e) => (e.target.value === "me" ? useMe() : setFrom(e.target.value as From))}>
          <option value="auto">Our nearest hotel{found ? ` (${CITY_NAMES[nearest]})` : ""}</option>
          {BASES.map((b) => <option key={b} value={b}>{CITY_NAMES[b]}: {baseOf(b).label}</option>)}
          <option value="me">📍 Where I am now</option>
        </select>
      </label>

      {err && <p className="small muted">{err}</p>}
      {found && (
        <div className="dirresult">
          <p className="small"><b>📍 {found.name.split(",").slice(0, 3).join(",")}</b></p>
          {options.length > 0 && (
            <p className="small muted">Not the right one?{" "}
              {options.map((o) => <button key={o.name} className="linkbtn" onClick={() => { setOptions([found, ...options.filter((x) => x !== o)]); setFound(o); }}>{o.name.split(",").slice(0, 2).join(",")}</button>).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, " · ", el] : [el]), [])}
            </p>
          )}
          {est && (
            <>
              <p className="small muted">From {start.label}: about {Math.round(est.km)} km in a straight line. Times are rough; Google has the exact ones.</p>
              <ul className="ways">
                {est.ways.map((w) => <li key={w.label}><span aria-hidden="true">{w.icon}</span> <b>{w.label}</b> <span>~{fmtMins(w.minutes)}</span>{w.note && <span className="muted"> · {w.note}</span>}</li>)}
              </ul>
              <ul className="ticks small">{est.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
        </div>
      )}
      {dest && (
        <div className="links">
          <Ext className="btn sm primary" href={link("transit")}>🚇 Train directions ↗</Ext>
          <Ext className="btn sm ghost" href={link("driving")}>🚗 Drive ↗</Ext>
          <Ext className="btn sm ghost" href={link("walking")}>🚶 Walk ↗</Ext>
        </div>
      )}
    </section>
  );
}
