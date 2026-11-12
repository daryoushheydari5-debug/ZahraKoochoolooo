import type { Leg, Traveller, Stay, CityId } from "../types";

export const TRIP_START = "2026-12-20";
export const TRIP_END = "2027-01-10"; // inclusive, 22 days

export const TRAVELLERS: Traveller[] = [
  { id: "darius", name: "Darius", age: 25, adult: true },
  { id: "sister", name: "Sister", age: 32, adult: true },
  { id: "husband", name: "Brother-in-law", age: 32, adult: true },
  { id: "baby", name: "Baby (1)", age: 1, adult: false },
];

export const CITY_COLORS: Record<CityId | "stop", string> = {
  sha: "#ff3b5c",
  fuk: "#19e3c4",
  osa: "#ff9a1f",
  tok: "#b14dff",
  stop: "#4d8cff",
};

export const CITY_NAMES: Record<CityId, string> = { sha: "Shanghai", fuk: "Fukuoka", osa: "Osaka", tok: "Tokyo" };

export const CITY_POS: Record<CityId, { lat: number; lon: number }> = {
  sha: { lat: 31.2304, lon: 121.4737 },
  fuk: { lat: 33.5902, lon: 130.4017 },
  osa: { lat: 34.6937, lon: 135.5023 },
  tok: { lat: 35.6812, lon: 139.7671 },
};

export const STAYS: Record<CityId, Stay> = {
  sha: {
    id: "homeinn-pujian",
    name: "Homeinn Plus, Pujian Road",
    area: "Pudong, near Century Ave (Line 2)",
    pos: { lat: 31.2049, lon: 121.5236 },
    bookingUrl: "https://www.trip.com/hotels/list?city=2&keyword=Homeinn%20Plus%20Pujian%20Road",
    bookingLabel: "Trip.com",
    mapsQuery: "727 Pujian Road, Pudong, Shanghai",
    nightlyAud: 95,
    note: "A$284.82 for 2 rooms × 3 nights incl. tax (from your Trip.com screenshot). Free cancellation until 12:00 on 20 Dec.",
  },
  fuk: {
    id: "at-hakata",
    name: "A.T. Hotel Hakata (2-bedroom suite)",
    area: "Hakata Station",
    pos: { lat: 33.5935, lon: 130.4185 },
    bookingUrl: "https://www.booking.com/searchresults.html?ss=A.T.+Hotel+Hakata",
    bookingLabel: "Booking.com",
    mapsQuery: "A.T. Hotel Hakata Fukuoka",
    nightlyAud: 110,
    note: "Estimate. Has a kitchen and washer. Free parking is not guaranteed: ask before arriving with the rental car.",
  },
  osa: {
    id: "lagent-osaka-bay",
    name: "La'gent Hotel Osaka Bay",
    area: "Universal City, 10 min walk to USJ",
    pos: { lat: 34.6653, lon: 135.4337 },
    bookingUrl: "https://www.booking.com/searchresults.html?ss=La%27gent+Hotel+Osaka+Bay",
    bookingLabel: "Booking.com",
    mapsQuery: "La'gent Hotel Osaka Bay",
    nightlyAud: 165,
    note: "Estimate. Walkable to Universal Studios Japan.",
  },
  tok: {
    id: "tokyo-east-apartment",
    name: "2-bedroom apartment, Kiyosumi-Shirakawa",
    area: "East Tokyo, quiet, Hanzomon & Oedo lines",
    pos: { lat: 35.6823, lon: 139.7985 },
    bookingUrl: "https://www.airbnb.com/s/Kiyosumi-Shirakawa--Tokyo/homes?min_bedrooms=2",
    bookingLabel: "Airbnb",
    mapsQuery: "Kiyosumi-Shirakawa Station Tokyo",
    nightlyAud: 140,
    note: "Estimate. Ask the host about parking for the rental car; coin parking is usually ¥1,500–3,000 a day.",
  },
};

export const DEFAULT_LEGS: Leg[] = [
  { id: "leg-sha", city: "sha", name: "Shanghai", arrive: "2026-12-20", depart: "2026-12-23", stay: STAYS.sha, stayBooked: false, color: CITY_COLORS.sha },
  { id: "leg-fuk", city: "fuk", name: "Fukuoka", arrive: "2026-12-23", depart: "2026-12-26", stay: STAYS.fuk, stayBooked: false, color: CITY_COLORS.fuk },
  { id: "leg-osa", city: "osa", name: "Osaka", arrive: "2026-12-26", depart: "2026-12-29", stay: STAYS.osa, stayBooked: false, color: CITY_COLORS.osa },
  { id: "leg-tok", city: "tok", name: "Tokyo", arrive: "2026-12-29", depart: "2027-01-10", stay: STAYS.tok, stayBooked: false, color: CITY_COLORS.tok },
];

/** Booking.com search for a leg, pre-filled with its dates, 3 adults + 1 infant, 2 rooms. */
export function bookingSearchUrl(query: string, arrive: string, depart: string): string {
  const p = new URLSearchParams({
    ss: query,
    checkin: arrive,
    checkout: depart,
    group_adults: "3",
    group_children: "1",
    age: "1",
    no_rooms: "2",
    selected_currency: "AUD",
  });
  return `https://www.booking.com/searchresults.html?${p.toString()}`;
}

export const gmaps = (q: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
export const gdir = (from: { lat: number; lon: number }, to: { lat: number; lon: number }, mode: "driving" | "transit") =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=${mode}`;
