import { useState } from "react";
import { useStore } from "../state/hooks";
import { ACT_BY_ID } from "../data/activities";
import { CITY_COLORS, CITY_NAMES } from "../data/trip";
import { TRIP_DAYS, cityOn, slotIndex } from "../lib/schedule";
import { diffDays, parseISO } from "../lib/dates";
import { hopsFor, carOn, googleWeather, bookingNeed } from "../lib/transport";
import { ActivityDetail, SLOT_NAME, WHO } from "./ActivityDetail";
import { Thumb, Ext } from "./common";
import type { CityId, ScheduleItem } from "../types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The plan, day by day: where you sleep, how you travel, and only what you picked in Explore. */
export function Itinerary({ goExplore, goBook }: { goExplore: (city?: CityId) => void; goBook: () => void }) {
  const { state } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const hops = hopsFor(state.legs);
  const picked = state.schedule.filter((i) => i.activityId && ACT_BY_ID[i.activityId]);
  const toBook = picked.filter((i) => !i.booked && bookingNeed(ACT_BY_ID[i.activityId!]).ahead).length;

  // Group the days into city blocks in trip order.
  const blocks: { city: CityId; days: string[] }[] = [];
  for (const d of TRIP_DAYS) {
    const c = cityOn(d, state.legs);
    if (!c) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.city === c) last.days.push(d); else blocks.push({ city: c, days: [d] });
  }
  const openItem = state.schedule.find((i) => i.uid === open);

  return (
    <section aria-labelledby="plan-h">
      <h2 id="plan-h" className="h2">Our plan</h2>
      <div className="summary">
        <p>{picked.length === 0 ? <>Nothing picked yet. Open <b>Explore</b>, tap an activity, and choose <b>Add to our plan</b>: it appears here on the day you choose.</> : <><b>{picked.length}</b> {picked.length === 1 ? "activity" : "activities"} picked{toBook ? <> · <b>{toBook}</b> still to book</> : null}.</>}</p>
        <div className="links">
          <button className="btn primary" onClick={() => goExplore()}>✨ Find things to do</button>
          <button className="btn ghost" onClick={goBook}>✅ What to book</button>
        </div>
      </div>

      {blocks.map((b) => {
        const leg = state.legs.find((l) => !l.optional && l.city === b.city);
        const nights = leg ? diffDays(leg.arrive, leg.depart) : 0;
        return (
          <div key={b.city + b.days[0]} className="citysec" style={{ ["--c" as string]: CITY_COLORS[b.city] }}>
            <header className="cityhead">
              <div>
                <h3>{CITY_NAMES[b.city]}</h3>
                <p className="small">{range(b.days)} · {nights} night{nights === 1 ? "" : "s"}{leg?.stay ? <> · 🛏️ {leg.stay.name} <span className={"pill " + (leg.stayBooked ? "ok" : "todo")}>{leg.stayBooked ? "Booked" : "Not booked"}</span></> : null}</p>
              </div>
              <Ext className="btn sm ghost" href={googleWeather(CITY_NAMES[b.city])}>☁️ Weather ↗</Ext>
            </header>
            <ol className="dayslist">
              {b.days.map((d) => {
                const items = state.schedule.filter((i) => i.date === d).sort((x, y) => slotIndex(x.slot) - slotIndex(y.slot));
                const hop = hops.find((h) => h.date === d);
                const car = carOn(d, state.cars);
                const stop = state.legs.find((l) => l.optional && l.arrive <= d && d < l.depart);
                const t = new Date(parseISO(d));
                return (
                  <li key={d} className="dayrow" id={"day-" + d}>
                    <div className="datecol"><span>{DOW[t.getUTCDay()]}</span><b>{t.getUTCDate()}</b><span>{MON[t.getUTCMonth()]}</span></div>
                    <div className="daycontent">
                      {hop && (
                        <div className="hop"><span className="hopicon" aria-hidden="true">{hop.icon}</span><div><b>{hop.title}</b><p className="small">{hop.how}. {hop.time}</p></div></div>
                      )}
                      {car && <p className="carline">🚗 Rental car day {diffDays(car.pickup, d) + 1} of {car.days}{d === car.pickup ? ": pick it up today" : ""}</p>}
                      {stop && <p className="carline">🌙 Overnight at {stop.name}</p>}
                      {items.map((i) => <PlanItem key={i.uid} i={i} onOpen={() => setOpen(i.uid)} />)}
                      {items.length === 0 && !hop && <button className="freeday" onClick={() => goExplore(b.city)}>Free day · <u>find something in {CITY_NAMES[b.city]}</u></button>}
                      {items.length === 0 && hop && <p className="small muted">Travel day.</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
      {openItem?.activityId && <ActivityDetail a={ACT_BY_ID[openItem.activityId]} item={openItem} onClose={() => setOpen(null)} />}
    </section>
  );
}

function PlanItem({ i, onOpen }: { i: ScheduleItem; onOpen: () => void }) {
  const a = i.activityId ? ACT_BY_ID[i.activityId] : undefined;
  if (!a) return <div className="planitem"><div className="pitext"><b>{i.title}</b></div></div>;
  const need = bookingNeed(a);
  return (
    <button className="planitem" onClick={onOpen}>
      <Thumb a={a} />
      <span className="pitext">
        <span className="pislot">{a.fullDay ? "All day" : SLOT_NAME[i.slot]}{i.track !== "all" ? ` · ${WHO[i.track]}` : ""}</span>
        <b>{a.title}</b>
        <span className="pimeta">
          {i.booked ? <span className="pill ok">Booked</span> : need.ahead ? <span className="pill todo">Book ahead</span> : <span className="pill">Pay on the day</span>}
          <span className="muted"> · {a.duration}</span>
        </span>
      </span>
      <span className="chev" aria-hidden="true">›</span>
    </button>
  );
}

function range(days: string[]) {
  const f = new Date(parseISO(days[0])), l = new Date(parseISO(days[days.length - 1]));
  return f.getUTCMonth() === l.getUTCMonth() ? `${f.getUTCDate()}–${l.getUTCDate()} ${MON[l.getUTCMonth()]}` : `${f.getUTCDate()} ${MON[f.getUTCMonth()]} – ${l.getUTCDate()} ${MON[l.getUTCMonth()]}`;
}
