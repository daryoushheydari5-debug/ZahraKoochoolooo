import type { LatLon } from "../types";

export interface RoadTrip {
  id: string;
  name: string;
  from: "tok" | "fuk";
  dest: LatLon;
  activityIds: string[];
  /** Typical, traffic-free drive time from the base, used only when routing is unavailable. */
  typicalMinutes: number;
  typicalKm: number;
  tollsJpy: [number, number]; // one-way estimate range with ETC
  parking: string;
  winter: string[];
  transit: { summary: string; minutes: number; costJpy: number };
  overnight: boolean;
  highlights: string;
  rating: { nature: number; adrenaline: number; tech: number; baby: number };
}

export const ROAD_TRIPS: RoadTrip[] = [
  {
    id: "fuji", name: "Mt Fuji & Fuji Five Lakes", from: "tok", dest: { lat: 35.5005, lon: 138.7600 },
    activityIds: ["fuji-view", "fujiq", "icecave", "paraglide"], typicalMinutes: 110, typicalKm: 105, tollsJpy: [2900, 3600],
    parking: "Lake parks and viewpoints are mostly free or ¥500–1,000. Fuji-Q charges for parking.",
    winter: ["Winter tyres are standard on rentals here in winter, but confirm when booking.", "Roads up to the 5th Station (Subaru Line, Fuji Skyline) are usually closed or restricted in winter.", "Black ice at sunrise around the lakes; temperatures often −5 °C or lower."],
    transit: { summary: "Highway bus from Shinjuku to Kawaguchiko (about 2 hrs), or JR + Fujikyu line.", minutes: 125, costJpy: 2200 },
    overnight: true, highlights: "Clear winter Fuji views, extreme coasters, ice caves, tandem paragliding.",
    rating: { nature: 5, adrenaline: 5, tech: 2, baby: 3 },
  },
  {
    id: "hakone", name: "Hakone", from: "tok", dest: { lat: 35.2324, lon: 139.1069 },
    activityIds: ["owakudani", "hakone-onsen"], typicalMinutes: 100, typicalKm: 90, tollsJpy: [1800, 2600],
    parking: "Ropeway stations have paid parks (~¥500–1,000); fills by 10 am on weekends.",
    winter: ["Mountain roads above Lake Ashi can be icy; winter tyres needed.", "Owakudani ropeway closes in strong wind or high volcanic gas."],
    transit: { summary: "Odakyu Romancecar from Shinjuku to Hakone-Yumoto (~85 min), then the Hakone loop.", minutes: 90, costJpy: 2500 },
    overnight: true, highlights: "Volcanic valley by gondola, private hot-spring inns.",
    rating: { nature: 4, adrenaline: 2, tech: 1, baby: 4 },
  },
  {
    id: "izu", name: "Izu Peninsula", from: "tok", dest: { lat: 34.9000, lon: 139.1300 },
    activityIds: ["izu", "jogasaki"], typicalMinutes: 170, typicalKm: 140, tollsJpy: [3000, 4200],
    parking: "Free at Shaboten Zoo and Jogasaki coast (mostly).",
    winter: ["Mild coastal climate; ice is rare except on the Amagi pass.", "Coast roads jam on 2–3 Jan."],
    transit: { summary: "JR Odoriko limited express Tokyo to Ito (~1 hr 45), then bus.", minutes: 130, costJpy: 4500 },
    overnight: true, highlights: "Capybaras in a hot bath, lava-cliff suspension bridge.",
    rating: { nature: 4, adrenaline: 2, tech: 1, baby: 5 },
  },
  {
    id: "nikko", name: "Nikko & Lake Chuzenji", from: "tok", dest: { lat: 36.7500, lon: 139.6000 },
    activityIds: ["edo", "kegon"], typicalMinutes: 140, typicalKm: 150, tollsJpy: [3800, 4600],
    parking: "Paid lots near falls (~¥500).",
    winter: ["Irohazaka hairpins above Nikko town are regularly snowy and icy: winter tyres mandatory and carry chains.", "Chain controls (チェーン規制) can be announced; check JARTIC before leaving."],
    transit: { summary: "Tobu Limited Express from Asakusa to Tobu-Nikko (~2 hrs), then bus.", minutes: 130, costJpy: 3000 },
    overnight: true, highlights: "Frozen waterfalls, ninja town.",
    rating: { nature: 4, adrenaline: 1, tech: 1, baby: 3 },
  },
  {
    id: "chichibu", name: "Chichibu", from: "tok", dest: { lat: 35.9920, lon: 139.0850 },
    activityIds: ["icicles"], typicalMinutes: 120, typicalKm: 90, tollsJpy: [1000, 1800],
    parking: "Small free/cheap lots at icicle sites; busy during light-ups.",
    winter: ["Mountain roads west of Chichibu can be icy at night."],
    transit: { summary: "Seibu Limited Express 'Laview' from Ikebukuro (~80 min).", minutes: 80, costJpy: 1500 },
    overnight: false, highlights: "Giant icicle walls lit up at night.",
    rating: { nature: 4, adrenaline: 1, tech: 3, baby: 3 },
  },
  {
    id: "kamakura", name: "Kamakura & Enoshima", from: "tok", dest: { lat: 35.3000, lon: 139.4800 },
    activityIds: ["enoden", "enoaq"], typicalMinutes: 75, typicalKm: 55, tollsJpy: [900, 1500],
    parking: "Very limited and pricey (¥2,000+ a day). Train is easier.",
    winter: ["No snow issues; heavy New Year traffic 1–3 Jan."],
    transit: { summary: "JR Yokosuka line to Kamakura (~1 hr), then the Enoden.", minutes: 60, costJpy: 950 },
    overnight: false, highlights: "Seaside train, sea caves, aquarium.",
    rating: { nature: 3, adrenaline: 1, tech: 1, baby: 4 },
  },
  {
    id: "minakami", name: "Minakami & Yuzawa snow country", from: "tok", dest: { lat: 36.8000, lon: 138.9000 },
    activityIds: ["gala", "snowshoe"], typicalMinutes: 160, typicalKm: 170, tollsJpy: [3600, 4400],
    parking: "Ski resort car parks ¥1,000–1,500.",
    winter: ["Kan-Etsu Expressway through the Kan-Etsu tunnel often has heavy snow and chain controls.", "Strongly consider the shinkansen instead of driving."],
    transit: { summary: "Joetsu shinkansen to Gala-Yuzawa (~75 min, winter only) or Jomo-Kogen.", minutes: 75, costJpy: 6800 },
    overnight: true, highlights: "Skiing, snowshoeing in deep powder.",
    rating: { nature: 5, adrenaline: 4, tech: 1, baby: 1 },
  },
  {
    id: "kyushu-beppu", name: "Beppu & Yufuin (Fukuoka car)", from: "fuk", dest: { lat: 33.2840, lon: 131.4910 },
    activityIds: ["beppu"], typicalMinutes: 125, typicalKm: 135, tollsJpy: [3500, 4200],
    parking: "Hells car parks free; Yufuin town lots ~¥500–1,000.",
    winter: ["Oita Expressway can ice near Yufuin; mornings around 0 °C."],
    transit: { summary: "JR Limited Express Sonic Hakata to Beppu (~2 hrs).", minutes: 120, costJpy: 6000 },
    overnight: false, highlights: "Private family onsen and boiling coloured ponds.",
    rating: { nature: 4, adrenaline: 1, tech: 1, baby: 4 },
  },
  {
    id: "kyushu-aso", name: "Mt Aso caldera (Fukuoka car)", from: "fuk", dest: { lat: 32.8840, lon: 131.0630 },
    activityIds: ["aso"], typicalMinutes: 130, typicalKm: 140, tollsJpy: [2800, 3500],
    parking: "Kusasenri parking ~¥500.",
    winter: ["Roads up to the crater freeze; winter tyres needed in late December.", "Crater access depends on volcanic gas alerts."],
    transit: { summary: "Shinkansen to Kumamoto then JR Hohi line + bus (~3 hrs).", minutes: 180, costJpy: 6500 },
    overnight: false, highlights: "Active volcanic crater, huge caldera grasslands.",
    rating: { nature: 5, adrenaline: 2, tech: 1, baby: 2 },
  },
  {
    id: "kyushu-itoshima", name: "Itoshima coast (Fukuoka car)", from: "fuk", dest: { lat: 33.6380, lon: 130.1980 },
    activityIds: ["itoshima"], typicalMinutes: 45, typicalKm: 35, tollsJpy: [0, 600],
    parking: "Free roadside parking at most beaches.",
    winter: ["Windy coast; no snow issues."],
    transit: { summary: "JR Chikuhi line to Chikuzen-Maebaru, then bus.", minutes: 70, costJpy: 900 },
    overnight: false, highlights: "Coastal drive and glass-blowing.",
    rating: { nature: 3, adrenaline: 1, tech: 1, baby: 5 },
  },
];

export const CAR_RULES = [
  { title: "International Driving Permit", text: "An Australian licence alone isn't valid in Japan. Each driver needs an IDP issued under the 1949 Geneva Convention (from your state motoring club) plus the original licence and passport." },
  { title: "Child seat (legal requirement)", text: "Children under 6 must ride in a child seat in Japan. Reserve a rear-facing infant seat for the 1-year-old when booking the car; rental companies charge roughly ¥550–1,100 per day." },
  { title: "ETC card", text: "Rent an ETC card with the car to pay tolls automatically and get ETC discounts. Toll figures in this app are estimates." },
  { title: "Winter tyres & chains", text: "Ask for studless winter tyres for any mountain trip (Fuji, Hakone, Nikko, Aso). When chain controls are announced, cars without chains are turned back." },
  { title: "Fukuoka car (3 days)", text: "Pick up near Hakata Station. Ask the hotel about parking before arrival; city coin parking is ~¥1,500–2,500 a night." },
];
