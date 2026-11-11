import { useMemo, useState } from "react";
import { useStore } from "../state/hooks";
import { validateLegs } from "../lib/schedule";
import { bookingSearchUrl, CITY_COLORS, gmaps, TRIP_END, TRIP_START, TRAVELLERS } from "../data/trip";
import { diffDays, fmt } from "../lib/dates";
import { MapView, Ext, type Pin } from "./common";
import type { Leg } from "../types";

export function RoutePanel() {
  const { state, dispatch } = useStore();
  const [sel, setSel] = useState<string>(state.legs[0]?.id);
  const problems = useMemo(() => validateLegs(state.legs), [state.legs]);
  const legs = [...state.legs].sort((a, b) => a.arrive.localeCompare(b.arrive) || (a.optional ? 1 : -1));
  const selLeg = state.legs.find((l) => l.id === sel);
  const pins: Pin[] = useMemo(() => legs.filter((l) => l.stay).map((l) => ({ pos: l.stay!.pos, label: `${l.name}: ${l.stay!.name}`, sub: `${fmt(l.arrive)} – ${fmt(l.depart)}`, color: l.color, href: l.stay!.bookingUrl, highlight: l.id === sel })), [legs, sel]);
  const nights = (l: Leg) => Math.max(0, diffDays(l.arrive, l.depart));

  const addStop = () => {
    const id = "stop-" + Date.now().toString(36);
    dispatch({ type: "addStop", leg: { id, city: "stop", name: "Overnight stop", arrive: "2027-01-02", depart: "2027-01-03", stayBooked: false, optional: true, color: CITY_COLORS.stop } });
    setSel(id);
  };

  return (
    <section aria-labelledby="route-h">
      <h2 id="route-h" className="h2">Route &amp; stays</h2>
      <p className="muted">{fmt(TRIP_START, { dow: true })} 2026 – {fmt(TRIP_END, { dow: true })} 2027 · {TRAVELLERS.map((t) => `${t.name} (${t.age})`).join(", ")}. None of these dates are locked: edit any of them.</p>
      <div className="legs">
        {legs.map((l) => (
          <div key={l.id} className={"legcard" + (l.id === sel ? " sel" : "") + (l.optional ? " stop" : "")} style={{ ["--c" as string]: l.color }}>
            <button className="legname" onClick={() => setSel(l.id)} aria-pressed={l.id === sel}>
              <i />{l.optional ? <input aria-label="Stop name" value={l.name} onClick={(e) => e.stopPropagation()} onChange={(e) => dispatch({ type: "setLeg", id: l.id, patch: { name: e.target.value } })} /> : <b>{l.name}</b>}
              <span>{nights(l)} night{nights(l) === 1 ? "" : "s"}</span>
            </button>
            <div className="legdates">
              <label>Arrive<input type="date" min={TRIP_START} max={TRIP_END} value={l.arrive} onChange={(e) => dispatch({ type: "setLeg", id: l.id, patch: { arrive: e.target.value } })} /></label>
              <label>Leave<input type="date" min={TRIP_START} max={TRIP_END} value={l.depart} onChange={(e) => dispatch({ type: "setLeg", id: l.id, patch: { depart: e.target.value } })} /></label>
            </div>
            {l.stay ? (
              <div className="stay">
                <div><b>{l.stay.name}</b><span className="muted"> · {l.stay.area}</span></div>
                {l.stay.note && <p className="small">{l.stay.note}</p>}
                <div className="links">
                  <Ext className="lnk" href={l.stay.bookingUrl}>{l.stay.bookingLabel} ↗</Ext>
                  <Ext className="lnk" href={bookingSearchUrl(l.stay.name, l.arrive, l.depart)}>Booking.com for these dates ↗</Ext>
                  <Ext className="lnk" href={gmaps(l.stay.mapsQuery)}>Map ↗</Ext>
                </div>
              </div>
            ) : (
              <div className="links"><Ext className="lnk" href={bookingSearchUrl(l.name, l.arrive, l.depart)}>Find a stay for these dates ↗</Ext></div>
            )}
            <div className="legfoot">
              <label className="check"><input type="checkbox" checked={l.stayBooked} onChange={(e) => dispatch({ type: "setLeg", id: l.id, patch: { stayBooked: e.target.checked } })} /> Booked</label>
              {l.optional && <button className="btn ghost sm" onClick={() => dispatch({ type: "removeLeg", id: l.id })} disabled={l.stayBooked} title={l.stayBooked ? "Untick Booked first" : ""}>Remove stop</button>}
            </div>
          </div>
        ))}
      </div>
      <button className="btn ghost" onClick={addStop}>+ Add optional overnight stop</button>
      {problems.length > 0 && (
        <ul className="problems" aria-live="polite">
          {problems.map((p, i) => <li key={i} className={p.level}>{p.level === "error" ? "⛔" : "⚠️"} {p.msg}</li>)}
        </ul>
      )}
      <MapView pins={pins} focus={selLeg?.stay?.pos} height={300} />
    </section>
  );
}
