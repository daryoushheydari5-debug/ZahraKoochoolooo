import type { CityId } from "../types";

export type PlaceKind = "town" | "village" | "nature";

/** Towns, villages and landscapes worth a day out from each base. Times are typical, not quotes. */
export interface Place {
  id: string;
  name: string;
  kind: PlaceKind;
  base: CityId;
  lat: number;
  lon: number;
  /** How long it takes from the base city, and how. */
  from: string;
  blurb: string;
  /** Something to know for late December / early January. */
  winter?: string;
  photoQuery: string;
  scene: string;
  /** An Explore activity that happens here. */
  activity?: string;
}

const P = (p: Place) => p;

export const PLACES: Place[] = [
  // Around Shanghai
  P({ id: "zhujiajiao", name: "Zhujiajiao water town", kind: "village", base: "sha", lat: 31.1100, lon: 121.0520, from: "About 1 hour by Metro Line 17", blurb: "A canal village of stone bridges and wooden boats, inside Shanghai's own borders. Ride a hand-rowed boat under the 400-year-old Fangsheng Bridge.", photoQuery: "Zhujiajiao water town canal", scene: "enoden" }),
  P({ id: "wuzhen", name: "Wuzhen", kind: "town", base: "sha", lat: 30.7450, lon: 120.4880, from: "About 2 hours by coach or car", blurb: "The best-kept of the Jiangnan water towns. Xizha is lit up after dark, with boats gliding past lantern-lined houses.", winter: "Stay for the evening lights; it's quiet and cold in December.", photoQuery: "Wuzhen Xizha night canal", scene: "neon" }),

  // Around Fukuoka (rental car days)
  P({ id: "yufuin", name: "Yufuin", kind: "town", base: "fuk", lat: 33.2650, lon: 131.3560, from: "1h40 by car, or 2 hours by train", blurb: "A hot-spring town under the twin peak of Mt Yufu. Morning mist rises off Lake Kinrin, which stays warm all winter.", winter: "Go early for the mist on the lake on cold mornings.", photoQuery: "Lake Kinrin Yufuin morning mist", scene: "onsen", activity: "yufuinfloral" }),
  P({ id: "beppu", name: "Beppu", kind: "town", base: "fuk", lat: 33.3150, lon: 131.4750, from: "About 2 hours by car", blurb: "Steam pours out of the ground all over town. See the boiling red and blue 'hells' and bury yourself in a hot sand bath.", photoQuery: "Beppu Umi Jigoku steam", scene: "onsen", activity: "beppu" }),
  P({ id: "kurokawa", name: "Kurokawa Onsen", kind: "village", base: "fuk", lat: 33.0760, lon: 131.1420, from: "About 2 hours by car", blurb: "A tiny valley village of riverside baths. Buy a wooden pass and hop between three outdoor pools in the forest.", photoQuery: "Kurokawa Onsen village", scene: "onsen" }),
  P({ id: "aso", name: "Mt Aso & Kusasenri", kind: "nature", base: "fuk", lat: 32.8850, lon: 131.0850, from: "About 2 hours by car", blurb: "One of the world's biggest volcanic calderas. Drive across the golden grassland of Kusasenri and look into a smoking crater.", winter: "The crater area closes when gas is high or roads are icy; check the Aso volcano status that morning.", photoQuery: "Kusasenri Mount Aso", scene: "fuji" }),
  P({ id: "takachiho", name: "Takachiho Gorge", kind: "nature", base: "fuk", lat: 32.7020, lon: 131.3010, from: "About 3 hours by car", blurb: "A narrow basalt gorge with a waterfall dropping into the river. Row a boat right up to it.", photoQuery: "Takachiho Gorge Manai Falls", scene: "fuji", activity: "takachiho" }),
  P({ id: "yanagawa", name: "Yanagawa", kind: "town", base: "fuk", lat: 33.1630, lon: 130.4050, from: "About 50 minutes by Nishitetsu train", blurb: "A canal town you see from a punted boat. In winter the boats have heated kotatsu tables under a blanket.", winter: "The kotatsu boats run from December to February.", photoQuery: "Yanagawa canal boat", scene: "enoden" }),
  P({ id: "itoshima", name: "Itoshima coast", kind: "nature", base: "fuk", lat: 33.6400, lon: 130.1850, from: "About 45 minutes by car", blurb: "Surf beaches and the 'wedded rocks' of Sakurai Futamigaura, joined by a rope with a white torii gate in the sea.", photoQuery: "Sakurai Futamigaura Itoshima", scene: "ocean" }),
  P({ id: "akiyoshidai", name: "Akiyoshidai plateau", kind: "nature", base: "fuk", lat: 34.2350, lon: 131.3070, from: "About 2 hours by car", blurb: "Japan's biggest karst plateau, with grey limestone pillars poking out of the grass, and a huge cave underneath.", photoQuery: "Akiyoshidai karst plateau", scene: "fuji", activity: "akiyoshido" }),
  P({ id: "motonosumi", name: "Motonosumi Shrine", kind: "nature", base: "fuk", lat: 34.4160, lon: 131.0640, from: "About 2.5 hours by car", blurb: "123 red torii gates snake down a cliff to the Sea of Japan. Try to throw a coin into the offering box on top of the tallest gate.", photoQuery: "Motonosumi Shrine torii", scene: "ocean" }),
  P({ id: "okawachiyama", name: "Okawachiyama pottery village", kind: "village", base: "fuk", lat: 33.2550, lon: 129.8930, from: "About 1.5 hours by car", blurb: "A hidden valley of kilns and smoke chimneys that once made porcelain for the lords. Try your hand at painting a plate.", photoQuery: "Okawachiyama Imari village", scene: "train" }),

  // Around Osaka
  P({ id: "nara", name: "Nara", kind: "town", base: "osa", lat: 34.6850, lon: 135.8430, from: "About 1 hour by train", blurb: "Over a thousand bowing deer roam the park. Buy deer crackers and see who bows back.", photoQuery: "Nara Park deer", scene: "deer", activity: "nara" }),
  P({ id: "arashiyama", name: "Arashiyama & Hozu Gorge", kind: "nature", base: "osa", lat: 35.0170, lon: 135.6720, from: "About 1 hour by train", blurb: "Bamboo groves and a river gorge on Kyoto's western edge. Ride the old Sagano scenic train through the gorge.", winter: "The Sagano train usually stops for winter from late December; see the activity for dates.", photoQuery: "Hozu River gorge Arashiyama", scene: "train", activity: "torokko" }),
  P({ id: "kibune", name: "Kurama & Kibune", kind: "village", base: "osa", lat: 35.1170, lon: 135.7700, from: "About 1.5 hours by train", blurb: "Two mountain villages joined by a forest trail over tree roots, with a lantern-lined shrine stairway at Kibune.", winter: "Kibune's stairs look magical with a dusting of snow; the trail can be slippery.", photoQuery: "Kifune Shrine lanterns", scene: "onsen" }),
  P({ id: "miyama", name: "Miyama thatched village", kind: "village", base: "osa", lat: 35.2920, lon: 135.5370, from: "About 2.5 hours by car or bus", blurb: "Around 40 thatched-roof farmhouses in a quiet mountain valley north of Kyoto.", photoQuery: "Miyama Kayabuki no Sato", scene: "train" }),
  P({ id: "ine", name: "Ine fishing village", kind: "village", base: "osa", lat: 35.6750, lon: 135.2880, from: "About 3 hours by car or train and bus", blurb: "Boat houses built right over the water around a bay. Take a short boat ride and the seagulls follow you.", photoQuery: "Ine no Funaya boat houses", scene: "ocean" }),
  P({ id: "koyasan", name: "Koyasan", kind: "village", base: "osa", lat: 34.2130, lon: 135.5860, from: "About 2 hours by train and cable car", blurb: "A mountaintop monk town. Walk the lantern-lit Okunoin cemetery among giant cedars at dusk.", winter: "It's often below freezing up there; dress warm.", photoQuery: "Okunoin Koyasan cedar", scene: "onsen" }),
  P({ id: "minoo", name: "Minoo waterfall", kind: "nature", base: "osa", lat: 34.8530, lon: 135.4720, from: "About 50 minutes by train, then a 40-minute riverside walk", blurb: "A 33-metre waterfall at the end of a forest gorge, with wild monkeys about.", photoQuery: "Minoo Falls Osaka", scene: "fuji" }),
  P({ id: "rokko", name: "Mt Rokko, Kobe", kind: "nature", base: "osa", lat: 34.7780, lon: 135.2630, from: "About 1 hour by train and cable car", blurb: "Ride up the mountain behind Kobe for a night view of the whole bay lit up.", photoQuery: "Mount Rokko night view Kobe", scene: "neon" }),

  // Around Tokyo
  P({ id: "kawaguchiko", name: "Lake Kawaguchi & Oshino Hakkai", kind: "village", base: "tok", lat: 35.4600, lon: 138.8320, from: "About 2 hours by highway bus from Shinjuku", blurb: "Mt Fuji fills the sky over the lake. Oshino's spring ponds are so clear you can see every fish.", winter: "Winter gives the clearest Fuji views, mostly in the morning.", photoQuery: "Oshino Hakkai Mount Fuji", scene: "fuji", activity: "fuji-view" }),
  P({ id: "hakone", name: "Hakone", kind: "town", base: "tok", lat: 35.2330, lon: 139.1060, from: "About 1.5 hours by Romancecar", blurb: "Ride the ropeway over the steaming Owakudani valley, eat a black egg, then cross Lake Ashi on a pirate ship.", winter: "The ropeway stops in strong wind or high volcanic gas; check on the day.", photoQuery: "Owakudani Hakone ropeway", scene: "onsen" }),
  P({ id: "nikko", name: "Nikko", kind: "town", base: "tok", lat: 36.7580, lon: 139.5990, from: "About 2 hours by Tobu train", blurb: "Forests, waterfalls and the gold-covered Toshogu shrine. Kegon Falls drops 97 metres and can partly freeze in winter.", winter: "The road up to Kegon Falls can be icy; buses run all year.", photoQuery: "Kegon Falls Nikko winter", scene: "fuji" }),
  P({ id: "kamakura", name: "Kamakura & Enoshima", kind: "town", base: "tok", lat: 35.3190, lon: 139.5470, from: "About 1 hour by JR", blurb: "A giant bronze Buddha you can step inside, a seaside tram, and Enoshima island with caves and sunset views of Fuji.", photoQuery: "Enoshima island Fuji sunset", scene: "enoden" }),
  P({ id: "okutama", name: "Okutama & Mitake Gorge", kind: "nature", base: "tok", lat: 35.8020, lon: 139.1830, from: "About 1.5 hours by JR", blurb: "Tokyo's own mountains: river boulders, suspension bridges and a cable car up to a shrine.", photoQuery: "Mitake Valley Tama River", scene: "fuji", activity: "mitake" }),
  P({ id: "takao", name: "Mt Takao", kind: "nature", base: "tok", lat: 35.6250, lon: 139.2430, from: "About 1 hour by Keio Line", blurb: "The easy mountain hike next to Tokyo, with a cable car, a monkey park and Fuji views from the top.", photoQuery: "Mount Takao summit Fuji", scene: "fuji", activity: "takao" }),
  P({ id: "kawagoe", name: "Kawagoe", kind: "town", base: "tok", lat: 35.9250, lon: 139.4850, from: "About 50 minutes by train", blurb: "'Little Edo': a street of black clay storehouses and an old wooden bell tower.", photoQuery: "Kawagoe Kurazukuri street", scene: "train" }),
  P({ id: "nagatoro", name: "Nagatoro river", kind: "nature", base: "tok", lat: 36.1050, lon: 139.1100, from: "About 2 hours by train", blurb: "Flat river rocks and cliffs in Chichibu, and a ropeway up Mt Hodo.", winter: "The river boat trips stop in winter; the ropeway runs.", photoQuery: "Nagatoro Iwadatami river", scene: "fuji" }),
  P({ id: "jogasaki", name: "Jogasaki coast, Izu", kind: "nature", base: "tok", lat: 34.8960, lon: 139.1360, from: "About 2 hours by train", blurb: "Black lava cliffs and a suspension bridge swinging 23 metres above crashing waves.", photoQuery: "Jogasaki coast suspension bridge", scene: "ocean" }),
  P({ id: "nokogiri", name: "Mt Nokogiri", kind: "nature", base: "tok", lat: 35.1600, lon: 139.8360, from: "About 2 hours by train, or the ferry across Tokyo Bay", blurb: "An old quarry mountain with a sheer 'view of hell' ledge sticking out over the drop, and a giant stone Buddha.", photoQuery: "Nokogiriyama view of hell", scene: "fuji" }),
  P({ id: "shirakawago", name: "Shirakawa-go", kind: "village", base: "tok", lat: 36.2570, lon: 136.9060, from: "Far: about 5 hours by train and bus, best as an overnight trip", blurb: "Steep thatched farmhouses in a mountain valley, usually deep in snow in January.", winter: "Snow is likely and some evening light-ups need booking. Too far for a day trip.", photoQuery: "Shirakawa-go winter village", scene: "ski" }),
];

export const KIND_LABEL: Record<PlaceKind, string> = { town: "Town", village: "Village", nature: "Nature" };
export const KIND_COLOR: Record<PlaceKind, string> = { town: "#ff2e88", village: "#ffd23f", nature: "#3dffa8" };
