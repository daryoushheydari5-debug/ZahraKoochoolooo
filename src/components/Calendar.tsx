import { useMemo, useState, type ReactNode } from "react";
import { DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, pointerWithin, rectIntersection, type DragEndEvent, type CollisionDetection } from "@dnd-kit/core";
import { useStore, useRegionWeather } from "../state/hooks";
import { ACT_BY_ID } from "../data/activities";
import { CITY_COLORS } from "../data/trip";
import { SLOTS, TRIP_DAYS, cityOn, stayOn, travelOn, detectConflicts, planMove, itemTitle, cityLabel, slotIndex } from "../lib/schedule";
import { suggestSwaps } from "../lib/swaps";
import { isBadOutdoorDay, wxIcon } from "../lib/weather";
import { fmt, fmtDateTime, isoTodayLocal } from "../lib/dates";
import { Confirm, WeatherAttribution } from "./common";
import type { ScheduleItem, Slot, Track } from "../types";

/** Drop where the finger/pointer is, not where the (possibly wide) dragged chip overlaps. */
const collide: CollisionDetection = (args) => (args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args));

const SLOT_LABEL: Record<Slot, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const TRACK_LABEL: Record<Track, string> = { all: "All four", family: "Family", solo: "Darius solo" };

type Pending = { title: string; body: ReactNode; run: () => void; danger?: boolean; label?: string } | null;

export function Calendar() {
  const { state, dispatch } = useStore();
  const wx = useRegionWeather();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ date: string; slot: Slot; track: Track } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const conflicts = useMemo(() => detectConflicts(state.schedule, state.legs), [state.schedule, state.legs]);
  const conflictUids = new Set(conflicts.map((c) => c.uid));
  const swaps = useMemo(() => suggestSwaps(state.schedule, state.legs, wx.forActivity), [state.schedule, state.legs, wx.forActivity]);
  const today = isoTodayLocal();
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  /** Move with all safety rules: booked items are never overwritten; moving a booked item or displacing others needs confirmation. */
  function requestMove(uid: string, date: string, slot: Slot, track?: Track) {
    const it = state.schedule.find((i) => i.uid === uid);
    if (!it) return;
    const items = track ? state.schedule.map((i) => (i.uid === uid ? { ...i, track } : i)) : state.schedule;
    const plan = planMove(items, uid, date, slot);
    if (!plan.ok) { flash(plan.blockedByBooked.length ? `Can't move there: ${plan.blockedByBooked.map(itemTitle).join(", ")} is booked.` : plan.reason ?? "Can't move there."); return; }
    const go = () => dispatch({ type: "move", uid, date, slot, track, confirmed: true });
    if (it.booked || plan.displaced.length) {
      setPending({
        title: it.booked ? "Move a booked activity?" : "Replace what's there?",
        body: <>
          {it.booked && <p><b>{itemTitle(it)}</b> is marked booked. Moving it here won't change your real booking: contact the operator too.</p>}
          {plan.displaced.length > 0 && <p>These go back to your saved list: {plan.displaced.map(itemTitle).join(", ")}.</p>}
        </>,
        run: go, label: "Move",
      });
    } else go();
  }

  function onDragEnd(e: DragEndEvent) {
    const over = e.over?.id as string | undefined;
    if (!over?.startsWith("cell:")) return;
    const [date, slot, col] = over.slice(5).split("|") as [string, Slot, "left" | "solo"];
    const id = String(e.active.id);
    if (id.startsWith("tray:")) {
      const aid = id.slice(5);
      const act = ACT_BY_ID[aid];
      const track: Track = col === "solo" ? "solo" : act?.modes.includes("together") || act?.modes.includes("turns") ? "all" : "family";
      const clash = planMove([...state.schedule, { uid: "__new", activityId: aid, date, slot, span: act?.fullDay ? 3 : act?.slots ?? 1, track, booked: false }], "__new", date, slot);
      if (clash.blockedByBooked.length) { flash(`That time has a booked item (${clash.blockedByBooked.map(itemTitle).join(", ")}).`); return; }
      dispatch({ type: "schedule", activityId: aid, date, slot, track });
      if (clash.displaced.length) flash(`Added. It overlaps ${clash.displaced.map(itemTitle).join(", ")}: see clashes below.`);
    } else if (id.startsWith("item:")) {
      const uid = id.slice(5);
      const it = state.schedule.find((i) => i.uid === uid);
      if (!it) return;
      const track: Track = col === "solo" ? "solo" : it.track === "solo" ? "all" : it.track;
      if (it.date === date && it.slot === slot && it.track === track) return;
      requestMove(uid, date, slot, track !== it.track ? track : undefined);
    }
  }

  const editingItem = state.schedule.find((i) => i.uid === editing);

  return (
    <section aria-labelledby="cal-h">
      <h2 id="cal-h" className="h2">22-day planner</h2>
      <p className="muted">Drag activities between days and slots (press and hold on a phone), or tap one to edit it. Left column: everyone or the family; right column: Darius solo. Booked items are never moved or overwritten without asking.</p>
      <DndContext sensors={sensors} collisionDetection={collide} onDragEnd={onDragEnd}>
        <div className="tray" aria-label="Saved for later">
          <b>Saved for later</b>
          {state.saved.length === 0 && <span className="muted small">Nothing saved. Use “Save” on any activity.</span>}
          {state.saved.map((id) => ACT_BY_ID[id] && <TrayChip key={id} id={id} onRemove={() => dispatch({ type: "toggleSaved", id })} />)}
        </div>

        {wx.status === "loading" && <p className="note">Loading forecasts…</p>}
        {wx.status === "error" && <p className="note warn">Weather unavailable: {wx.error} Calendar still works; weather badges will appear when the forecast service can be reached. <button className="btn ghost sm" onClick={wx.reload}>Retry</button></p>}
        {wx.status === "ok" && <p className="note small">Forecast retrieved {fmtDateTime(wx.fetchedAt!)}{wx.stale ? " (saved copy: couldn't refresh)" : ""}. Days more than 16 days out show no weather: forecast not available yet.</p>}

        {swaps.length > 0 && (
          <div className="swaps" aria-live="polite">
            <h3>Weather swap ideas</h3>
            {swaps.map((s) => (
              <div key={s.uid} className="swap">
                <p><b>{s.title}</b> on {fmt(s.date, { dow: true })}: {s.why}.{s.booked && " It's booked, so check the operator's cancellation policy before changing anything."}</p>
                <div className="links">
                  {s.moveTo && !s.booked && <button className="btn sm" onClick={() => { const it = state.schedule.find((i) => i.uid === s.uid)!; requestMove(s.uid, s.moveTo!, it.slot); }}>Move to {fmt(s.moveTo, { dow: true })}</button>}
                  {s.indoorAlt?.map((id) => <button key={id} className="btn ghost sm" onClick={() => { if (!state.saved.includes(id)) dispatch({ type: "toggleSaved", id }); flash(`${ACT_BY_ID[id].title} added to Saved: drag it in.`); }}>Indoor idea: {ACT_BY_ID[id].title}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="days">
          {TRIP_DAYS.map((d) => {
            const city = cityOn(d, state.legs), stay = stayOn(d, state.legs), tr = travelOn(d, state.legs);
            const color = stay?.color ?? (city ? CITY_COLORS[city] : "#888");
            const dayWx = city ? wx.forRegion(d, city) : null;
            const items = state.schedule.filter((i) => i.date === d);
            return (
              <article key={d} className="day" style={{ ["--c" as string]: color }} id={"day-" + d}>
                <header>
                  <div><b>{fmt(d, { dow: true })}</b> <span className="muted">{stay ? stay.name : city ? cityLabel(city) : "No stay set"}</span></div>
                  {dayWx ? <span className="wx" title={`Max ${dayWx.tMax}°, min ${dayWx.tMin}°, ${dayWx.precipProb ?? "?"}% precip`}>{wxIcon(dayWx.code)} {Math.round(dayWx.tMax ?? 0)}°/{Math.round(dayWx.tMin ?? 0)}° · {dayWx.precipProb ?? "–"}%</span> : <span className="wx muted small">{d < today ? "" : "no forecast yet"}</span>}
                </header>
                {tr && <div className="travel">🚆 Travel day: {tr.from.name} → {tr.to.name}</div>}
                <div className="grid">
                  <div className="colh" style={{ gridColumn: 2 }}>Together / family</div>
                  <div className="colh" style={{ gridColumn: 3 }}>Darius solo</div>
                  {SLOTS.map((s, si) => (
                    <div key={s} className="slotlabel" style={{ gridRow: si + 2 }}>{SLOT_LABEL[s]}</div>
                  ))}
                  {SLOTS.map((s, si) => (["left", "solo"] as const).map((col, ci) => (
                    <Cell key={s + col} id={`cell:${d}|${s}|${col}`} row={si + 2} col={ci + 2} onAdd={() => setAdding({ date: d, slot: s, track: col === "solo" ? "solo" : "all" })} />
                  )))}
                  {items.map((i) => {
                    const act = i.activityId ? ACT_BY_ID[i.activityId] : undefined;
                    const w = act ? wx.forActivity(d, act.id) : null;
                    const bad = !!(act?.weatherSensitive && w && isBadOutdoorDay(w));
                    return <ItemChip key={i.uid} item={i} bad={bad} conflict={conflictUids.has(i.uid)} onOpen={() => setEditing(i.uid)} />;
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </DndContext>

      {conflicts.length > 0 && (
        <div className="problems-box">
          <h3>Clashes &amp; checks</h3>
          <ul className="problems">{conflicts.map((c, i) => <li key={i} className={c.level}>{c.level === "error" ? "⛔" : "⚠️"} {c.msg}</li>)}</ul>
        </div>
      )}
      <WeatherAttribution />

      {editingItem && <ItemEditor item={editingItem} onClose={() => setEditing(null)} onMove={(date, slot, track) => { setEditing(null); requestMove(editingItem.uid, date, slot, track !== editingItem.track ? track : undefined); }} />}
      {adding && <AddDialog at={adding} onClose={() => setAdding(null)} />}
      {pending && <Confirm title={pending.title} confirmLabel={pending.label} danger={pending.danger} onCancel={() => setPending(null)} onConfirm={() => { pending.run(); setPending(null); }}>{pending.body}</Confirm>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}

function Cell({ id, row, col, onAdd }: { id: string; row: number; col: number; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <button ref={setNodeRef} className={"cell" + (isOver ? " over" : "")} style={{ gridRow: row, gridColumn: col }} onClick={onAdd} aria-label="Add to this slot"><span>+</span></button>;
}

function TrayChip({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: "tray:" + id });
  const a = ACT_BY_ID[id];
  return (
    <span ref={setNodeRef} className={"traychip" + (isDragging ? " dragging" : "")} style={transform ? { transform: `translate(${transform.x}px,${transform.y}px)` } : undefined} {...listeners} {...attributes}>
      {a.weatherSensitive && "☂︎ "}{a.title}
      <button className="x" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove} aria-label={`Remove ${a.title} from saved`}>×</button>
    </span>
  );
}

function ItemChip({ item, bad, conflict, onOpen }: { item: ScheduleItem; bad: boolean; conflict: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: "item:" + item.uid });
  const act = item.activityId ? ACT_BY_ID[item.activityId] : undefined;
  const col = item.track === "all" ? "2 / 4" : item.track === "family" ? "2" : "3";
  return (
    <div
      ref={setNodeRef}
      className={`item t-${item.track}${item.booked ? " booked" : ""}${bad ? " bad" : ""}${conflict ? " conflict" : ""}${isDragging ? " dragging" : ""}`}
      style={{ gridRow: `${slotIndex(item.slot) + 2} / span ${item.span}`, gridColumn: col, transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined }}
      {...listeners} {...attributes}
      onClick={onOpen}
      role="button"
      aria-label={`${itemTitle(item)}, ${TRACK_LABEL[item.track]}${item.booked ? ", booked" : ""}. Tap to edit, or drag to move.`}
    >
      <b>{itemTitle(item)}</b>
      <span>{item.booked && "🔒 Booked · "}{act?.weatherSensitive && "☂︎ weather-sensitive · "}{TRACK_LABEL[item.track]}{bad && " · bad forecast"}</span>
    </div>
  );
}

function ItemEditor({ item, onClose, onMove }: { item: ScheduleItem; onClose: () => void; onMove: (d: string, s: Slot, t: Track) => void }) {
  const { dispatch } = useStore();
  const [date, setDate] = useState(item.date);
  const [slot, setSlot] = useState<Slot>(item.slot);
  const [track, setTrack] = useState<Track>(item.track);
  const act = item.activityId ? ACT_BY_ID[item.activityId] : undefined;
  const changed = date !== item.date || slot !== item.slot || track !== item.track;
  return (
    <Confirm title={itemTitle(item)} confirmLabel={changed ? "Move" : "Done"} onCancel={onClose} onConfirm={() => (changed ? onMove(date, slot, track) : onClose())}>
      {act && <p className="small muted">{act.duration} · {act.location.name}</p>}
      <div className="form">
        <label>Day<select value={date} onChange={(e) => setDate(e.target.value)}>{TRIP_DAYS.map((d) => <option key={d} value={d}>{fmt(d, { dow: true })}</option>)}</select></label>
        <label>Slot<select value={slot} onChange={(e) => setSlot(e.target.value as Slot)} disabled={item.span === 3}>{SLOTS.map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}</select></label>
        <label>Who<select value={track} onChange={(e) => setTrack(e.target.value as Track)}>{(["all", "family", "solo"] as Track[]).map((t) => <option key={t} value={t}>{TRACK_LABEL[t]}</option>)}</select></label>
        {item.span < 3 && <label>Length<select value={item.span} onChange={(e) => dispatch({ type: "setItem", uid: item.uid, patch: { span: +e.target.value } })}>{[1, 2, 3].filter((n) => slotIndex(item.slot) + n <= 3).map((n) => <option key={n} value={n}>{n} slot{n > 1 ? "s" : ""}</option>)}</select></label>}
      </div>
      <label className="check"><input type="checkbox" checked={item.booked} onChange={(e) => dispatch({ type: "setItem", uid: item.uid, patch: { booked: e.target.checked } })} /> Booked (protects it from automatic changes)</label>
      <button className="btn ghost sm" disabled={item.booked} onClick={() => { dispatch({ type: "unschedule", uid: item.uid }); onClose(); }}>{item.booked ? "Untick Booked to remove" : "Unschedule (keep in Saved)"}</button>
    </Confirm>
  );
}

function AddDialog({ at, onClose }: { at: { date: string; slot: Slot; track: Track }; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [choice, setChoice] = useState<string>(state.saved[0] ?? "");
  const [custom, setCustom] = useState("");
  const city = cityOn(at.date, state.legs);
  const options = Object.values(ACT_BY_ID).filter((a) => a.city === city).sort((a, b) => (state.saved.includes(b.id) ? 1 : 0) - (state.saved.includes(a.id) ? 1 : 0) || b.score - a.score);
  const ok = () => {
    if (custom.trim()) dispatch({ type: "schedule", title: custom.trim(), date: at.date, slot: at.slot, track: at.track });
    else if (choice) dispatch({ type: "schedule", activityId: choice, date: at.date, slot: at.slot, track: at.track });
    onClose();
  };
  return (
    <Confirm title={`Add to ${fmt(at.date, { dow: true })}, ${SLOT_LABEL[at.slot].toLowerCase()}`} confirmLabel="Add" onCancel={onClose} onConfirm={ok} disabled={!choice && !custom.trim()}>
      <div className="form">
        <label>Activity in {city ? cityLabel(city) : "this city"}<select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Choose…</option>
          {options.map((a) => <option key={a.id} value={a.id}>{state.saved.includes(a.id) ? "★ " : ""}{a.title}{a.fullDay ? " (full day)" : ""}</option>)}
        </select></label>
        <label>Or your own<input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Laundry + konbini run" /></label>
      </div>
    </Confirm>
  );
}
