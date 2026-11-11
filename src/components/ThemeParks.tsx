import { useState } from "react";
import { useStore, useRegionWeather } from "../state/hooks";
import { ACT_BY_ID } from "../data/activities";
import { CITY_COLORS } from "../data/trip";
import { TRIP_DAYS, cityOn, planMove, itemTitle } from "../lib/schedule";
import { fmt } from "../lib/dates";
import { wxIcon } from "../lib/weather";
import { ActivityPhoto, Confirm, Ext } from "./common";
import { AddToCalendar } from "./Explorer";

interface ParkInfo {
  id: "usj" | "tdl";
  rows: [string, string][];
  links: [string, string][];
  checked: string;
}

const PARKS: ParkInfo[] = [
  {
    id: "usj",
    checked: "Height rules from a USJ guide updated Sept 2026; prices and Area Timed Entry are set per day by USJ, so confirm on the official site.",
    rows: [
      ["Super Nintendo World", "Mario Kart: Koopa's Challenge and Yoshi's Adventure, Power-Up Band games, Donkey Kong Country with Mine-Cart Madness. On busy days entry to the area needs a free Area Timed Entry ticket from the USJ app, or an Express Pass that includes it."],
      ["Thrill rides (adults)", "The Flying Dinosaur (132 cm+), Hollywood Dream (132 cm+), Harry Potter and the Forbidden Journey (122 cm+), Jurassic Park (107 cm with an adult)."],
      ["For the 1-year-old", "No-height-limit rides need the child to sit up unaided: Hello Kitty's Cupcake Dream, JAWS, Minion Mission. Plus shows and Sesame Street / Snoopy areas."],
      ["Child Switch", "When a child is too small for a ride, the adults queue once and take turns: tell the crew at the entrance of an eligible ride."],
      ["Tickets", "Dated 1-Day Studio Pass, price varies by date. Ages 3 and under free (child pricing 4–11). Buy only from the official site or app; Express Passes sell out over the holidays."],
      ["Entry", "Bag check at the gate. Keep passports for Express Pass name checks if asked."],
      ["Baby facilities", "Baby care rooms with changing tables and nursing space; stroller rental near the entrance."],
    ],
    links: [["Official tickets", "https://www.usj.co.jp/web/en/us/tickets"], ["Park calendar & hours", "https://www.usj.co.jp/web/en/us/park-guide/schedule"], ["Attractions & height limits", "https://www.usj.co.jp/web/en/us/attractions"], ["Express Pass", "https://www.usj.co.jp/web/en/us/tickets/express-pass"]],
  },
  {
    id: "tdl",
    checked: "Ticket rules checked on the official Tokyo Disney Resort ticket page on 11 Nov 2026.",
    rows: [
      ["Family attractions", "Pooh's Hunny Hunt, It's a Small World, the Beauty and the Beast ride, Jungle Cruise, Toontown, parades and the night-time castle projection."],
      ["Rider Switch", "On height-restricted rides (Space Mountain, Splash Mountain, Big Thunder) one adult rides while the other waits with the baby, then swaps without re-queuing. Ask the cast member at the entrance."],
      ["Baby facilities", "Baby Center with nursing rooms, changing tables and baby supplies; changing tables in many toilets; stroller rental."],
      ["Tickets", "Dated 1-Day Passport, sold online only. Sales open at 2 pm JST two months before the date and can sell out. Adult price on most winter days: ¥10,900; peak days up to ¥12,400. Ages 3 and under free."],
      ["Opening dates", "Open daily, but hours change; check the official calendar for your date."],
    ],
    links: [["Official tickets", "https://www.tokyodisneyresort.jp/en/ticket/index.html"], ["Park calendar", "https://www.tokyodisneyresort.jp/en/tdl/monthly/calendar.html"], ["Services (Baby Center, Rider Switch)", "https://www.tokyodisneyresort.jp/en/tdl/service/"]],
  },
];

export function ThemeParks() {
  return (
    <section aria-labelledby="tp-h">
      <h2 id="tp-h" className="h2">Theme parks</h2>
      <p className="muted">Two separate full days. Change the date any time: the planner checks clashes and never overwrites booked plans. Availability isn't checked by this app; always confirm on the official site.</p>
      <div className="parks">{PARKS.map((p) => <Park key={p.id} p={p} />)}</div>
    </section>
  );
}

function Park({ p }: { p: ParkInfo }) {
  const { state, dispatch } = useStore();
  const wx = useRegionWeather();
  const a = ACT_BY_ID[p.id];
  const item = state.schedule.find((i) => i.activityId === p.id);
  const [date, setDate] = useState(item?.date ?? "");
  const [ask, setAsk] = useState(false);
  const [adding, setAdding] = useState(false);
  const plan = item && date ? planMove(state.schedule, item.uid, date, "morning") : null;
  const daysHere = TRIP_DAYS.filter((d) => cityOn(d, state.legs) === a.city);
  const fc = item ? wx.forRegion(item.date, a.city) : null;
  return (
    <article className="card park" style={{ ["--c" as string]: CITY_COLORS[a.city] }}>
      <ActivityPhoto a={a}><span className="citytag">{p.id === "usj" ? "Osaka" : "Tokyo"}</span></ActivityPhoto>
      <div className="body">
        <h3>{a.title}</h3>
        <p>{a.blurb}</p>
        <div className="parkdate">
          {item ? <>
            <span>Planned for <b>{fmt(item.date, { dow: true })}</b>{item.booked && " 🔒 booked"} {fc ? <span className="wx">{wxIcon(fc.code)} {Math.round(fc.tMax ?? 0)}° · {fc.precipProb}%</span> : <span className="small muted">forecast not available yet</span>}</span>
            <label>Move to<select value={date} onChange={(e) => setDate(e.target.value)}>{TRIP_DAYS.map((d) => <option key={d} value={d}>{fmt(d, { dow: true })}{daysHere.includes(d) ? " ✓" : ""}</option>)}</select></label>
            <button className="btn sm" disabled={date === item.date} onClick={() => setAsk(true)}>Reschedule</button>
          </> : <button className="btn primary" onClick={() => setAdding(true)}>Add to calendar</button>}
          <label className="check"><input type="checkbox" disabled={!item} checked={!!item?.booked} onChange={(e) => item && dispatch({ type: "setItem", uid: item.uid, patch: { booked: e.target.checked } })} /> Tickets bought</label>
        </div>
        <dl className="facts wide">{p.rows.map(([k, v]) => <><dt key={k}>{k}</dt><dd key={k + "v"}>{v}</dd></>)}</dl>
        <p className="small muted">{p.checked}</p>
        <div className="links">{p.links.map(([l, u]) => <Ext key={u} className="lnk" href={u}>{l} ↗</Ext>)}</div>
      </div>
      {ask && item && plan && (
        <Confirm title={`Move ${a.title} to ${fmt(date, { dow: true })}?`} confirmLabel="Move" disabled={!plan.ok} onCancel={() => setAsk(false)} onConfirm={() => { dispatch({ type: "move", uid: item.uid, date, slot: "morning", confirmed: true }); setAsk(false); }}>
          {!daysHere.includes(date) && <p className="warn small">You're not based near {a.city === "osa" ? "Osaka" : "Tokyo"} that day.</p>}
          {item.booked && <p className="warn small">Your tickets are dated: changing the plan here doesn't change them.</p>}
          {plan.blockedByBooked.length > 0 && <p className="warn">Blocked by booked: {plan.blockedByBooked.map(itemTitle).join(", ")}.</p>}
          {plan.ok && plan.displaced.length > 0 && <p>Moves to Saved: {plan.displaced.map(itemTitle).join(", ")}.</p>}
        </Confirm>
      )}
      {adding && <AddToCalendar a={a} onClose={() => setAdding(false)} />}
    </article>
  );
}
