import type { Activity, CityId, Leg } from "../types";
import type { CarPlan } from "../state/store";
import { CITY_NAMES, CITY_POS, gdir, gdir as gdirExact } from "../data/trip";
import { addDays } from "./dates";
import { stayOn } from "./schedule";

/** Google weather search for a place: opens Google's own forecast card. */
export const googleWeather = (place: string) => "https://www.google.com/search?q=" + encodeURIComponent("weather " + place);

export interface Hop { id: string; date: string; icon: string; title: string; how: string; time: string; cost: string; bookLabel: string; bookUrl: string; tip?: string }

const SMART_EX = "https://smart-ex.jp/en/";
const flights = (from: string, to: string, date: string) => `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${from} to ${to} on ${date}`)}`;

/** Best way to make each big move of the trip. Times and prices are typical, not quotes. */
const HOPS: Record<string, Omit<Hop, "id" | "date">> = {
  "start-sha": { icon: "✈️", title: "Arrive in Shanghai", how: "Fly into Pudong (PVG), then the Maglev to Longyang Road and a short taxi to the hotel", time: "About 1 hour airport to hotel", cost: "Maglev about ¥50 each; taxi about ¥30", bookLabel: "Find flights", bookUrl: flights("Australia", "Shanghai", "2026-12-20"), tip: "Set up Alipay or WeChat Pay with your card before you fly: cash and foreign cards are hard to use in China." },
  "sha-fuk": { icon: "✈️", title: "Shanghai → Fukuoka", how: "Fly Pudong (PVG) → Fukuoka (FUK), about 2 hours. Fukuoka Airport is two subway stops from Hakata", time: "About 2 hours flying, half a day door to door", cost: "Often A$150–350 each one way (check)", bookLabel: "Find flights", bookUrl: flights("Shanghai", "Fukuoka", "2026-12-23"), tip: "Pick up the rental car at Hakata after you land." },
  "fuk-osa": { icon: "🚄", title: "Fukuoka → Osaka", how: "Shinkansen (Nozomi or Mizuho) Hakata → Shin-Osaka, then JR to Universal City for the hotel", time: "About 2.5 hours + 30 min", cost: "About ¥15,600 each with a reserved seat; the baby rides free on a lap", bookLabel: "Book on SmartEX", bookUrl: SMART_EX, tip: "Return the Fukuoka rental car in the morning before the train." },
  "osa-tok": { icon: "🚄", title: "Osaka → Tokyo", how: "Shinkansen (Nozomi) Shin-Osaka → Tokyo, then the subway to Kiyosumi-Shirakawa", time: "About 2.5 hours + 20 min", cost: "About ¥14,700 each with a reserved seat; the baby rides free on a lap", bookLabel: "Book on SmartEX", bookUrl: SMART_EX, tip: "Late December is busy: reserve seats as soon as booking opens, and ask for the seats with extra legroom at the back of a car for luggage." },
  "end-tok": { icon: "✈️", title: "Fly home from Tokyo", how: "From Kiyosumi-Shirakawa: about 40 min to Haneda (HND) or 75–90 min to Narita (NRT) by train or taxi", time: "Leave 3+ hours before an international flight", cost: "Taxi to Haneda about ¥7,000–9,000", bookLabel: "Find flights", bookUrl: flights("Tokyo", "Australia", "2027-01-10") },
};

/** The travel days of the trip, in order, following the (editable) route. */
export function hopsFor(legs: Leg[]): Hop[] {
  const main = legs.filter((l) => !l.optional).sort((a, b) => a.arrive.localeCompare(b.arrive));
  if (!main.length) return [];
  const out: Hop[] = [];
  const first = main[0], last = main[main.length - 1];
  const start = HOPS[`start-${first.city}`];
  if (start) out.push({ id: `start-${first.city}`, date: first.arrive, ...start });
  for (let i = 0; i < main.length - 1; i++) {
    const k = `${main[i].city}-${main[i + 1].city}`;
    const h = HOPS[k] ?? { icon: "🚆", title: `${main[i].name} → ${main[i + 1].name}`, how: "Check Google Maps for trains or flights", time: "", cost: "", bookLabel: "Directions", bookUrl: gdir(CITY_POS[main[i].city as CityId], CITY_POS[main[i + 1].city as CityId], "transit") };
    out.push({ id: k, date: main[i].depart, ...h });
  }
  const end = HOPS[`end-${last.city}`];
  if (end) out.push({ id: `end-${last.city}`, date: last.depart, ...end });
  return out;
}

/** Car days: the rental runs from pickup for `days` days. */
export function carOn(date: string, cars: CarPlan[]): CarPlan | null {
  return cars.find((c) => c.pickup <= date && date < addDays(c.pickup, c.days)) ?? null;
}

/** Specific, checked-by-hand directions for places where "take the train" isn't enough. */
const ROUTES: Record<string, string> = {
  takachiho: "Drive about 3 hours each way via Kumamoto (rental car). No easy train.",
  yufuinfloral: "Drive 1h40 (122 km, tolls) via the Kyushu and Oita expressways, or about 2 hours by train to Yufuin.",
  midorinouta: "Drive: it's out of the city in the forest. Use the rental car and check the map listing for the exact spot.",
  miyajidake: "Drive about 45 minutes from Hakata (rental car), or JR to Fukuma then a 25-minute walk or short taxi.",
  ikoma: "Kintetsu Nara Line from Namba to Ikoma (about 25 min), then the Ikoma Cable Car up, changing at Hozanji. About 1 hour from the hotel.",
  daikoku: "The tour picks you up in central Tokyo (usually Shibuya or Shinjuku) and drives you there.",
  safari: "Drive about 1h45 via the Oita Expressway; it's near Beppu, so combine them.",
  akiyoshido: "Drive about 2 hours via the Chugoku Expressway (rental car day).",
  monkeykart: "Train to the Monkey Kart shop for your route (Shibuya for the Tokyo Tower and Harajuku routes, Asakusa for the Skytree route). From the apartment, about 25–35 minutes.",
  mitake: "JR Chuo Line to Tachikawa, then the JR Ome Line to Mitake (about 1.5 hours). For the cable car, take the bus from Mitake Station to Takimoto.",
  usj: "Walk about 10 minutes: the hotel is in Universal City.",
  tdl: "JR Keiyo Line to Maihama, about 40 minutes from the apartment.",
  maglev: "Ride it from Pudong Airport when you land: follow the Maglev signs after customs.",
  lsnow: "Metro Line 2 then Line 16 towards Dishui Lake (about 1.5 hours), or a DiDi taxi (about 1 hour).",
  haichang: "Metro Line 2 then Line 16 to Dishui Lake (about 1.5 hours), or a DiDi taxi (about 1 hour).",
  ghibli: "JR Chuo Line to Mitaka, then the yellow community bus or a 15-minute walk. About 1 hour.",
  takao: "Keio Line to Takaosanguchi, about 1.5 hours.",
  puroland: "Keio Line to Keio-Tama-Center, about 1 hour 10 minutes.",
  yomiuri: "Keio Line to Keio-Yomiuri-Land, then the gondola up. About 1 hour.",
  seaparadise: "Train to Kanazawa-Hakkei, then the Seaside Line to Hakkeijima. About 1.5 hours.",
  nara: "JR or Kintetsu train to Nara, about 1 hour 15 minutes from Universal City.",
  "fuji-view": "Drive (about 2 hours) or the highway bus from Shinjuku to Kawaguchiko (about 2 hours).",
  fujiq: "Highway bus from Shinjuku to Fuji-Q Highland (about 2 hours), or drive.",
  icecave: "Drive from Lake Kawaguchi (about 25 minutes), or the Retro Bus green line.",
  paraglide: "Drive or highway bus to Lake Kawaguchi; the operator meets you nearby.",
};

/** Places whose map pin is a rough guess: route to the name instead. */
const APPROX_POS = new Set(["midorinouta"]);

export interface GetThere { how: string; url: string; mode: "walk" | "transit" | "driving" }

/** Best way to reach an activity from where you're sleeping that day. */
export function getThere(a: Activity, date: string | undefined, legs: Leg[], cars: CarPlan[]): GetThere {
  const leg = date ? stayOn(date, legs) : legs.find((l) => !l.optional && l.city === a.city) ?? null;
  const stay = leg?.stay;
  const from = stay?.pos ?? CITY_POS[a.city];
  const to = a.location.pos;
  const car = date ? carOn(date, cars) : null;
  const km = distKm(from, to);
  // Directions start at the hotel's own address when we only know roughly where it is.
  const gdir = (f: { lat: number; lon: number }, t: { lat: number; lon: number }, mode: "driving" | "transit") => {
    const u = gdirExact(f, t, mode);
    const v = APPROX_POS.has(a.id) ? u.replace(/destination=[^&]*/, "destination=" + encodeURIComponent(a.location.query)) : u;
    return stay && !stay.posExact ? v.replace(/origin=[^&]*/, "origin=" + encodeURIComponent(stay.mapsQuery)) : v;
  };
  if (ROUTES[a.id]) return { how: ROUTES[a.id], url: gdir(from, to, car ? "driving" : "transit"), mode: car ? "driving" : "transit" };
  if (car && km > 2) return { how: `Drive: you have the rental car that day (about ${Math.round(km)} km). Check parking before you go.`, url: gdir(from, to, "driving"), mode: "driving" };
  if (km < 1.3) return { how: `${stay ? "Walk" : "Probably a walk"}: about ${Math.max(5, Math.round(km * 13))} minutes${stay ? " from your hotel" : ""}.`, url: gdir(from, to, "transit").replace("travelmode=transit", "travelmode=walking"), mode: "walk" };
  const mins = Math.round((km / 22) * 60 + 15);
  const kind = a.city === "sha" ? "Metro or a DiDi taxi" : "Train or subway";
  return { how: `${kind}: roughly ${fmtMinutes(mins)} from ${stay ? "your hotel" : "the city centre"}${a.region !== a.city ? ` (day trip from ${CITY_NAMES[a.city]})` : ""}. Tap Directions for the exact route.`, url: gdir(from, to, "transit"), mode: "transit" };
}

function fmtMinutes(m: number) {
  if (m < 60) return `${Math.round(m / 5) * 5} minutes`;
  const h = Math.floor(m / 60), r = Math.round((m % 60) / 15) * 15;
  return r ? `${h} hour${h > 1 ? "s" : ""} ${r} min` : `${h} hour${h > 1 ? "s" : ""}`;
}

function distKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Activities that sell out or need a reservation. Everything else: pay on the day. */
const BOOK_AHEAD = new Set(["usj", "tdl", "teamlab", "borderless", "ghibli", "foodsample", "kiriko", "ninja", "taiko", "sumo", "paraglide", "kart", "lsnow", "haichang", "sci", "puroland", "beppu", "shnhm", "noodle", "seaparadise", "shcircus", "nintendomuseum", "disneysea", "hpstudio", "monkeykart", "kungfu", "papercut", "samuraikyoto", "torokko", "daikoku", "wagashi", "aizome", "doraemon"]);
export function bookingNeed(a: Activity): { ahead: boolean; text: string } {
  const ahead = BOOK_AHEAD.has(a.id) || /reserve|dated|book|sold on|lottery/i.test(a.cost.note ?? "");
  if (a.id === "monkeykart") return { ahead, text: "Book a dated slot ahead. Every driver needs an International Driving Permit (1949 convention) plus their Australian licence, or they can't drive." };
  if (a.id === "kart") return { ahead, text: "Book ahead. Each driver needs an International Driving Permit (1949 convention) as well as their licence." };
  return ahead ? { ahead, text: "Book ahead: tickets are dated or sell out, especially over New Year." } : { ahead, text: "No need to book: pay when you get there." };
}
