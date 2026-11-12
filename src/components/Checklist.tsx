import { useState, type ReactNode } from "react";
import { useStore } from "../state/hooks";
import { ACT_BY_ID } from "../data/activities";
import { CITY_NAMES, bookingSearchUrl } from "../data/trip";
import { fmt, diffDays, addDays } from "../lib/dates";
import { money } from "../lib/fx";
import { hopsFor, bookingNeed } from "../lib/transport";
import { ActivityDetail, costText } from "./ActivityDetail";
import { Ext, Thumb } from "./common";
import { HotelForm } from "./Hotels";
import type { Activity, ScheduleItem } from "../types";

const google = (q: string) => "https://www.google.com/search?q=" + encodeURIComponent(q);

interface Row { button?: { label: string; onClick: () => void }; id: string; when: string; what: ReactNode; detail: ReactNode; cost: string; link?: { label: string; url: string }; done: boolean; toggle: () => void; thumb?: Activity; open?: () => void }

/** Everything to sort before the trip, like a quote: one line each, ticked off as it's done. */
export function Checklist({ goExplore }: { goExplore: () => void }) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState<ScheduleItem | null>(null);
  const [hotelFor, setHotelFor] = useState<string | null>(null);
  const done = state.done ?? {};
  const tick = (id: string) => () => dispatch({ type: "toggleDone", id });

  const travel: Row[] = hopsFor(state.legs).map((h) => ({
    id: h.id, when: fmt(h.date, { dow: true }), what: <>{h.icon} {h.title}</>, detail: <>{h.how}.{h.tip && <span className="muted"> {h.tip}</span>}</>, cost: h.cost,
    link: { label: h.bookLabel, url: h.bookUrl }, done: !!done[h.id], toggle: tick(h.id),
  }));

  const stays: Row[] = [...state.legs].sort((a, b) => a.arrive.localeCompare(b.arrive)).map((l) => {
    const n = diffDays(l.arrive, l.depart);
    return {
      id: l.id, when: `${fmt(l.arrive)} – ${fmt(l.depart)}`, what: <>🛏️ {l.stay?.name ?? `${l.city !== "stop" ? CITY_NAMES[l.city] : l.name}: no hotel added yet`}</>,
      detail: <>{l.city !== "stop" ? CITY_NAMES[l.city] : l.name} · {n} night{n === 1 ? "" : "s"}{l.stay?.ref && <> · Confirmation {l.stay.ref}</>}{l.stay?.area && <span className="muted"> · {l.stay.area}</span>}</>,
      cost: l.stay?.cost ? money(l.stay.cost.amount, l.stay.cost.currency) : "",
      link: l.stay ? { label: l.stay.bookingLabel, url: l.stay.bookingUrl } : { label: "Search hotels", url: bookingSearchUrl(l.city !== "stop" ? CITY_NAMES[l.city] : l.name, l.arrive, l.depart) },
      button: { label: l.stay ? "Edit" : "Add our hotel", onClick: () => setHotelFor(l.id) },
      done: l.stayBooked, toggle: () => dispatch({ type: "setLeg", id: l.id, patch: { stayBooked: !l.stayBooked } }),
    };
  });

  const cars: Row[] = state.cars.map((c) => ({
    id: c.id, when: `${fmt(c.pickup)} – ${fmt(addDays(c.pickup, c.days))}`, what: <>🚗 {c.label}</>, detail: <>Ask for a child seat (required by law for under-6s) and an ETC card for tolls. Pick up near {CITY_NAMES[c.city]} Station.</>,
    cost: `About ¥${((c.dailyJpy + c.childSeatJpyPerDay) * c.days).toLocaleString("en-AU")} + fuel and tolls`, link: { label: "Toyota Rent a Car", url: "https://rent.toyota.co.jp/eng/" }, done: !!done[c.id], toggle: tick(c.id),
  }));

  const docs: Row[] = [
    { id: "doc-china", when: "Before 20 Dec", what: "🛂 China entry check", detail: "Confirm the current entry rules for Australian passports (visa-free short stays have applied recently, but check before you fly).", cost: "", link: { label: "Smartraveller: China", url: "https://www.smartraveller.gov.au/destinations/asia/china" } },
    { id: "doc-pay", when: "Before 20 Dec", what: "📱 Alipay or WeChat Pay", detail: "Link a card before you leave. Most places in Shanghai expect phone payment; DiDi taxis work through Alipay too.", cost: "Free", link: { label: "How to set it up", url: google("Alipay set up for foreign visitors international card") } },
    { id: "doc-idp", when: "Before 23 Dec", what: "🪪 International Driving Permit", detail: "Each person who will drive in Japan needs one (1949 convention) plus their Australian licence.", cost: "About A$50 each", link: { label: "Where to get one", url: google("International Driving Permit Australia apply") } },
    { id: "doc-vjw", when: "Before 23 Dec", what: "🇯🇵 Visit Japan Web", detail: "Register passports and get the QR codes for immigration and customs at Fukuoka Airport.", cost: "Free", link: { label: "Visit Japan Web", url: "https://www.vjw.digital.go.jp/" } },
    { id: "doc-ins", when: "Before you fly", what: "🩺 Travel insurance", detail: "Make sure it covers the baby, China and Japan, and skiing or snow days.", cost: "", link: { label: "Smartraveller: insurance", url: "https://www.smartraveller.gov.au/before-you-go/insurance" } },
  ].map((r) => ({ ...r, done: !!done[r.id], toggle: tick(r.id) }));

  const picked = state.schedule.filter((i) => i.activityId && ACT_BY_ID[i.activityId]).sort((a, b) => a.date.localeCompare(b.date));
  const actRow = (i: ScheduleItem): Row => {
    const a = ACT_BY_ID[i.activityId!];
    return { id: i.uid, when: fmt(i.date, { dow: true }), what: a.title, detail: bookingNeed(a).text, cost: costText(a), link: a.booking, done: i.booked, toggle: () => dispatch({ type: "setItem", uid: i.uid, patch: { booked: !i.booked } }), thumb: a, open: () => setOpen(i) };
  };
  const ahead = picked.filter((i) => bookingNeed(ACT_BY_ID[i.activityId!]).ahead).map(actRow);
  const onDay = picked.filter((i) => !bookingNeed(ACT_BY_ID[i.activityId!]).ahead).map(actRow);

  const all = [...travel, ...stays, ...cars, ...docs, ...ahead];
  const n = all.filter((r) => r.done).length;
  const openNow = open && state.schedule.find((i) => i.uid === open.uid);

  return (
    <section aria-labelledby="bk-h">
      <h2 id="bk-h" className="h2">What to book</h2>
      <div className="progress" role="status">
        <div><b>{n} of {all.length}</b> sorted</div>
        <div className="bar"><i style={{ width: `${all.length ? (n / all.length) * 100 : 0}%` }} /></div>
      </div>

      <Table title="Getting between cities" note="The best way for each big move. Prices are typical, not quotes." rows={travel} />
      <Table title="Where we sleep" rows={stays} />
      {cars.length > 0 && <Table title="Car hire" rows={cars} />}
      <Table title="Before we go" rows={docs} />
      <Table title="Activities to book ahead" rows={ahead} empty={<>Nothing yet. Activities you add from <button className="linkbtn" onClick={goExplore}>Explore</button> that need tickets show up here.</>} />
      {onDay.length > 0 && <Table title="Pay on the day (no booking needed)" rows={onDay} noTick />}
      {hotelFor && state.legs.find((l) => l.id === hotelFor) && <HotelForm leg={state.legs.find((l) => l.id === hotelFor)!} onClose={() => setHotelFor(null)} />}
      {openNow?.activityId && <ActivityDetail a={ACT_BY_ID[openNow.activityId]} item={openNow} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Table({ title, note, rows, empty, noTick }: { title: string; note?: string; rows: Row[]; empty?: ReactNode; noTick?: boolean }) {
  const n = rows.filter((r) => r.done).length;
  return (
    <div className="ledger">
      <div className="ledgerhead"><h3>{title}</h3>{rows.length > 0 && !noTick && <span className="small muted">{n}/{rows.length} done</span>}</div>
      {note && <p className="small muted">{note}</p>}
      {rows.length === 0 ? <p className="small muted ledgerempty">{empty}</p> : (
        <ul className="lines">
          {rows.map((r) => (
            <li key={r.id} className={"line" + (r.done ? " isdone" : "")}>
              {!noTick && <label className="tick"><input type="checkbox" checked={r.done} onChange={r.toggle} aria-label={`Done: ${typeof r.what === "string" ? r.what : r.id}`} /></label>}
              {r.thumb && <button className="linethumb" onClick={r.open} aria-label="Open details"><Thumb a={r.thumb} /></button>}
              <div className="linemain">
                <div className="linetop"><b>{r.open ? <button className="linkbtn strong" onClick={r.open}>{r.what}</button> : r.what}</b><span className="when">{r.when}</span></div>
                <p className="small">{r.detail}</p>
              </div>
              <div className="lineside">
                {r.cost && <span className="cost">{r.cost}</span>}
                {r.button && <button className="btn sm ghost" onClick={r.button.onClick}>{r.button.label}</button>}
                {r.link && <Ext className={"btn sm " + (r.done ? "ghost" : "primary")} href={r.link.url}>{r.link.label} ↗</Ext>}
                <span className={"pill " + (r.done ? "ok" : noTick ? "" : "todo")}>{r.done ? "Done" : noTick ? "On the day" : "To do"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
