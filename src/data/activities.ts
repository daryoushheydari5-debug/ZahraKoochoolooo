import type { Activity, Cost, Family, GroupMode } from "../types";

const est = (amount: number | null, currency: Cost["currency"], basis: Cost["basis"] = "per-adult", note?: string): Cost => ({ amount, currency, basis, status: "estimate", note });
const search = (q: string) => "https://www.google.com/search?q=" + encodeURIComponent(q);
const maps = (q: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

const FAM_OK: Family = { together: true, stroller: "good", carrier: "not needed", babyFacilities: "Toilets with changing tables on site" };
const FAM_CARRIER: Family = { together: true, stroller: "partial", carrier: "recommended", babyFacilities: "Limited; change before you go" };
const FAM_NO: Family = { together: false, stroller: "no", carrier: "not needed", babyFacilities: "Not suitable for a 1-year-old", ageRule: "Adults only in practice" };

type Base = Omit<Activity, "booking" | "source" | "location" | "slots"> & {
  place: string; lat: number; lon: number; slots?: number;
  booking?: Activity["booking"]; source?: Activity["source"];
};
function act(b: Base): Activity {
  const { place, lat, lon, ...rest } = b;
  return {
    slots: b.fullDay ? 3 : 1,
    booking: b.booking ?? { label: "Search booking", url: search(place + " tickets") },
    source: b.source ?? { label: "Google Maps listing", url: maps(place) },
    location: { name: place, pos: { lat, lon }, query: place },
    ...rest,
  } as Activity;
}
const T: GroupMode[] = ["together"];
const S: GroupMode[] = ["solo"];
const TS: GroupMode[] = ["together", "solo"];
const SPLIT: GroupMode[] = ["split"];

export const ACTIVITIES: Activity[] = [
  /* ---------------- Theme parks (full-day, freely reschedulable) ---------------- */
  act({
    id: "usj", title: "Universal Studios Japan", region: "osa", city: "osa", modes: ["together", "turns"], fullDay: true, slots: 3,
    duration: "Full day", cost: { amount: 8600, currency: "JPY", basis: "per-adult", status: "estimate", note: "1-Day Studio Pass is date-priced (roughly ¥8,600–¥10,900+). Express Pass extra. Check the official calendar for your date." },
    place: "Universal Studios Japan", lat: 34.6654, lon: 135.4323,
    booking: { label: "Official USJ tickets", url: "https://www.usj.co.jp/web/en/us/tickets" },
    source: { label: "usj.co.jp", url: "https://www.usj.co.jp/web/en/us" },
    score: 96, tags: ["theme park", "thrill", "Nintendo", "technology"], weather: "mixed",
    family: { together: true, stroller: "good", carrier: "not needed", babyFacilities: "Baby care rooms and stroller rental in the park", ageRule: "Mario Kart & Mine-Cart: 107 cm with an adult, 122 cm alone. Flying Dinosaur: 132 cm." },
    blurb: "Japan's biggest theme park. Super Nintendo World puts you inside a real-life Mario level, and the thrill rides are among the best in Asia.",
    does: ["Wear a Power-Up Band and punch ? blocks to collect coins", "Mario Kart: Koopa's Challenge with AR goggles", "The Flying Dinosaur and Hollywood Dream for the adults", "Use Child Switch so the adults take turns with one queue"],
    tip: "Super Nintendo World can need an Area Timed Entry ticket on busy days; an Express Pass with a Nintendo ride guarantees a slot.",
    scene: "globe", photoQuery: "Super Nintendo World Universal Studios Japan",
  }),
  act({
    id: "tdl", title: "Tokyo Disneyland", region: "tok", city: "tok", modes: ["together", "turns"], fullDay: true, slots: 3,
    duration: "Full day", cost: { amount: 10900, currency: "JPY", basis: "per-adult", status: "verified", note: "Official calendar (checked 11 Nov 2026): adult 1-Day Passport ¥10,900 on most winter days, up to ¥12,400 on peak days. Under-3s free." },
    place: "Tokyo Disneyland", lat: 35.6329, lon: 139.8804,
    booking: { label: "Official Tokyo Disney Resort tickets", url: "https://www.tokyodisneyresort.jp/en/ticket/index.html" },
    source: { label: "tokyodisneyresort.jp", url: "https://www.tokyodisneyresort.jp/en/tdl/" },
    score: 94, tags: ["theme park", "family"], weather: "mixed",
    family: { together: true, stroller: "good", carrier: "not needed", babyFacilities: "Baby Center with nursing rooms, changing tables and baby supplies; stroller rental", ageRule: "Ages 3 and under free. Rider Switch on height-restricted rides." },
    blurb: "Disney done the Japanese way: spotless, very committed fans, great parades. A weekday after New Year has the shortest queues.",
    does: ["Space Mountain, Splash Mountain and Big Thunder for the adults via Rider Switch", "The Enchanted Tale of Beauty and the Beast", "Afternoon parade, then the castle projection at night", "Popcorn carts: every cart sells a different flavour"],
    tip: "Tickets are dated and sold online only, opening two months ahead at 2 pm JST. Use the app to book Premier Access.",
    scene: "castle", photoQuery: "Tokyo Disneyland Cinderella Castle",
  }),

  /* ---------------- Shanghai ---------------- */
  act({ id: "maglev", title: "Maglev at 300 km/h", region: "sha", city: "sha", modes: T, duration: "8 minutes", cost: est(50, "CNY"), place: "Shanghai Maglev Pudong Airport Station", lat: 31.1500, lon: 121.8050, score: 88, tags: ["technology", "speed"], weather: "indoor", family: FAM_OK,
    blurb: "The world's fastest commercial train, from Pudong Airport into the city.", does: ["Follow the Maglev signs after customs", "30 km in about 8 minutes, leaning into the curves", "Change to Line 2 at Longyang Rd"], tip: "Top speed only runs at certain times; check the board.", scene: "maglev", photoQuery: "Shanghai Maglev train",
    source: { label: "Shanghai Maglev (Wikipedia)", url: "https://en.wikipedia.org/wiki/Shanghai_maglev_train" } }),
  act({ id: "lsnow", title: "L+SNOW indoor ski centre", region: "sha", city: "sha", modes: TS, fullDay: true, slots: 3, duration: "Full day", cost: est(420, "CNY", "per-adult", "4-hour ski ticket; Snow World ~220 RMB"), place: "L+SNOW Indoor Skiing Shanghai", lat: 30.8960, lon: 121.9260, score: 84, tags: ["snow", "adrenaline"], weather: "indoor", family: { ...FAM_CARRIER, babyFacilities: "Cold zone; baby stays in the warm area with one adult", ageRule: "Slopes for walkers only" },
    blurb: "The world's biggest indoor ski centre: real snow, real slopes, gear included.", does: ["Ski or board for 4 hours (beginner slope + lessons)", "Or sledding and tubing in Snow World", "Haichang Ocean Park next door"], tip: "Line 16 to Dishui Lake, then a short bus.", scene: "ski", photoQuery: "Shanghai indoor ski" }),
  act({ id: "sci", title: "Science & Technology Museum", region: "sha", city: "sha", modes: T, slots: 2, duration: "2–3 hours", cost: est(45, "CNY", "per-adult", "Book with passports via WeChat"), place: "Shanghai Science and Technology Museum", lat: 31.2190, lon: 121.5440, score: 82, tags: ["technology", "interactive", "indoor"], weather: "indoor", family: FAM_OK,
    blurb: "Fifteen minutes from the hotel on Line 2. Robots, simulators and hands-on experiments.", does: ["Robot zone, with a robot that plays you at Go", "Earthquake and space simulators", "Light and sound experiments"], tip: "Closed Mondays.", scene: "rocket", photoQuery: "Shanghai Science and Technology Museum",
    source: { label: "Official site", url: "https://www.sstm.org.cn/" } }),
  act({ id: "escape", title: "English escape room or VR arcade", region: "sha", city: "sha", modes: S, duration: "1–2 hours", cost: est(200, "CNY"), place: "escape room Shanghai English", lat: 31.2304, lon: 121.4737, score: 70, tags: ["interactive", "night"], weather: "indoor", family: FAM_NO,
    blurb: "Shanghai has English-language escape rooms and free-roam VR arcades.", does: ["Get locked in a themed room", "Solve puzzles in 60 minutes", "Or VR shooters and racing rigs"], scene: "key", photoQuery: "escape room" }),
  act({ id: "zoo", title: "Shanghai Wild Animal Park", region: "sha", city: "sha", modes: T, slots: 2, duration: "Half day", cost: est(130, "CNY"), place: "Shanghai Wild Animal Park", lat: 31.0560, lon: 121.7200, score: 72, tags: ["animals", "family"], weather: "outdoor", weatherSensitive: true, family: FAM_OK,
    blurb: "Safari park with pandas and a caged bus through the big-animal zone.", does: ["Caged bus through the lion and bear zone", "Giant pandas", "Animal shows"], scene: "panda", photoQuery: "Shanghai Wild Animal Park" }),

  /* ---------------- Fukuoka & Kyushu (3-day rental car) ---------------- */
  act({ id: "beppu", title: "Beppu private onsen + boiling 'Hells'", region: "kyushu", city: "fuk", modes: T, fullDay: true, slots: 3, duration: "Day trip (2 hrs by car or train)", cost: est(3000, "JPY", "per-group", "Private family bath per hour"), place: "Beppu Jigoku", lat: 33.3150, lon: 131.4730, score: 90, tags: ["onsen", "nature", "volcanic", "road trip"], weather: "mixed", family: { together: true, stroller: "partial", carrier: "recommended", babyFacilities: "Private (kashikiri) baths let the baby join; nappies not allowed in shared baths" },
    blurb: "Japan's hot-spring capital, with steam rising out of the streets. Rent a private outdoor bath just for your group.", does: ["Drive the Oita Expressway (~2 hrs)", "Rent a kashikiri family bath", "Walk the bright-blue and blood-red 'Hells'", "Continue to Yufuin"], scene: "onsen", photoQuery: "Beppu Umi Jigoku" }),
  act({ id: "aso", title: "Mt Aso caldera drive", region: "kyushu", city: "fuk", modes: T, fullDay: true, slots: 3, duration: "Day trip (2 hrs each way)", cost: est(null, "JPY", "free", "Free to drive; crater access depends on volcanic gas"), place: "Kusasenri Aso", lat: 32.8840, lon: 131.0630, score: 80, tags: ["volcano", "nature", "road trip", "mountains"], weather: "outdoor", weatherSensitive: true, family: FAM_CARRIER,
    blurb: "One of the world's largest calderas. Drive across grassland to an active crater that steams.", does: ["Drive up to Kusasenri meadow", "Crater rim if gas levels allow", "Daikanbo lookout over the caldera"], tip: "Crater access closes often for gas or eruptions, and roads can ice in late December. Check the Aso volcano status page that morning.", scene: "fuji", photoQuery: "Mount Aso Nakadake crater" }),
  act({ id: "itoshima", title: "Itoshima coast drive + glass-blowing", region: "kyushu", city: "fuk", modes: T, slots: 2, duration: "Half day", cost: est(3500, "JPY", "per-adult", "Glass-blowing workshop"), place: "Itoshima Futamigaura", lat: 33.6380, lon: 130.1980, score: 74, tags: ["coast", "hands-on", "road trip"], weather: "mixed", weatherSensitive: true, family: FAM_OK,
    blurb: "A 45-minute coastal drive west of Fukuoka with a sea torii gate and craft workshops where you make your own glass.", does: ["Drive the coastal road to Futamigaura", "Make your own glass cup at a workshop", "Swing at the beach swings"], scene: "ocean", photoQuery: "Futamigaura Itoshima" }),
  act({ id: "ezo", title: "BOSS E·ZO rooftop rides", region: "fuk", city: "fuk", modes: TS, slots: 1, duration: "2–3 hours", cost: est(1500, "JPY", "per-adult", "per ride"), place: "BOSS E-ZO Fukuoka", lat: 33.5953, lon: 130.3622, score: 86, tags: ["adrenaline", "baseball", "VR"], weather: "mixed", weatherSensitive: true, family: { ...FAM_OK, ageRule: "Height limits on the rooftop rides" },
    blurb: "Thrill rides bolted to the outside of a building next to the baseball stadium.", does: ["Tsuri-ZO: a one-seat coaster hanging off the roof edge", "Sube-ZO: tube slide down the building", "Batting and pitching games in the Oh Sadaharu museum"], scene: "rooftop", photoQuery: "BOSS E-ZO Fukuoka",
    source: { label: "e-zofukuoka.com", url: "https://e-zofukuoka.com/" } }),
  act({ id: "uminonakamichi", title: "Uminonakamichi Seaside Park + aquarium", region: "fuk", city: "fuk", modes: T, slots: 2, duration: "Half day", cost: est(2500, "JPY"), place: "Marine World Uminonakamichi", lat: 33.6610, lon: 130.3640, score: 70, tags: ["animals", "family"], weather: "mixed", family: FAM_OK,
    blurb: "Big seaside park with a dolphin aquarium: easy with a stroller and a car.", does: ["Dolphin and sea lion show", "Petting zoo area", "Cycle the park"], scene: "ocean", photoQuery: "Marine World Uminonakamichi" }),

  /* ---------------- Osaka & Kansai ---------------- */
  act({ id: "round1", title: "Round1 Spo-Cha all-nighter", region: "osa", city: "osa", modes: TS, slots: 1, duration: "3 hours to all night", cost: est(2900, "JPY"), place: "Round1 Stadium Sennichimae", lat: 34.6655, lon: 135.5045, score: 89, tags: ["batting cages", "arcade", "sport"], weather: "indoor", family: { ...FAM_NO, babyFacilities: "Daytime only for under-16s; best for Darius at night" },
    blurb: "A 24-hour multi-storey sports arcade. One ticket, unlimited goes.", does: ["Batting cages, archery, bubble soccer", "Mini motorbikes and drift trikes", "Arcades, karaoke and bowling"], scene: "neon", photoQuery: "Round1 Stadium" }),
  act({ id: "noodle", title: "Make your own Cup Noodle", region: "osa", city: "osa", modes: T, duration: "1.5 hours", cost: est(500, "JPY", "per-adult", "per cup"), place: "Cupnoodles Museum Osaka Ikeda", lat: 34.8222, lon: 135.4258, score: 78, tags: ["hands-on", "food"], weather: "indoor", family: FAM_OK,
    blurb: "Design your own cup, pick the flavour, and watch the machine seal it.", does: ["Draw on a blank cup", "Choose soup and four toppings", "Watch it sealed and air-bagged"], tip: "Closed Tuesdays and over New Year.", scene: "noodle", photoQuery: "Cupnoodles Museum Ikeda" }),
  act({ id: "nara", title: "Feed the Nara deer", region: "kansai", city: "osa", modes: T, slots: 2, duration: "Half day", cost: est(200, "JPY", "per-group", "Deer crackers"), place: "Nara Park", lat: 34.6851, lon: 135.8430, score: 80, tags: ["animals", "nature"], weather: "outdoor", weatherSensitive: true, family: FAM_CARRIER,
    blurb: "Over 1,000 wild deer that bow for crackers.", does: ["Aoniyoshi train from Osaka", "Buy crackers and bow", "Get mobbed, laugh, repeat"], scene: "deer", photoQuery: "Nara Park deer" }),

  /* ---------------- Tokyo ---------------- */
  act({ id: "kart", title: "Go-karts at City Circuit Tokyo Bay", region: "tok", city: "tok", modes: S, duration: "2 hours", cost: est(2500, "JPY", "per-adult", "per session"), place: "City Circuit Tokyo Bay", lat: 35.6250, lon: 139.7810, score: 87, tags: ["go-kart", "adrenaline"], weather: "outdoor", weatherSensitive: true, family: FAM_NO,
    blurb: "Outdoor electric go-kart track in Odaiba. No licence needed.", does: ["Briefing, helmet, timed laps", "Printed lap times", "Joypolis next door"], scene: "kart", photoQuery: "go-kart circuit" }),
  act({ id: "teamlab", title: "teamLab Planets", region: "tok", city: "tok", modes: T, duration: "2 hours", cost: est(3800, "JPY", "per-adult", "Dated tickets; under-3s free"), place: "teamLab Planets TOKYO", lat: 35.6491, lon: 139.7898, score: 85, tags: ["technology", "interactive", "art"], weather: "indoor", family: { together: true, stroller: "no", carrier: "required", babyFacilities: "Strollers are left at the entrance; carry the baby. You wade through knee-deep water barefoot.", ageRule: "All ages" },
    blurb: "Walk barefoot through water and light installations that react to you.", does: ["Wade through a glowing koi pond", "Lie under the infinity crystal universe", "Moss garden of floating orbs"], scene: "neon", photoQuery: "teamLab Planets Tokyo",
    booking: { label: "teamLab tickets", url: "https://www.teamlab.art/e/planets/" }, source: { label: "teamlab.art", url: "https://www.teamlab.art/e/planets/" } }),
  act({ id: "miraikan", title: "Miraikan: robots & future tech", region: "tok", city: "tok", modes: T, slots: 2, duration: "3 hours", cost: est(630, "JPY"), place: "Miraikan National Museum of Emerging Science and Innovation", lat: 35.6190, lon: 139.7765, score: 79, tags: ["technology", "interactive"], weather: "indoor", family: FAM_OK,
    blurb: "Japan's science-of-the-future museum, with humanoid robot demos and a giant glowing globe.", does: ["Android and robot demos", "Geo-Cosmos globe", "Hands-on AI and space exhibits"], tip: "Closed Tuesdays and over New Year; check the calendar.", scene: "rocket", photoQuery: "Miraikan Geo-Cosmos",
    source: { label: "miraikan.jst.go.jp", url: "https://www.miraikan.jst.go.jp/en/" } }),
  act({ id: "sumo", title: "Sumo morning practice", region: "tok", city: "tok", modes: S, duration: "2–3 hours", cost: est(10000, "JPY", "per-adult", "Guided tour"), place: "Ryogoku sumo stable", lat: 35.6967, lon: 139.7935, score: 81, tags: ["culture", "unusual"], weather: "indoor", family: FAM_NO,
    blurb: "Sit a few metres from wrestlers training before the January tournament.", does: ["Meet a guide in Ryogoku ~7 am", "Watch full-power practice bouts in silence", "Questions and maybe a photo"], scene: "sumo", photoQuery: "sumo practice keiko" }),
  act({ id: "bat", title: "Batting cages, Tokyo style", region: "tok", city: "tok", modes: TS, duration: "1 hour", cost: est(400, "JPY", "per-adult", "per 20 balls"), place: "Meiji Jingu Gaien Batting Dome", lat: 35.6750, lon: 139.7180, score: 83, tags: ["batting cages", "sport"], weather: "indoor", family: FAM_OK,
    blurb: "Pick your pitch speed up to 150 km/h. Open late.", does: ["Choose a speed", "20–25 pitches per go", "Gaien also has a winter ice rink"], scene: "bat", photoQuery: "batting center Japan" }),
  act({ id: "gacha", title: "Ikebukuro: 3,000 gacha machines", region: "tok", city: "tok", modes: T, slots: 1, duration: "Half day", cost: est(400, "JPY", "per-adult", "per go"), place: "Gashapon Bandai Official Shop Ikebukuro", lat: 35.7290, lon: 139.7190, score: 76, tags: ["vending machines", "unusual"], weather: "indoor", family: FAM_OK,
    blurb: "Over 3,000 capsule-toy machines in one place.", does: ["Get a bag of ¥100 coins", "Turn the handle, see what falls out", "Sunshine City aquarium next door"], scene: "gacha", photoQuery: "gashapon machines" }),
  act({ id: "snack", title: "Vending machine bingo + snack hunt", region: "tok", city: "tok", modes: T, duration: "Whenever", cost: est(1000, "JPY", "per-group"), place: "Tokyo vending machines", lat: 35.6812, lon: 139.7671, score: 74, tags: ["vending machines", "snacks"], weather: "mixed", family: FAM_OK,
    blurb: "A vending machine on nearly every corner. Make it a game.", does: ["Bingo: hot corn soup, ice cream, a machine that talks", "Nightly konbini mystery snack", "Rank the snacks at the end"], scene: "vending", photoQuery: "Japanese vending machines" }),
  act({ id: "small", title: "SMALL WORLDS figurine scan", region: "tok", city: "tok", modes: T, slots: 2, duration: "2–3 hours", cost: est(2700, "JPY"), place: "SMALL WORLDS TOKYO", lat: 35.6300, lon: 139.7920, score: 75, tags: ["technology", "miniatures"], weather: "indoor", family: FAM_OK,
    blurb: "Huge indoor miniature world; get scanned into a 1:80 figure.", does: ["Watch tiny planes taxi", "3D-scan booth", "Your figure joins the model later"], tip: "Ask about overseas shipping before paying.", scene: "mini", photoQuery: "SMALL WORLDS Tokyo miniature" }),
  act({ id: "fish", title: "Fishing beside the train tracks", region: "tok", city: "tok", modes: T, duration: "1–2 hours", cost: est(800, "JPY", "per-adult", "per hour"), place: "Ichigaya Fish Center", lat: 35.6915, lon: 139.7355, score: 71, tags: ["unusual", "hands-on"], weather: "outdoor", weatherSensitive: true, family: FAM_OK,
    blurb: "Fish for carp in central Tokyo as commuter trains pass every few minutes.", does: ["Rent a rod and bait", "Catch carp for points", "Swap points for prizes"], scene: "fish", photoQuery: "Ichigaya fishing pond" }),
  act({ id: "taiko", title: "Taiko drumming lesson", region: "tok", city: "tok", modes: S, duration: "1–2 hours", cost: est(4000, "JPY"), place: "taiko lesson Asakusa", lat: 35.7148, lon: 139.7967, score: 73, tags: ["hands-on", "music"], weather: "indoor", family: FAM_NO,
    blurb: "Loud and physical beginner class on festival drums.", does: ["Stance and sticks", "Group rhythm practice", "Play a short piece"], scene: "drum", photoQuery: "taiko drums" }),
  act({ id: "basho", title: "Sumo tournament, Day 1", region: "tok", city: "tok", modes: S, duration: "Afternoon", cost: est(3800, "JPY"), place: "Ryogoku Kokugikan", lat: 35.6969, lon: 139.7932, score: 68, tags: ["sport", "culture"], weather: "indoor", family: FAM_NO,
    blurb: "January tournament opens on your last day, if you fly late.", does: ["Lower divisions after lunch", "Top division from ~4 pm", "Yakitori inside the arena"], scene: "sumo", photoQuery: "Ryogoku Kokugikan sumo" }),

  /* ---------------- Fuji Five Lakes ---------------- */
  act({ id: "fuji-view", title: "Mt Fuji foothills viewing day", region: "fuji", city: "tok", modes: T, fullDay: true, slots: 3, flexible: true, weatherSensitive: true, duration: "Day trip or overnight", cost: est(null, "JPY", "free", "Free viewpoints; fuel, tolls and parking in the budget"), place: "Lake Kawaguchi Oishi Park", lat: 35.5235, lon: 138.7445, score: 95, tags: ["nature", "mountains", "road trip"], weather: "outdoor", family: { ...FAM_CARRIER, babyFacilities: "Toilets at the lake parks and roadside stations" },
    blurb: "Clear winter mornings give the year's best Fuji views. This is viewing from the foothills, not climbing.", does: ["Sunrise at Lake Yamanaka or Lake Kawaguchi", "Chureito Pagoda viewpoint (398 steps)", "Oshino Hakkai spring ponds"], tip: "Floating day: use the Fuji weather planner to pick the clearest date.", scene: "fuji", photoQuery: "Mount Fuji Lake Kawaguchi winter",
    source: { label: "Fujiyoshida tourism", url: "https://fujiyoshida.net/en" } }),
  act({ id: "fujiq", title: "Fuji-Q Highland coasters", region: "fuji", city: "tok", modes: ["turns", "solo"], fullDay: true, slots: 3, duration: "Most of a day", cost: est(6800, "JPY", "per-adult", "Free entry; 1-day ride pass"), place: "Fuji-Q Highland", lat: 35.4875, lon: 138.7800, score: 86, tags: ["adrenaline", "theme park"], weather: "outdoor", weatherSensitive: true, family: { together: true, stroller: "good", carrier: "not needed", babyFacilities: "Nursing rooms; kids' area 'Thomas Land' is next door", ageRule: "Big coasters have height and age limits" },
    blurb: "Some of the most extreme coasters on Earth, at the foot of Fuji.", does: ["Eejanaika, the spinning-seat coaster", "Dodonpa launches to 180 km/h", "Take turns while the other adult stays with the baby"], tip: "Coasters stop in strong wind, so it's a weather-sensitive day.", scene: "coaster", photoQuery: "Fuji-Q Highland roller coaster",
    booking: { label: "Fuji-Q tickets", url: "https://www.fujiq.jp/en/" }, source: { label: "fujiq.jp", url: "https://www.fujiq.jp/en/" } }),
  act({ id: "icecave", title: "Narusawa Ice Cave + Fugaku Wind Cave", region: "fuji", city: "tok", modes: ["split", "solo"], slots: 2, duration: "2 hours", cost: est(350, "JPY", "per-adult", "per cave"), place: "Narusawa Ice Cave", lat: 35.4720, lon: 138.6670, score: 77, tags: ["nature", "caves", "unusual"], weather: "mixed", family: { together: false, stroller: "no", carrier: "required", babyFacilities: "Low ceilings and icy steps: one adult stays out with the baby", ageRule: "Crouching needed" },
    blurb: "Lava-tube caves in the Aokigahara forest that stay icy all year.", does: ["Crawl through low lava tubes", "Ice pillars in the cave", "Walk the mossy lava forest"], scene: "ski", photoQuery: "Narusawa Ice Cave" }),
  act({ id: "paraglide", title: "Tandem paragliding near Fuji", region: "fuji", city: "tok", modes: ["solo", "turns"], adultOnly: true, slots: 2, flexible: true, weatherSensitive: true, duration: "Half day incl. waiting for wind", cost: est(17000, "JPY", "per-adult", "Typical tandem flight; operator-dependent"), place: "Asagiri Plateau paragliding", lat: 35.4110, lon: 138.5880, score: 78, tags: ["adrenaline", "flying", "mountains"], weather: "outdoor", family: { ...FAM_NO, ageRule: "Adults only; weight limits apply; operator decides on the day" },
    blurb: "Fly tandem off a ridge facing Mt Fuji. Whether it runs is up to the operator and the wind.", does: ["Book a tandem flight with an operator in Asagiri or Fuji Five Lakes", "Check-in, ground briefing, wait for the wind", "10–20 minute flight with an instructor"], tip: "Backup if cancelled: Fuji-Q or the lava caves the same day. Operators cancel for wind, rain or poor visibility.", scene: "fuji", photoQuery: "paragliding Mount Fuji",
    booking: { label: "Find an operator", url: search("Asagiri Plateau tandem paragliding English booking") } }),

  /* ---------------- Hakone ---------------- */
  act({ id: "owakudani", title: "Owakudani volcanic valley by ropeway", region: "hakone", city: "tok", modes: T, slots: 2, weatherSensitive: true, duration: "Half day", cost: est(2500, "JPY", "per-adult", "Ropeway return"), place: "Owakudani", lat: 35.2440, lon: 139.0190, score: 82, tags: ["volcanic", "nature", "mountains"], weather: "outdoor", family: FAM_OK,
    blurb: "Ride a gondola over steaming sulphur vents and eat eggs boiled black in the hot springs.", does: ["Ropeway over the steaming crater", "Black eggs boiled in the vents", "Fuji view on clear days"], tip: "The ropeway stops in strong wind or when gas levels rise.", scene: "onsen", photoQuery: "Owakudani Hakone" }),
  act({ id: "hakone-onsen", title: "Hakone private-bath ryokan overnight", region: "hakone", city: "tok", modes: T, fullDay: true, slots: 3, duration: "1 night", cost: est(30000, "JPY", "per-group"), place: "Hakone Yumoto", lat: 35.2330, lon: 139.1060, score: 80, tags: ["onsen", "overnight"], weather: "indoor", family: { together: true, stroller: "partial", carrier: "recommended", babyFacilities: "Choose a room with a private bath so the baby can join" },
    blurb: "A night in a traditional inn with your own hot-spring bath.", does: ["Kaiseki dinner", "Private bath", "Futons on tatami"], scene: "onsen", photoQuery: "Hakone ryokan" }),

  /* ---------------- Izu ---------------- */
  act({ id: "izu", title: "Capybara hot bath at Izu Shaboten Zoo", region: "izu", city: "tok", modes: T, slots: 2, duration: "Half day", cost: est(2700, "JPY"), place: "Izu Shaboten Zoo", lat: 34.8970, lon: 139.1340, score: 84, tags: ["animals", "unusual"], weather: "outdoor", family: FAM_OK,
    blurb: "Capybaras soaking in a yuzu-filled hot bath, only in winter.", does: ["Watch the capybara bath", "Feed the animals", "Mt Omuro lift next door"], scene: "capy", photoQuery: "capybara onsen Izu Shaboten" }),
  act({ id: "jogasaki", title: "Jogasaki coast suspension bridge", region: "izu", city: "tok", modes: T, duration: "1–2 hours", cost: est(null, "JPY", "free"), place: "Jogasaki Coast Kadowaki Suspension Bridge", lat: 34.8950, lon: 139.1420, score: 72, tags: ["coast", "nature", "adrenaline"], weather: "outdoor", weatherSensitive: true, family: FAM_CARRIER,
    blurb: "A 48 m long, 23 m high suspension bridge over crashing waves on lava cliffs.", does: ["Cross the swaying bridge", "Cliff-top trail", "Lighthouse lookout"], scene: "ocean", photoQuery: "Jogasaki Kadowaki suspension bridge" }),

  /* ---------------- Nikko ---------------- */
  act({ id: "edo", title: "Edo Wonderland ninja town", region: "nikko", city: "tok", modes: T, fullDay: true, slots: 3, duration: "Full day", cost: est(5800, "JPY"), place: "Edo Wonderland Nikko Edomura", lat: 36.8350, lon: 139.7180, score: 78, tags: ["interactive", "culture"], weather: "mixed", family: FAM_OK,
    blurb: "A full Edo-period town where staff stay in character; throw shuriken and watch ninja shows.", does: ["Shuriken throwing", "Ninja and samurai shows", "Dress up in costume"], tip: "Winter hours are shorter; check closing days.", scene: "key", photoQuery: "Edo Wonderland Nikko" }),
  act({ id: "kegon", title: "Frozen waterfalls at Lake Chuzenji", region: "nikko", city: "tok", modes: T, slots: 2, weatherSensitive: true, duration: "Half day", cost: est(600, "JPY"), place: "Kegon Falls", lat: 36.7380, lon: 139.5020, score: 74, tags: ["nature", "mountains", "winter"], weather: "outdoor", family: FAM_CARRIER,
    blurb: "A 97 m waterfall that partly freezes in winter, reached by an elevator to the gorge floor.", does: ["Elevator to the viewing platform", "Ryuzu Falls nearby", "Lake Chuzenji shore"], tip: "Irohazaka hairpin road is icy in winter: winter tyres mandatory, chains in the car.", scene: "ski", photoQuery: "Kegon Falls winter" }),

  /* ---------------- Chichibu ---------------- */
  act({ id: "icicles", title: "Chichibu icicle walls (Misotsuchi)", region: "chichibu", city: "tok", modes: T, slots: 2, weatherSensitive: true, duration: "Half day", cost: est(200, "JPY"), place: "Misotsuchi no Tsurara", lat: 35.9590, lon: 138.9220, score: 73, tags: ["nature", "winter", "unusual"], weather: "outdoor", family: FAM_CARRIER,
    blurb: "Giant icicle walls along a river cliff, lit up at night in mid-winter.", does: ["Walk the riverside path", "Evening light-up if running", "Seibu Chichibu onsen after"], tip: "Usually forms from early January when it's cold enough; check that the season has opened.", scene: "ski", photoQuery: "Misotsuchi icicles Chichibu" }),

  /* ---------------- Kamakura / Enoshima ---------------- */
  act({ id: "enoden", title: "Enoden seaside train + Enoshima caves", region: "kamakura", city: "tok", modes: T, slots: 2, duration: "Half day", cost: est(1000, "JPY"), place: "Enoshima Iwaya Caves", lat: 35.2960, lon: 139.4740, score: 74, tags: ["coast", "caves"], weather: "mixed", family: FAM_CARRIER,
    blurb: "A little train between houses and the beach, then sea caves lit by candle.", does: ["Ride the Enoden", "Cross to Enoshima island", "Explore the Iwaya sea caves"], scene: "enoden", photoQuery: "Enoden Kamakura" }),
  act({ id: "enoaq", title: "Enoshima Aquarium", region: "kamakura", city: "tok", modes: T, duration: "2 hours", cost: est(2800, "JPY"), place: "Enoshima Aquarium", lat: 35.3090, lon: 139.4810, score: 70, tags: ["animals", "family"], weather: "indoor", family: FAM_OK,
    blurb: "Jellyfish galleries and a dolphin show facing the sea and Fuji.", does: ["Jellyfish fantasy hall", "Dolphin show", "Touch pools"], scene: "ocean", photoQuery: "Enoshima Aquarium" }),

  /* ---------------- Minakami / Yuzawa ---------------- */
  act({ id: "gala", title: "Ski day at GALA Yuzawa", region: "yuzawa", city: "tok", modes: ["solo", "split"], fullDay: true, slots: 3, weatherSensitive: true, duration: "Full day", cost: est(12000, "JPY", "per-adult", "Lift + rental"), place: "GALA Yuzawa", lat: 36.9500, lon: 138.7870, score: 79, tags: ["snow", "adrenaline", "mountains"], weather: "outdoor", family: { ...FAM_NO, babyFacilities: "Kids' snow area exists, but a 1-year-old is best kept in Tokyo" },
    blurb: "The bullet train stops inside the ski resort.", does: ["Shinkansen ~75 min", "Rent gear at the station", "Ski all day, back for dinner"], tip: "Go by train, not car: Kan-Etsu Expressway gets heavy snow and chain controls.", scene: "ski", photoQuery: "GALA Yuzawa",
    source: { label: "gala.co.jp", url: "https://gala.co.jp/winter/english/" } }),
  act({ id: "snowshoe", title: "Minakami snowshoe hike", region: "minakami", city: "tok", modes: S, slots: 2, weatherSensitive: true, duration: "Half day", cost: est(7000, "JPY"), place: "Minakami snowshoe tour", lat: 36.6780, lon: 138.9990, score: 72, tags: ["snow", "nature", "mountains"], weather: "outdoor", family: FAM_NO,
    blurb: "Guided snowshoe tour in deep powder forest.", does: ["Gear and guide included", "Forest trail through deep snow", "Onsen afterwards"], scene: "ski", photoQuery: "Minakami snowshoe" }),
];

/** Extra cards so the adults can split up (one with the baby, one doing something wild). */
export const SPLIT_IDEAS: Activity[] = [
  act({ id: "split-joypolis", title: "Split: Joypolis VR vs. Odaiba playground", region: "tok", city: "tok", modes: SPLIT, slots: 1, duration: "2–3 hours", cost: est(5000, "JPY", "per-adult", "Joypolis passport"), place: "Tokyo Joypolis", lat: 35.6285, lon: 139.7755, score: 69, tags: ["VR", "arcade"], weather: "indoor", family: { ...FAM_OK, babyFacilities: "Baby stays with one parent at the Decks indoor play area next door" },
    blurb: "One group does indoor VR and motion rides; the other takes the baby to the indoor play area in the same mall.", does: ["Half Pipe Tokyo and VR rides", "Meet up for dinner in the same building"], scene: "neon", photoQuery: "Tokyo Joypolis" }),
];

export const ALL_ACTIVITIES: Activity[] = [...ACTIVITIES, ...SPLIT_IDEAS];
export const ACT_BY_ID: Record<string, Activity> = Object.fromEntries(ALL_ACTIVITIES.map((a) => [a.id, a]));

export const SKIPPED: [string, string][] = [
  ["Mt Fuji summit climb", "closed in winter; the official climbing season is summer only. Not recommended."],
  ["Takaragawa Onsen", "mixed river baths and long drive; babies in nappies not allowed"],
  ["Hokkaido", "skipped by choice: −10°C and extra flights"],
  ["Takachiho Gorge", "3 hours each way from Fukuoka"],
  ["Kamikochi", "closed in winter"],
];
