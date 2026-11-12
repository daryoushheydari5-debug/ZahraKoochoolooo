import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/hooks";
import { CITY_NAMES, gmaps } from "../data/trip";
import { TRIP_DAYS, SLOTS, cityOn } from "../lib/schedule";
import { fmt } from "../lib/dates";
import { money } from "../lib/fx";
import { getThere, bookingNeed, hopsFor } from "../lib/transport";
import { ActivityPhoto, Ext } from "./common";
import type { Activity, ScheduleItem, Slot, Track } from "../types";

export const SLOT_NAME: Record<Slot, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
export const WHO: Record<Track, string> = { all: "Everyone", family: "Sister & husband", solo: "Darius" };

export const costText = (a: Activity) => (a.cost.amount == null ? "Free" : `${money(a.cost.amount, a.cost.currency)}${a.cost.basis === "per-adult" ? " each" : a.cost.basis === "per-group" ? " for the group" : ""}`);

/** One activity, full screen on a phone: photo, what you do, how to get there, what to book. */
export function ActivityDetail({ a, item, onClose, startAdding }: { a: Activity; item?: ScheduleItem; onClose: () => void; startAdding?: boolean }) {
  const { state, dispatch } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const [adding, setAdding] = useState(!!startAdding);
  useEffect(() => { const d = ref.current; if (d && !d.open && typeof d.showModal === "function") d.showModal(); }, []);
  const route = getThere(a, item?.date, state.legs, state.cars);
  const book = bookingNeed(a);

  return (
    <dialog ref={ref} className="sheet" onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="ad-title">
      <button className="sheetclose" onClick={onClose} aria-label="Close">×</button>
      <ActivityPhoto a={a} />
      <div className="sheetbody">
        <p className="eyebrow">{a.region === a.city ? CITY_NAMES[a.city] : `Day trip from ${CITY_NAMES[a.city]}`} · {a.duration} · {costText(a)}</p>
        <h3 id="ad-title">{a.title}</h3>
        {item && <p className="when">📅 {fmt(item.date, { dow: true })} · {a.fullDay ? "All day" : SLOT_NAME[item.slot]} · {WHO[item.track]}</p>}
        <p>{a.blurb}</p>

        <h4>What you'll do</h4>
        <ul className="ticks">{a.does.map((d) => <li key={d}>{d}</li>)}</ul>

        <div className="boxes">
          <section className="box">
            <h4>🧭 Getting there</h4>
            <p>{route.how}</p>
            <div className="links"><Ext className="btn sm ghost" href={route.url}>Directions ↗</Ext><Ext className="btn sm ghost" href={gmaps(a.location.query)}>Map ↗</Ext></div>
          </section>
          <section className={"box" + (book.ahead ? " hot" : "")}>
            <h4>{book.ahead ? "🎟️ Book ahead" : "🎟️ Tickets"}</h4>
            <p>{book.text}</p>
            <div className="links">
              <Ext className={"btn sm " + (book.ahead ? "primary" : "ghost")} href={a.booking.url}>{a.booking.label} ↗</Ext>
              {item && <label className="check"><input type="checkbox" checked={item.booked} onChange={(e) => dispatch({ type: "setItem", uid: item.uid, patch: { booked: e.target.checked } })} /> Booked</label>}
            </div>
          </section>
        </div>

        <p className="small muted">👶 {a.family.together ? "The baby can come." : "Not for the baby: take turns or split up."} {a.family.babyFacilities}{a.family.ageRule ? ` · ${a.family.ageRule}` : ""}</p>
        {a.tip && <p className="small">💡 {a.tip}</p>}

        <div className="sheetactions">
          {item ? (
            <>
              <MoveDay item={item} />
              <button className="btn ghost" disabled={item.booked} onClick={() => { dispatch({ type: "removeItem", uid: item.uid }); onClose(); }}>{item.booked ? "Untick Booked to remove" : "Remove from plan"}</button>
            </>
          ) : adding ? (
            <AddForm a={a} onDone={onClose} />
          ) : (
            <button className="btn primary" onClick={() => setAdding(true)}>Add to our plan</button>
          )}
        </div>
      </div>
    </dialog>
  );
}

function MoveDay({ item }: { item: ScheduleItem }) {
  const { dispatch } = useStore();
  return (
    <label className="inline">Day
      <select value={item.date} onChange={(e) => dispatch({ type: "setItem", uid: item.uid, patch: { date: e.target.value } })} disabled={item.booked}>
        {TRIP_DAYS.map((d) => <option key={d} value={d}>{fmt(d, { dow: true })}</option>)}
      </select>
    </label>
  );
}

/** Pick a day (days you're in the right city are listed first), a time and who's going. */
export function AddForm({ a, onDone }: { a: Activity; onDone: () => void }) {
  const { state, dispatch } = useStore();
  const fits = TRIP_DAYS.filter((d) => cityOn(d, state.legs) === a.city);
  // Suggest the first free, non-travel day in the right city.
  const travel = new Set(hopsFor(state.legs).map((h) => h.date));
  const free = fits.find((d) => !travel.has(d) && !state.schedule.some((i) => i.date === d)) ?? fits.find((d) => !travel.has(d));
  const [date, setDate] = useState(free ?? fits[0] ?? TRIP_DAYS[0]);
  const [slot, setSlot] = useState<Slot>(a.best?.[0] ?? "morning");
  const [track, setTrack] = useState<Track>(a.modes.includes("together") || a.modes.includes("turns") ? "all" : "solo");
  const others = TRIP_DAYS.filter((d) => !fits.includes(d));
  return (
    <div className="addform">
      <label>Day
        <select value={date} onChange={(e) => setDate(e.target.value)}>
          <optgroup label={`In ${CITY_NAMES[a.city]}`}>{fits.map((d) => <option key={d} value={d}>{fmt(d, { dow: true })}</option>)}</optgroup>
          <optgroup label="Other days">{others.map((d) => <option key={d} value={d}>{fmt(d, { dow: true })} ({cityOn(d, state.legs) ? CITY_NAMES[cityOn(d, state.legs)!] : "travel"})</option>)}</optgroup>
        </select>
      </label>
      {!a.fullDay && <label>Time<select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>{SLOTS.map((s) => <option key={s} value={s}>{SLOT_NAME[s]}</option>)}</select></label>}
      <label>Who<select value={track} onChange={(e) => setTrack(e.target.value as Track)}>{(["all", "solo", "family"] as Track[]).map((t) => <option key={t} value={t}>{WHO[t]}</option>)}</select></label>
      <button className="btn primary" onClick={() => { dispatch({ type: "schedule", activityId: a.id, date, slot, track }); onDone(); }}>Add to {fmt(date, { dow: true })}</button>
    </div>
  );
}
