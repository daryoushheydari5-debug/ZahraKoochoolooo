import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../state/hooks";
import { fetchForecast, rankFujiDays, type ForecastResponse, type FujiDay, FORECAST_HORIZON_DAYS } from "../lib/weather";
import { planMove, itemTitle, TRIP_DAYS } from "../lib/schedule";
import { dateRange, fmt, fmtDateTime, isoTodayLocal, addDays } from "../lib/dates";
import { ACT_BY_ID } from "../data/activities";
import { Confirm, Ext, WeatherAttribution, ActivityPhoto } from "./common";

const KAWAGUCHIKO = { lat: 35.5005, lon: 138.7600 };

export const WEBCAMS = [
  { label: "Fuji Five Lakes live cameras (fujigoko.tv)", url: "https://www.fujigoko.tv/" },
  { label: "Webcams around Mt Fuji on Windy", url: "https://www.windy.com/-Webcams/webcams?35.45,138.75,10" },
  { label: "YouTube: Mt Fuji live camera streams", url: "https://www.youtube.com/results?search_query=Mt+Fuji+live+camera&sp=EgJAAQ%253D%253D" },
  { label: "Japan Meteorological Agency: Yamanashi forecast", url: "https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=190000" },
];

type Load = { status: "loading" | "ok" | "error"; data?: ForecastResponse; fetchedAt?: number; stale?: boolean; error?: string };

export function FujiPlanner({ today = isoTodayLocal() }: { today?: string }) {
  const { state, dispatch } = useStore();
  const [ld, setLd] = useState<Load>({ status: "loading" });
  const [ask, setAsk] = useState<FujiDay | null>(null);
  const load = useCallback(async (force = false) => {
    setLd((s) => ({ ...s, status: "loading" }));
    try {
      const r = await fetchForecast([KAWAGUCHIKO], true, { force });
      setLd({ status: "ok", data: r.data[0], fetchedAt: r.fetchedAt, stale: r.stale });
    } catch (e) {
      setLd({ status: "error", error: (e as Error).message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const { from, to } = state.fujiWindow;
  const windowOk = from <= to && TRIP_DAYS.includes(from) && TRIP_DAYS.includes(to);
  const candidates = windowOk ? dateRange(from, to) : [];
  const ranking = useMemo(() => rankFujiDays(ld.status === "ok" ? ld.data! : null, candidates, today), [ld, from, to, today]); // eslint-disable-line
  const fujiItem = state.schedule.find((i) => i.activityId === "fuji-view");
  const horizonEnd = addDays(today, FORECAST_HORIZON_DAYS - 1);
  const anyInHorizon = candidates.some((d) => d >= today && d <= horizonEnd);
  const fuji = ACT_BY_ID["fuji-view"], para = ACT_BY_ID["paraglide"];

  const plan = ask && fujiItem ? planMove(state.schedule, fujiItem.uid, ask.date, "morning") : null;

  return (
    <section aria-labelledby="fuji-h">
      <h2 id="fuji-h" className="h2">Weather-smart Mt Fuji</h2>
      <div className="card hero"><ActivityPhoto a={fuji} /></div>
      <p>Mt Fuji is a <b>floating</b> day: compare dates and move it to the clearest one. This is <b>viewing from the foothills</b> (Fuji Five Lakes). Summit climbing is closed outside the summer season and is <b>not recommended in winter</b>.</p>

      <div className="form row">
        <label>From<input type="date" min={TRIP_DAYS[0]} max={TRIP_DAYS[TRIP_DAYS.length - 1]} value={from} onChange={(e) => dispatch({ type: "fujiWindow", from: e.target.value, to })} /></label>
        <label>To<input type="date" min={TRIP_DAYS[0]} max={TRIP_DAYS[TRIP_DAYS.length - 1]} value={to} onChange={(e) => dispatch({ type: "fujiWindow", from, to: e.target.value })} /></label>
        <button className="btn ghost sm" onClick={() => load(true)} disabled={ld.status === "loading"}>{ld.status === "loading" ? "Loading…" : "Refresh forecast"}</button>
      </div>
      {!windowOk && <p className="warn">Choose a date range inside the trip, with “From” on or before “To”.</p>}
      {fujiItem ? <p className="small">Currently planned: <b>{fmt(fujiItem.date, { dow: true })}</b>{fujiItem.booked ? " (marked booked)" : ""}.</p> : <p className="small warn">Mt Fuji isn't on the calendar. Add it from the Explorer first.</p>}

      {ld.status === "loading" && <div className="skeleton" aria-busy="true">Getting the Fuji Five Lakes forecast…</div>}
      {ld.status === "error" && <div className="note warn" role="alert"><b>Forecast not available.</b> {ld.error} No forecast is shown rather than a guess. <button className="btn sm" onClick={() => load(true)}>Try again</button></div>}
      {ld.status === "ok" && (
        <p className="small muted">Forecast retrieved {fmtDateTime(ld.fetchedAt!)} for Lake Kawaguchi (06:00–11:00 viewing window, Japan time){ld.stale ? <b className="warnc"> · saved copy, couldn't refresh</b> : ""}. Forecasts reach {FORECAST_HORIZON_DAYS} days ahead, to {fmt(horizonEnd)}.</p>
      )}

      {ld.status === "ok" && !anyInHorizon && windowOk && (
        <div className="note big">🔭 <b>Forecast not available yet.</b> Your dates are more than {FORECAST_HORIZON_DAYS} days away. Ranking starts on {fmt(addDays(from, -(FORECAST_HORIZON_DAYS - 1)))}; reopen this page then.</div>
      )}

      {ranking.best && (
        <div className="bestrow">
          <BestCard label="Best day" d={ranking.best} onMove={() => setAsk(ranking.best!)} current={fujiItem?.date} />
          {ranking.alternative && <BestCard label="Alternative" d={ranking.alternative} onMove={() => setAsk(ranking.alternative!)} current={fujiItem?.date} />}
        </div>
      )}

      {windowOk && (
        <div className="fujitable" role="table" aria-label="Date comparison">
          <div className="fr head" role="row"><span>Date</span><span>Score</span><span>Cloud</span><span>Rain/snow</span><span>Wind</span><span>Visibility</span><span>Roads</span><span>Confidence</span></div>
          {ranking.days.map((d) => (
            <div key={d.date} className={"fr" + (d.date === ranking.best?.date ? " best" : "") + (d.date === fujiItem?.date ? " cur" : "")} role="row">
              <span><b>{fmt(d.date, { dow: true })}</b></span>
              {d.available ? (<>
                <span><span className="bar"><i style={{ width: d.score + "%" }} /></span>{d.score}</span>
                <span>{d.cloud}%</span>
                <span>{d.precipProb}%{d.snowCm ? ` · ${d.snowCm}cm❄️` : ""}</span>
                <span>{d.gust} km/h</span>
                <span>{d.visibilityKm != null ? `${d.visibilityKm} km` : "proxy"}</span>
                <span className={"drv " + d.driving}>{d.driving}</span>
                <span>{d.confidence}</span>
              </>) : <span className="na">{d.reason}</span>}
            </div>
          ))}
        </div>
      )}

      <h3 className="h3">Live webcams</h3>
      <ul className="links col">{WEBCAMS.map((w) => <li key={w.url}><Ext className="lnk" href={w.url}>{w.label} ↗</Ext></li>)}</ul>

      <h3 className="h3">Paragliding (separate, adults only)</h3>
      <div className="note">
        <p><b>{para.title}</b>: {para.blurb}</p>
        <p className="small">Operator-dependent: they decide on the morning based on wind and visibility, and set weight limits. Weather backup for the same day: <b>Fuji-Q Highland</b> (indoor horror walk-through still runs in light rain) or the <b>Narusawa Ice Cave</b>.</p>
        <div className="links"><Ext className="lnk" href={para.booking.url}>{para.booking.label} ↗</Ext></div>
      </div>
      <WeatherAttribution />

      {ask && fujiItem && plan && (
        <Confirm title={`Move Mt Fuji to ${fmt(ask.date, { dow: true })}?`} confirmLabel="Move Mt Fuji" disabled={!plan.ok}
          onCancel={() => setAsk(null)}
          onConfirm={() => { dispatch({ type: "move", uid: fujiItem.uid, date: ask.date, slot: "morning", confirmed: true }); setAsk(null); }}>
          <p>From {fmt(fujiItem.date, { dow: true })} to {fmt(ask.date, { dow: true })} (score {ask.score}, {ask.confidence} confidence).</p>
          {fujiItem.booked && <p className="warn small">Mt Fuji is marked booked: update any tour or hotel booking yourself.</p>}
          {plan.blockedByBooked.length > 0 && <p className="warn">Can't move: {plan.blockedByBooked.map(itemTitle).join(", ")} is booked that day. Booked items are never overwritten.</p>}
          {plan.ok && plan.displaced.length > 0 && <p>These go back to Saved for later: {plan.displaced.map(itemTitle).join(", ")}.</p>}
          {plan.ok && !plan.displaced.length && <p>Nothing else is planned then.</p>}
          <p className="small muted">Your hotel reservations don't change. Check the Lake Kawaguchi overnight stop in Route if you planned one.</p>
        </Confirm>
      )}
    </section>
  );
}

function BestCard({ label, d, onMove, current }: { label: string; d: FujiDay; onMove: () => void; current?: string }) {
  return (
    <div className="best">
      <span className="small muted">{label}</span>
      <b className="big">{fmt(d.date, { dow: true })}</b>
      <span>Score {d.score}/100 · {d.confidence} confidence · roads {d.driving}</span>
      {d.notes.length > 0 && <ul className="small">{d.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {current === d.date ? <span className="badge verified">Already planned</span> : <button className="btn primary sm" onClick={onMove}>Move Mt Fuji to this date</button>}
    </div>
  );
}
