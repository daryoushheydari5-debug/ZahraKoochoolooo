export type CityId = "sha" | "fuk" | "osa" | "tok";
export type RegionId = CityId | "kyushu" | "kansai" | "fuji" | "hakone" | "izu" | "nikko" | "chichibu" | "kamakura" | "minakami" | "yuzawa";
export type Slot = "morning" | "afternoon" | "evening";
export type Track = "all" | "family" | "solo";
export type GroupMode = "together" | "solo" | "turns" | "split";
export type Currency = "AUD" | "JPY" | "CNY";

export interface LatLon { lat: number; lon: number }

export interface Stay {
  id: string;
  name: string;
  area: string;
  pos: LatLon;
  bookingUrl: string;
  bookingLabel: string;
  mapsQuery: string;
  nightlyAud?: number; // estimate, both rooms
  note?: string;
}

/** One leg of the route. Dates are ISO yyyy-mm-dd, nights = depart - arrive. */
export interface Leg {
  id: string;
  city: CityId | "stop";
  name: string;
  arrive: string;
  depart: string;
  stay?: Stay;
  stayBooked: boolean;
  optional?: boolean; // overnight stop the user added
  color: string;
}

export interface Cost {
  amount: number | null; // per adult unless perGroup
  currency: Currency;
  basis: "per-adult" | "per-group" | "per-hour" | "free";
  status: "verified" | "estimate";
  note?: string;
}

export interface Family {
  together: boolean; // baby can come along
  stroller: "good" | "partial" | "no";
  carrier: "recommended" | "required" | "not needed";
  babyFacilities: string;
  ageRule?: string;
}

export interface Activity {
  id: string;
  title: string;
  region: RegionId;
  city: CityId; // base city it's done from
  modes: GroupMode[];
  fullDay?: boolean;
  slots: number; // 1-3
  duration: string;
  cost: Cost;
  location: { name: string; pos: LatLon; query: string };
  booking: { label: string; url: string };
  source: { label: string; url: string };
  score: number; // 0-100 suitability for this group
  tags: string[];
  weather: "indoor" | "outdoor" | "mixed";
  weatherSensitive?: boolean;
  family: Family;
  blurb: string;
  does: string[];
  tip?: string;
  scene: string;
  photoQuery: string; // Wikimedia Commons search term
  flexible?: boolean;
  adultOnly?: boolean;
  /** Slots it suits best (used by auto-fill). */
  best?: Slot[];
  /** Can appear on several days (e.g. snack runs). */
  repeatable?: boolean;
  /** Inclusive date ranges when it is usually closed (e.g. New Year), so suggestions avoid them. */
  closed?: [string, string][];
}

export interface ScheduleItem {
  uid: string;
  activityId?: string;
  title?: string; // custom
  date: string;
  slot: Slot;
  span: number; // number of slots (1-3)
  track: Track;
  booked: boolean;
  kind?: "activity" | "travel" | "custom";
  /** Added by "fill empty slots"; shown as a suggestion until edited. */
  suggested?: boolean;
}

export interface BudgetItem {
  id: string;
  label: string;
  category: "accommodation" | "rental car" | "fuel" | "tolls" | "parking" | "tickets" | "transport" | "food" | "other";
  amount: number;
  currency: Currency;
  split: "shared" | "individual";
  person?: TravellerId; // when individual
  sharedBy?: TravellerId[];
  estimate: boolean;
}

export type TravellerId = "darius" | "sister" | "husband" | "baby";
export interface Traveller { id: TravellerId; name: string; age: number; adult: boolean }
