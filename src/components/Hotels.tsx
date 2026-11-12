import { useState } from "react";
import { useStore } from "../state/hooks";
import { CITY_NAMES, CITY_POS, gmaps } from "../data/trip";
import { fmt } from "../lib/dates";
import { Confirm } from "./common";
import type { Currency, Leg, Stay } from "../types";

/** Add or edit the hotel the group actually booked for one stop. */
export function HotelForm({ leg, onClose }: { leg: Leg; onClose: () => void }) {
  const { dispatch } = useStore();
  const s = leg.stay;
  const [f, setF] = useState({
    name: s?.name ?? "", address: s?.mapsQuery && s.mapsQuery !== s.name ? s.mapsQuery : "", amount: s?.cost ? String(s.cost.amount) : "",
    currency: (s?.cost?.currency ?? "AUD") as Currency, link: s?.bookingUrl && !s.bookingUrl.startsWith("https://www.google.com/maps") ? s.bookingUrl : "", ref: s?.ref ?? "",
    split: s?.split ?? "halves", booked: s ? leg.stayBooked : true,
  });
  const city = leg.city === "stop" ? leg.name : CITY_NAMES[leg.city];
  const ok = f.name.trim().length > 0;
  const save = () => {
    const amount = parseFloat(f.amount);
    const q = f.address.trim() || `${f.name.trim()}, ${city}`;
    const stay: Stay = {
      id: "own-" + leg.id, name: f.name.trim(), area: f.address.trim(), pos: leg.city !== "stop" ? CITY_POS[leg.city] : s?.pos ?? CITY_POS.tok, posExact: false,
      bookingUrl: f.link.trim() || gmaps(q), bookingLabel: f.link.trim() ? "Booking" : "Map", mapsQuery: q,
      cost: Number.isFinite(amount) && amount > 0 ? { amount, currency: f.currency } : undefined, split: f.split as Stay["split"], ref: f.ref.trim() || undefined,
    };
    dispatch({ type: "setLeg", id: leg.id, patch: { stay, stayBooked: f.booked } });
    onClose();
  };
  return (
    <Confirm title={`${s ? "Edit" : "Add"} hotel · ${city}`} confirmLabel="Save" disabled={!ok} onCancel={onClose} onConfirm={save}>
      <p className="small muted">{fmt(leg.arrive, { dow: true })} → {fmt(leg.depart, { dow: true })}</p>
      <div className="form">
        <label>Hotel name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Hotel Gracery Shinjuku" autoFocus /></label>
        <label>Address (for directions)<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Optional" /></label>
        <label>Total price<input type="number" min={0} step="any" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="Optional" /></label>
        <label>Currency<select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as Currency })}>{(["AUD", "JPY", "CNY"] as Currency[]).map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Who pays<select value={f.split} onChange={(e) => setF({ ...f, split: e.target.value as "halves" | "thirds" })}><option value="halves">Half Darius, half Zaynab & Ruhullah</option><option value="thirds">Split three ways</option></select></label>
        <label>Booking link<input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="Optional" /></label>
        <label>Confirmation number<input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} placeholder="Optional" /></label>
      </div>
      <label className="check"><input type="checkbox" checked={f.booked} onChange={(e) => setF({ ...f, booked: e.target.checked })} /> Already booked</label>
      {s && <p><button className="linkbtn" onClick={() => { dispatch({ type: "setLeg", id: leg.id, patch: { stay: undefined, stayBooked: false } }); onClose(); }}>Remove this hotel</button></p>}
    </Confirm>
  );
}
