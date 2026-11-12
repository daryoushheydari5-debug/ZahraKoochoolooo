import { useMemo, useState } from "react";
import { useStore } from "../state/hooks";
import { ALL_ACTIVITIES, SKIPPED } from "../data/activities";
import { CITY_COLORS, CITY_NAMES } from "../data/trip";
import { fmt } from "../lib/dates";
import { bookingNeed } from "../lib/transport";
import { ActivityPhoto } from "./common";
import { ActivityDetail, costText } from "./ActivityDetail";
import type { Activity, CityId } from "../types";

const TYPES: { id: string; label: string; tags: string[] }[] = [
  { id: "thrills", label: "🎢 Thrills & parks", tags: ["theme park", "adrenaline", "rides"] },
  { id: "hands", label: "🙌 Hands-on", tags: ["hands-on", "interactive", "food", "craft"] },
  { id: "animals", label: "🐧 Animals", tags: ["animals"] },
  { id: "snow", label: "❄️ Snow & hot springs", tags: ["snow", "onsen", "winter"] },
  { id: "night", label: "🌃 Night & lights", tags: ["night", "illumination", "neon"] },
  { id: "tech", label: "🤖 Tech, games & trains", tags: ["technology", "trains", "arcade"] },
];

/** Browse ideas with photos. Nothing goes on the plan until you press "Add to our plan". */
export function Explorer({ city: initialCity = "all" }: { city?: CityId | "all" }) {
  const { state } = useStore();
  const [city, setCity] = useState<CityId | "all">(initialCity);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [open, setOpen] = useState<{ a: Activity; add?: boolean } | null>(null);

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return ALL_ACTIVITIES
      .filter((a) => (city === "all" || a.city === city) && (type === "all" || TYPES.find((t) => t.id === type)!.tags.some((t) => a.tags.includes(t))) && (!ql || (a.title + a.blurb + a.tags.join(" ") + a.location.name).toLowerCase().includes(ql)))
      .sort((a, b) => b.score - a.score);
  }, [city, q, type]);

  return (
    <section aria-labelledby="ex-h">
      <h2 id="ex-h" className="h2">Explore</h2>
      <p className="muted">Tap a photo to see what it's like, how to get there and what to book. Press <b>Add to our plan</b> when you've decided.</p>
      <div className="filters">
        <div className="chips" role="group" aria-label="City">
          {(["all", "sha", "fuk", "osa", "tok"] as const).map((c) => (
            <button key={c} className="chip" aria-pressed={city === c} onClick={() => setCity(c)} style={c !== "all" ? { ["--c" as string]: CITY_COLORS[c] } : undefined}>
              {c !== "all" && <i className="dot" />}{c === "all" ? "Everywhere" : CITY_NAMES[c]}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Type">
          <button className="chip sm" aria-pressed={type === "all"} onClick={() => setType("all")}>All types</button>
          {TYPES.map((t) => <button key={t.id} className="chip sm" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>)}
        </div>
        <p className="small muted">{list.length} ideas</p>
        <input type="search" placeholder="Search, e.g. snow, onsen, robots…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activities" />
      </div>

      <div className="cards">
        {list.map((a) => {
          const on = state.schedule.filter((i) => i.activityId === a.id);
          return (
            <article key={a.id} className="card" style={{ ["--c" as string]: CITY_COLORS[a.city] }}>
              <button className="cardphoto" onClick={() => setOpen({ a })} aria-label={`See ${a.title}`}>
                <ActivityPhoto a={a}><span className="citytag">{a.region === a.city ? CITY_NAMES[a.city] : `Day trip · ${CITY_NAMES[a.city]}`}</span></ActivityPhoto>
              </button>
              <div className="body">
                <h3><button className="linkbtn strong" onClick={() => setOpen({ a })}>{a.title}</button></h3>
                <p className="small muted">{a.duration} · {costText(a)}{bookingNeed(a).ahead ? " · book ahead" : ""}{!a.family.together ? " · not for the baby" : ""}</p>
                <p>{a.blurb}</p>
                <div className="actions">
                  {on.length > 0 && <span className="pill ok">✓ On {on.map((i) => fmt(i.date, { dow: true })).join(", ")}</span>}
                  <button className="btn sm ghost" onClick={() => setOpen({ a })}>Details</button>
                  <button className="btn sm primary" onClick={() => setOpen({ a, add: true })}>{on.length ? "Add again" : "Add to our plan"}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <h3 className="h3">Didn't make the cut</h3>
      <ul className="cut">{SKIPPED.map(([t, why]) => <li key={t}><b>{t}</b>: {why}</li>)}</ul>
      {open && <ActivityDetail a={open.a} startAdding={open.add} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Used by the Parks and Road trips pages: opens the activity with the "add" form ready. */
export function AddToCalendar({ a, onClose }: { a: Activity; onClose: () => void }) {
  return <ActivityDetail a={a} startAdding onClose={onClose} />;
}
