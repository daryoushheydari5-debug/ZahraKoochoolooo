import type { LatLon } from "../types";

/** Routed drive time from the public OSRM server (OpenStreetMap data). Falls back to a labelled typical estimate. */
export const ROUTING_ATTRIBUTION = { label: "Routing: OSRM, map data © OpenStreetMap contributors", url: "https://project-osrm.org/" };

export interface Route { minutes: number; km: number; routed: boolean; geometry?: [number, number][]; fetchedAt?: number }

export async function fetchRoute(from: LatLon, to: LatLon, fetchImpl: typeof fetch = fetch): Promise<Route> {
  const key = `aa.route.${from.lat.toFixed(3)},${from.lon.toFixed(3)}>${to.lat.toFixed(3)},${to.lon.toFixed(3)}`;
  try { const c = localStorage.getItem(key); if (c) return JSON.parse(c); } catch { /* ignore */ }
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=simplified&geometries=geojson`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Routing service answered ${res.status}`);
  const j = await res.json();
  const r = j?.routes?.[0];
  if (j?.code !== "Ok" || !r) throw new Error("No route found");
  const out: Route = {
    minutes: Math.round(r.duration / 60),
    km: Math.round(r.distance / 1000),
    routed: true,
    geometry: (r.geometry?.coordinates ?? []).map((c: [number, number]) => [c[1], c[0]]),
    fetchedAt: Date.now(),
  };
  try { localStorage.setItem(key, JSON.stringify(out)); } catch { /* ignore */ }
  return out;
}

export const fmtMins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`);
