/** Rough door-to-door estimates for getting somewhere, plus Google Maps links for the exact route. */
export interface LatLonLike { lat: number; lon: number }

export interface Way { icon: string; label: string; minutes: number; note?: string }
export interface Estimate { km: number; ways: Way[]; tips: string[] }

export function straightKm(a: LatLonLike, b: LatLonLike): number {
  const R = 6371, r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtMins(m: number): string {
  if (m < 60) return `${Math.max(5, Math.round(m / 5) * 5)} min`;
  const h = Math.floor(m / 60), r = Math.round((m % 60) / 15) * 15;
  if (r === 60) return `${h + 1} h`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Typical times by each way of travel. Straight-line distance × 1.3 for roads and rails. */
export function estimate(from: LatLonLike, to: LatLonLike, country: "jp" | "cn"): Estimate {
  const km = straightKm(from, to);
  const road = km * 1.3;
  const ways: Way[] = [];
  const tips: string[] = [];

  if (km < 6) ways.push({ icon: "🚶", label: "Walk", minutes: (road / 4.5) * 60 });

  let train: number;
  if (km <= 60) train = 12 + (road / 28) * 60;
  else if (km <= 150 || country === "cn") train = 25 + (road / 50) * 60;
  else train = 45 + (km / 190) * 60;
  if (km >= 1.2) ways.push({ icon: km > 150 && country === "jp" ? "🚄" : "🚇", label: km > 150 && country === "jp" ? "Shinkansen + train" : country === "cn" ? "Metro" : "Train / subway", minutes: train });

  const speed = km < 15 ? 20 : km < 60 ? 38 : 70;
  const drive = 5 + (road / speed) * 60;
  if (km >= 1.2) {
    const fare = country === "jp" ? `about ¥${roundTo(500 + 420 * road, 100).toLocaleString("en-AU")}` : `about ¥${roundTo(16 + 3 * road, 5)} by DiDi`;
    if (km < 60) ways.push({ icon: "🚕", label: "Taxi", minutes: drive, note: fare });
    ways.push({ icon: "🚗", label: country === "jp" ? "Rental car" : "Car", minutes: drive, note: km >= 15 && country === "jp" ? "plus tolls on expressways" : undefined });
  }

  if (km < 1.2) tips.push("It's close: just walk.");
  else if (km < 6) tips.push("Walk if the weather is good, or take one or two stops on the train.");
  if (country === "jp") {
    if (km >= 1.2 && km <= 150) tips.push("Tap in with a Suica or ICOCA card (on your phone's wallet) for trains, subways and buses: no tickets needed.");
    if (km > 150) tips.push("For long trips take the Shinkansen. Reserve seats on SmartEX, especially around New Year.");
    if (km > 40) tips.push("If you have the rental car that day, driving is often easiest for the countryside. Expressway tolls are paid at the gate or with an ETC card.");
    tips.push("Taxis take credit cards and fit a folded pram. A taxi is worth it late at night or with a sleeping baby.");
  } else {
    tips.push("In Shanghai, use DiDi (in Alipay) for taxis and scan the Alipay transport QR code for the Metro.");
  }
  tips.push("Google Maps has the exact train times, platforms and exits: tap a Directions button.");
  return { km, ways, tips };
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export type Travel = "transit" | "driving" | "walking";
/** Google Maps directions. Leave `from` empty to start from the phone's current location. */
export function googleDirections(dest: string, mode: Travel, from?: LatLonLike | string): string {
  const p = new URLSearchParams({ api: "1", destination: dest, travelmode: mode });
  if (from) p.set("origin", typeof from === "string" ? from : `${from.lat},${from.lon}`);
  return "https://www.google.com/maps/dir/?" + p.toString();
}

export interface Found { name: string; lat: number; lon: number; country: "jp" | "cn" | "other" }

/** Look up a typed address with OpenStreetMap's Nominatim (only on search, never while typing). */
export async function findPlace(q: string, signal?: AbortSignal): Promise<Found[]> {
  const p = new URLSearchParams({ q, format: "jsonv2", limit: "5", countrycodes: "jp,cn", "accept-language": "en", addressdetails: "1" });
  const r = await fetch("https://nominatim.openstreetmap.org/search?" + p.toString(), { signal });
  if (!r.ok) throw new Error("search failed");
  const rows = (await r.json()) as { display_name: string; lat: string; lon: string; address?: { country_code?: string } }[];
  return rows.map((x) => ({ name: x.display_name, lat: +x.lat, lon: +x.lon, country: x.address?.country_code === "jp" ? "jp" : x.address?.country_code === "cn" ? "cn" : "other" }));
}
