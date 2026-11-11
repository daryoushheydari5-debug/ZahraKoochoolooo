import { useMemo, useState } from "react";
import { useStore, useRates } from "../state/hooks";
import { ALL_ACTIVITIES, SKIPPED } from "../data/activities";
import { CITY_COLORS, CITY_NAMES, gmaps } from "../data/trip";
import { TRIP_DAYS, SLOTS, cityOn } from "../lib/schedule";
import { convert, money } from "../lib/fx";
import { fmt } from "../lib/dates";
import { ActivityPhoto, Confirm, Ext, Score } from "./common";
import type { Activity, CityId, GroupMode, Slot, Track } from "../types";

const MODE_LABEL: Record<GroupMode, string> = { together: "All four together", solo: "Solo", turns: "Adults taking turns", split: "Split group" };
const WEATHER_LABEL = { indoor: "Indoor: any weather", outdoor: "Outdoor: needs decent weather", mixed: "Indoor + outdoor" };
type Sort = "ours" | "score" | "cost" | "favs";

export function Explorer() {
  const { state, dispatch } = useStore();
  const { rates } = useRates(state.manualRates);
  const [city, setCity] = useState<CityId | "all">("all");
  const [mode, setMode] = useState<GroupMode | "any">("any");
  const [wx, setWx] = useState<"any" | "indoor" | "outdoor">("any");
  const [sort, setSort] = useState<Sort>("ours");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<Activity | null>(null);

  const scheduledIds = new Set(state.schedule.map((s) => s.activityId));
  const ourScore = (a: Activity) => a.score + (state.favs.includes(a.id) ? 8 : 0) + ({ in: 10, maybe: 3, nah: -30 }[state.votes[a.id] ?? ""] ?? 0);
  const aud = (a: Activity) => (a.cost.amount == null ? 0 : rates ? convert(a.cost.amount, a.cost.currency, "AUD", rates) : a.cost.amount);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const xs = ALL_ACTIVITIES.filter((a) =>
      (city === "all" || a.city === city) && (mode === "any" || a.modes.includes(mode)) &&
      (wx === "any" || (wx === "indoor" ? a.weather === "indoor" : a.weather !== "indoor")) &&
      (!ql || (a.title + a.blurb + a.tags.join(" ") + a.location.name).toLowerCase().includes(ql)));
    const by: Record<Sort, (a: Activity, b: Activity) => number> = {
      ours: (a, b) => ourScore(b) - ourScore(a),
      score: (a, b) => b.score - a.score,
      cost: (a, b) => aud(a) - aud(b),
      favs: (a, b) => Number(state.favs.includes(b.id)) - Number(state.favs.includes(a.id)) || b.score - a.score,
    };
    return xs.sort(by[sort]);
  }, [city, mode, wx, sort, q, state.favs, state.votes, rates]); // eslint-disable-line

  return (
    <section aria-labelledby="ex-h">
      <h2 id="ex-h" className="h2">Activity explorer</h2>
      <div className="filters">
        <div className="chips" role="group" aria-label="City">
          {(["all", "sha", "fuk", "osa", "tok"] as const).map((c) => (
            <button key={c} className="chip" aria-pressed={city === c} onClick={() => setCity(c)} style={c !== "all" ? { ["--c" as string]: CITY_COLORS[c] } : undefined}>
              {c !== "all" && <i className="dot" />}{c === "all" ? "Everywhere" : CITY_NAMES[c] + (c === "tok" ? " + trips" : c === "fuk" ? " + Kyushu" : "")}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Who">
          {(["any", "together", "solo", "turns", "split"] as const).map((m) => <button key={m} className="chip" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === "any" ? "Anyone" : MODE_LABEL[m]}</button>)}
        </div>
        <div className="row">
          <select aria-label="Weather" value={wx} onChange={(e) => setWx(e.target.value as typeof wx)}><option value="any">Any weather</option><option value="indoor">Indoor only</option><option value="outdoor">Outdoor</option></select>
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="ours">Our ranking (votes + ♥)</option><option value="score">Suitability score</option><option value="cost">Cheapest first</option><option value="favs">Favourites first</option></select>
          <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activities" />
        </div>
        <p className="small muted">{list.length} activities · {Object.values(state.votes).filter((v) => v === "in").length} we're in · {state.favs.length} ♥</p>
      </div>

      <div className="cards">
        {list.map((a, i) => {
          const fav = state.favs.includes(a.id), saved = state.saved.includes(a.id), sched = scheduledIds.has(a.id), v = state.votes[a.id];
          return (
            <article key={a.id} className="card" style={{ ["--c" as string]: CITY_COLORS[a.city] }}>
              <ActivityPhoto a={a}>
                <span className="rank">#{i + 1}</span>
                <span className="citytag">{a.region === a.city ? CITY_NAMES[a.city] : a.location.name.split(" ").slice(0, 3).join(" ")}</span>
                {v && <span className={"stamp " + v}>{{ in: "WE'RE IN", maybe: "MAYBE", nah: "NAH" }[v]}</span>}
              </ActivityPhoto>
              <div className="body">
                <div className="titlerow"><h3>{a.title}</h3><Score n={a.score} /></div>
                <div className="tags">{a.modes.map((m) => <span key={m} className="tag">{MODE_LABEL[m]}</span>)}{a.fullDay && <span className="tag strong">Full day</span>}{a.adultOnly && <span className="tag warnc">Adults only</span>}{a.flexible && <span className="tag">Flexible date</span>}</div>
                <p>{a.blurb}</p>
                <dl className="facts">
                  <dt>Where</dt><dd><Ext href={gmaps(a.location.query)}>{a.location.name} ↗</Ext></dd>
                  <dt>Time</dt><dd>{a.duration}</dd>
                  <dt>Cost</dt><dd>{a.cost.amount == null ? "Free" : money(a.cost.amount, a.cost.currency)} {a.cost.basis !== "free" && <span className="muted">{a.cost.basis.replace("-", " ")}</span>}{a.cost.amount != null && a.cost.currency !== "AUD" && rates && <span className="muted"> ≈ {money(aud(a), "AUD")}</span>} <span className={"badge " + a.cost.status}>{a.cost.status}</span>{a.cost.note && <div className="small muted">{a.cost.note}</div>}</dd>
                  <dt>Weather</dt><dd>{WEATHER_LABEL[a.weather]}{a.weatherSensitive && " ☂︎"}</dd>
                  <dt>Baby</dt><dd>{a.family.together ? "Can come along" : "Not suitable: split up or take turns"} · Stroller: {a.family.stroller} · Carrier: {a.family.carrier}<div className="small muted">{a.family.babyFacilities}{a.family.ageRule && ` · ${a.family.ageRule}`}</div></dd>
                </dl>
                <details><summary>What it involves</summary><ol>{a.does.map((d) => <li key={d}>{d}</li>)}</ol>{a.tip && <p className="tip">{a.tip}</p>}</details>
                <div className="links">
                  <Ext className="lnk" href={a.booking.url}>{a.booking.label} ↗</Ext>
                  <Ext className="lnk" href={a.source.url}>Source: {a.source.label} ↗</Ext>
                </div>
                <div className="vote" role="group" aria-label="Vote">
                  {(["in", "maybe", "nah"] as const).map((x) => <button key={x} data-v={x} aria-pressed={v === x} onClick={() => dispatch({ type: "vote", id: a.id, v: v === x ? null : x })}>{{ in: "We're in", maybe: "Maybe", nah: "Nah" }[x]}</button>)}
                </div>
                <div className="actions">
                  <button className={"btn sm" + (fav ? " on" : " ghost")} aria-pressed={fav} onClick={() => dispatch({ type: "toggleFav", id: a.id })}>{fav ? "♥ Favourite" : "♡ Favourite"}</button>
                  <button className={"btn sm" + (saved ? " on" : " ghost")} aria-pressed={saved} onClick={() => dispatch({ type: "toggleSaved", id: a.id })} disabled={sched && !saved}>{saved ? "✓ Saved" : "Save for later"}</button>
                  <button className="btn sm primary" onClick={() => setAdding(a)}>{sched ? "Add again" : "Add to calendar"}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <h3 className="h3">Didn't make the cut</h3>
      <ul className="cut">{SKIPPED.map(([t, why]) => <li key={t}><b>{t}</b>: {why}</li>)}</ul>
      {adding && <AddToCalendar a={adding} onClose={() => setAdding(null)} />}
    </section>
  );
}

export function AddToCalendar({ a, onClose, defaultDate }: { a: Activity; onClose: () => void; defaultDate?: string }) {
  const { state, dispatch } = useStore();
  const first = defaultDate ?? TRIP_DAYS.find((d) => cityOn(d, state.legs) === a.city) ?? TRIP_DAYS[0];
  const [date, setDate] = useState(first);
  const [slot, setSlot] = useState<Slot>("morning");
  const [track, setTrack] = useState<Track>(a.modes.includes("together") || a.modes.includes("turns") ? "all" : a.modes.includes("solo") ? "solo" : "family");
  const wrongCity = cityOn(date, state.legs) !== a.city;
  return (
    <Confirm title={`Add ${a.title}`} confirmLabel="Add" onCancel={onClose} onConfirm={() => { dispatch({ type: "schedule", activityId: a.id, date, slot, track }); onClose(); }}>
      <div className="form">
        <label>Day<select value={date} onChange={(e) => setDate(e.target.value)}>{TRIP_DAYS.map((d) => <option key={d} value={d}>{fmt(d, { dow: true })}{cityOn(d, state.legs) === a.city ? " ✓" : ""}</option>)}</select></label>
        {!a.fullDay && <label>Slot<select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>{SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>}
        <label>Who<select value={track} onChange={(e) => setTrack(e.target.value as Track)}><option value="all">All four</option><option value="family">Family</option><option value="solo">Darius solo</option></select></label>
      </div>
      {wrongCity && <p className="warn small">You aren't based near here on that day (✓ marks days that fit).</p>}
      {a.adultOnly && track === "all" && <p className="warn small">Adults only: choose solo or plan turns.</p>}
    </Confirm>
  );
}
