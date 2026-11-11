import { useEffect, useMemo, useState } from "react";
import { useStore, useRegionWeather } from "../state/hooks";
import { ROAD_TRIPS, CAR_RULES, type RoadTrip } from "../data/roadtrips";
import { ACT_BY_ID } from "../data/activities";
import { STAYS, CITY_COLORS, gdir } from "../data/trip";
import { fetchRoute, fmtMins, ROUTING_ATTRIBUTION, type Route } from "../lib/routing";
import { TRIP_DAYS, cityOn } from "../lib/schedule";
import { addDays, fmt } from "../lib/dates";
import { CITY_COLORS as CC } from "../data/trip";
import { MapView, Ext, Confirm, WeatherAttribution, type Pin } from "./common";
import { AddToCalendar } from "./Explorer";
import { wxIcon } from "../lib/weather";
import type { Activity } from "../types";

type Prio = "nature" | "adrenaline" | "tech" | "baby";

export function RoadTrips() {
  const { state } = useStore();
  const [from, setFrom] = useState<"tok" | "fuk">("tok");
  const [prio, setPrio] = useState<Prio>("nature");
  const [open, setOpen] = useState<string>("fuji");
  const trips = useMemo(() => ROAD_TRIPS.filter((t) => t.from === from).sort((a, b) => b.rating[prio] - a.rating[prio]), [from, prio]);
  const car = state.cars.find((c) => c.city === from);
  return (
    <section aria-labelledby="rt-h">
      <h2 id="rt-h" className="h2">Road trip explorer</h2>
      <div className="chips" role="group" aria-label="Starting from">
        <button className="chip" aria-pressed={from === "tok"} onClick={() => setFrom("tok")}>From Tokyo</button>
        <button className="chip" aria-pressed={from === "fuk"} onClick={() => setFrom("fuk")}>From Fukuoka (3-day car)</button>
      </div>
      <div className="chips" role="group" aria-label="Prioritise">
        <span className="small muted">Sort by:</span>
        {(["nature", "adrenaline", "tech", "baby"] as Prio[]).map((p) => <button key={p} className="chip sm" aria-pressed={prio === p} onClick={() => setPrio(p)}>{{ nature: "Nature & mountains", adrenaline: "Adrenaline", tech: "Tech & interactive", baby: "Easy with baby" }[p]}</button>)}
      </div>
      {car && <p className="note small">Car plan: {car.label}, from {fmt(car.pickup, { dow: true })} for {car.days} days. Edit it in Money.</p>}
      <div className="trips">
        {trips.map((t) => <TripCard key={t.id} t={t} open={open === t.id} onToggle={() => setOpen(open === t.id ? "" : t.id)} />)}
      </div>
      <h3 className="h3">Rental car checklist</h3>
      <ul className="rules">{CAR_RULES.map((r) => <li key={r.title}><b>{r.title}.</b> {r.text}</li>)}</ul>
      <p className="attr"><Ext href={ROUTING_ATTRIBUTION.url}>{ROUTING_ATTRIBUTION.label}</Ext>. Road status: <Ext href="https://www.jartic.or.jp/">JARTIC traffic &amp; chain controls</Ext> · <Ext href="https://www.driveplaza.com/">NEXCO Drive Plaza (tolls, routes)</Ext></p>
      <WeatherAttribution />
    </section>
  );
}

function TripCard({ t, open, onToggle }: { t: RoadTrip; open: boolean; onToggle: () => void }) {
  const { state, dispatch } = useStore();
  const wx = useRegionWeather();
  const base = STAYS[t.from].pos;
  const mode = state.travelMode[t.id] ?? "drive";
  const [route, setRoute] = useState<Route | null>(null);
  const [routeErr, setRouteErr] = useState<string | null>(null);
  const [adding, setAdding] = useState<Activity | null>(null);
  const [stopAsk, setStopAsk] = useState(false);
  useEffect(() => {
    if (!open || route || mode !== "drive") return;
    let live = true;
    fetchRoute(base, t.dest).then((r) => live && setRoute(r)).catch((e) => live && setRouteErr((e as Error).message));
    return () => { live = false; };
  }, [open, mode]); // eslint-disable-line
  const acts = t.activityIds.map((id) => ACT_BY_ID[id]).filter(Boolean);
  const pins: Pin[] = useMemo(() => [{ pos: base, label: "Your base: " + STAYS[t.from].name, color: CC[t.from] }, ...acts.map((a) => ({ pos: a.location.pos, label: a.title, sub: a.duration, color: "#2f55c4" }))], [t.id]); // eslint-disable-line
  const region = acts[0]?.region;
  const nextDays = TRIP_DAYS.filter((d) => cityOn(d, state.legs) === t.from).slice(0, 14);
  const fc = region ? nextDays.map((d) => ({ d, s: wx.forRegion(d, region) })).filter((x) => x.s) : [];

  return (
    <article className="trip" style={{ ["--c" as string]: CITY_COLORS[t.from] }}>
      <button className="triphead" onClick={onToggle} aria-expanded={open}>
        <div><b>{t.name}</b><span className="muted small">{t.highlights}</span></div>
        <span className="tripmeta">{fmtMins(t.typicalMinutes)} · {t.overnight ? "day or overnight" : "day trip"}</span>
      </button>
      {open && (
        <div className="tripbody">
          <div className="seg" role="group" aria-label="Travel mode">
            <button aria-pressed={mode === "drive"} onClick={() => dispatch({ type: "travelMode", id: t.id, mode: "drive" })}>🚗 Drive</button>
            <button aria-pressed={mode === "transit"} onClick={() => dispatch({ type: "travelMode", id: t.id, mode: "transit" })}>🚆 Public transport</button>
          </div>
          {mode === "drive" ? (
            <dl className="facts">
              <dt>Drive time</dt>
              <dd>{route ? <>{fmtMins(route.minutes)} · {route.km} km <span className="badge verified">routed</span> <span className="small muted">no traffic; New Year (29 Dec–3 Jan) can double it</span></> : <>{fmtMins(t.typicalMinutes)} · ~{t.typicalKm} km <span className="badge estimate">typical estimate</span>{routeErr ? <span className="small muted"> (live routing unavailable: {routeErr})</span> : <span className="small muted"> (getting live route…)</span>}</>}</dd>
              <dt>Tolls</dt><dd>¥{t.tollsJpy[0].toLocaleString()}–{t.tollsJpy[1].toLocaleString()} each way <span className="badge estimate">estimate</span></dd>
              <dt>Parking</dt><dd>{t.parking}</dd>
              <dt>Winter</dt><dd><ul className="warnlist">{t.winter.map((w) => <li key={w}>❄️ {w}</li>)}</ul></dd>
              <dt>Car</dt><dd>IDP for every driver · rear-facing child seat (legally required under 6) · ETC card</dd>
            </dl>
          ) : (
            <dl className="facts">
              <dt>Route</dt><dd>{t.transit.summary}</dd>
              <dt>Time</dt><dd>~{fmtMins(t.transit.minutes)} <span className="badge estimate">typical</span></dd>
              <dt>Fare</dt><dd>~¥{t.transit.costJpy.toLocaleString()} per adult each way <span className="badge estimate">estimate</span>; under-6s ride free</dd>
              <dt>Baby</dt><dd>Bring a carrier; stairs at smaller stations. Reserve seats on limited expresses.</dd>
            </dl>
          )}
          <div className="links">
            <Ext className="lnk" href={gdir(base, t.dest, mode === "drive" ? "driving" : "transit")}>Google Maps directions ↗</Ext>
          </div>
          <MapView pins={pins} line={mode === "drive" ? route?.geometry : undefined} height={240} />
          {fc.length > 0 ? (
            <div className="fcrow" aria-label="Forecast for this area">{fc.map(({ d, s }) => <span key={d} className="fc"><b>{fmt(d)}</b>{wxIcon(s!.code)} {Math.round(s!.tMax ?? 0)}°/{Math.round(s!.tMin ?? 0)}°{(s!.snow ?? 0) > 0 && ` ❄️${s!.snow}cm`}</span>)}</div>
          ) : <p className="small muted">Area forecast: not available yet (only the next 16 days are forecast).</p>}
          <h4>Things to do</h4>
          <ul className="actlist">
            {acts.map((a) => (
              <li key={a.id}>
                <div><b>{a.title}</b> <span className="small muted">{a.duration}{a.adultOnly ? " · adults only" : ""}{a.weatherSensitive ? " · ☂︎ weather-sensitive" : ""}</span></div>
                <div className="actions">
                  <button className="btn sm primary" onClick={() => setAdding(a)}>Add as day trip</button>
                  <button className="btn sm ghost" onClick={() => dispatch({ type: "toggleSaved", id: a.id })}>{state.saved.includes(a.id) ? "✓ Saved" : "Save"}</button>
                </div>
              </li>
            ))}
          </ul>
          {t.overnight && <button className="btn ghost" onClick={() => setStopAsk(true)}>+ Make it an overnight trip</button>}
        </div>
      )}
      {adding && <AddToCalendar a={adding} onClose={() => setAdding(null)} />}
      {stopAsk && <OvernightDialog t={t} onClose={() => setStopAsk(false)} />}
    </article>
  );
}

function OvernightDialog({ t, onClose }: { t: RoadTrip; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const days = TRIP_DAYS.filter((d) => cityOn(d, state.legs) === t.from && d < TRIP_DAYS[TRIP_DAYS.length - 1]);
  const [d, setD] = useState(days[0]);
  return (
    <Confirm title={`Overnight in ${t.name}`} confirmLabel="Add stop" onCancel={onClose} onConfirm={() => { dispatch({ type: "addStop", leg: { id: "stop-" + t.id + Date.now().toString(36), city: "stop", name: t.name + " overnight", arrive: d, depart: addDays(d, 1), stayBooked: false, optional: true, color: CITY_COLORS.stop } }); onClose(); }}>
      <label className="form">Night of<select value={d} onChange={(e) => setD(e.target.value)}>{days.map((x) => <option key={x} value={x}>{fmt(x, { dow: true })}</option>)}</select></label>
      <p className="small muted">Adds an optional overnight stop to your route (you can change the dates in Route). Your main stay stays as it is.</p>
    </Confirm>
  );
}
