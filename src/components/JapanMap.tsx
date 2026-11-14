import { useMemo, useRef, useState } from "react";
import { PLACES, KIND_COLOR, KIND_LABEL, type Place, type PlaceKind } from "../data/places";
import { ACT_BY_ID } from "../data/activities";
import { CITY_COLORS, CITY_NAMES, CITY_POS, gmaps } from "../data/trip";
import type { CityId } from "../types";
import { ActivityPhoto, Ext, MapView, type Pin } from "./common";
import { ActivityDetail } from "./ActivityDetail";

const BASES: CityId[] = ["sha", "fuk", "osa", "tok"];
const KINDS: PlaceKind[] = ["town", "village", "nature"];
const KIND_ICON: Record<PlaceKind, string> = { town: "🏮", village: "🛖", nature: "🏔️" };

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371, r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
};

/** A map of towns, villages and landscapes within reach of each place we're staying. */
export function JapanMap() {
  const [base, setBase] = useState<CityId | "japan" | "all">("japan");
  const [kind, setKind] = useState<PlaceKind | "all">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const cards = useRef<Record<string, HTMLElement | null>>({});

  const list = useMemo(() => PLACES.filter((p) => (base === "all" || (base === "japan" ? p.base !== "sha" : p.base === base)) && (kind === "all" || p.kind === kind)), [base, kind]);

  const pins: Pin[] = useMemo(() => {
    const bases = BASES.filter((b) => base === "all" || (base === "japan" ? b !== "sha" : b === base));
    return [
      ...bases.map((b) => ({ pos: CITY_POS[b], label: `${CITY_NAMES[b]} (where we stay)`, color: CITY_COLORS[b], big: true })),
      ...list.map((p) => ({
        pos: { lat: p.lat, lon: p.lon }, label: `${KIND_ICON[p.kind]} ${p.name}`, sub: p.from, color: KIND_COLOR[p.kind],
        onClick: () => { setSel(p.id); cards.current[p.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" }); },
      })),
    ];
  }, [list, base]);

  const act = open ? ACT_BY_ID[open] : null;

  return (
    <section aria-labelledby="map-h" className="placemap">
      <h2 id="map-h" className="h2">Map of Japan</h2>
      <p className="muted">Towns, villages and wild places within a day out of where we're staying. Tap a pin to jump to its card.</p>

      <div className="filters">
        <div className="chips" role="group" aria-label="Area">
          <button className="chip" aria-pressed={base === "japan"} onClick={() => setBase("japan")}>🗾 All Japan</button>
          {BASES.map((b) => (
            <button key={b} className="chip" aria-pressed={base === b} onClick={() => setBase(b)} style={{ ["--c" as string]: CITY_COLORS[b] }}>
              <i className="dot" />Near {CITY_NAMES[b]}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Kind">
          <button className="chip sm" aria-pressed={kind === "all"} onClick={() => setKind("all")}>Everything</button>
          {KINDS.map((k) => (
            <button key={k} className="chip sm" aria-pressed={kind === k} onClick={() => setKind(k)}>
              <i className="dot" style={{ ["--c" as string]: KIND_COLOR[k] }} />{k === "nature" ? "Nature & landscapes" : KIND_LABEL[k] + "s"}
            </button>
          ))}
        </div>
      </div>

      <MapView pins={pins} height="min(62vh, 520px)" />
      <p className="small muted maplegend">
        {KINDS.map((k) => <span key={k}><i className="dot" style={{ ["--c" as string]: KIND_COLOR[k] }} /> {KIND_LABEL[k]}</span>)}
        <span><i className="dot big" style={{ ["--c" as string]: "#22e4ff" }} /> Where we stay</span>
        <span>{list.length} places</span>
      </p>

      <div className="cards">
        {list.map((p) => <PlaceCard key={p.id} p={p} hi={sel === p.id} refFn={(el) => { cards.current[p.id] = el; }} onActivity={setOpen} />)}
      </div>

      {act && <ActivityDetail a={act} onClose={() => setOpen(null)} />}
    </section>
  );
}

function PlaceCard({ p, hi, refFn, onActivity }: { p: Place; hi: boolean; refFn: (el: HTMLElement | null) => void; onActivity: (id: string) => void }) {
  const a = p.activity ? ACT_BY_ID[p.activity] : undefined;
  const dist = km(CITY_POS[p.base], p);
  return (
    <article ref={refFn} className={"card place" + (hi ? " hi" : "")} style={{ ["--c" as string]: KIND_COLOR[p.kind] }}>
      <ActivityPhoto a={{ id: p.id, title: p.name, photoQuery: p.photoQuery, scene: p.scene }}>
        <span className="citytag">{KIND_ICON[p.kind]} {KIND_LABEL[p.kind]}</span>
      </ActivityPhoto>
      <div className="body">
        <h3>{p.name}</h3>
        <p className="small muted">📍 {dist} km from {CITY_NAMES[p.base]} · {p.from}</p>
        <p>{p.blurb}</p>
        {p.winter && <p className="small">❄️ {p.winter}</p>}
        <div className="actions">
          <Ext className="btn sm ghost" href={gmaps(`${p.name}, ${p.base === "sha" ? "China" : "Japan"}`)}>Map ↗</Ext>
          {a && <button className="btn sm primary" onClick={() => onActivity(a.id)}>See "{a.title}"</button>}
        </div>
      </div>
    </article>
  );
}
