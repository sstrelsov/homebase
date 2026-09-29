// A choose-your-route walk through Brooklyn Heights. Every passage happens at
// a real place; Gerald hops from one to the next on the map.

export type LatLng = [number, number];

export const MUSTACHE_PATH =
  "M100 30c-8-14-26-20-42-12-12 6-18 20-32 22-10 1-18-5-22-12 2 18 16 32 36 34 22 2 44-8 60-24 16 16 38 26 60 24 20-2 34-16 36-34-4 7-12 13-22 12-14-2-20-16-32-22-16-8-34-2-42 12z";

export interface Place {
  name: string;
  at: LatLng;
}

// The Clark Street station is surveyed; the rest are placed from their street
// addresses, so a pin can sit a few doors off.
export const PLACES = {
  station: { name: "Clark St station", at: [40.6975, -73.99306] },
  ferrane: { name: "Ferrane", at: [40.6977, -73.9937] },
  oneHotel: { name: "1 Hotel", at: [40.702, -73.9958] },
  poppys: { name: "Poppy's", at: [40.7005, -73.9919] },
  montague: { name: "Montague St", at: [40.6947, -73.9951] },
  whisk: { name: "Whisk", at: [40.6904, -73.9931] },
  salter: { name: "Salter House", at: [40.691, -73.996] },
  yemen: { name: "Yemen Cafe", at: [40.6902, -73.9937] },
  hibino: { name: "Hibino", at: [40.6904, -73.9972] },
  ingas: { name: "Inga's", at: [40.7001, -73.9935] },
} satisfies Record<string, Place>;

export type PassageId =
  | "clarkStreet"
  | "ferrane"
  | "oneHotel"
  | "poppys"
  | "montague"
  | "whisk"
  | "salter"
  | "yemen"
  | "hibino"
  | "ingas";

export interface Choice {
  label: string;
  next: PassageId;
}

export interface Passage {
  place: Place;
  text: string;
  choices: Choice[];
}

export const FIRST_PASSAGE: PassageId = "clarkStreet";

/** The soup arrives: the map lights Gerald up. */
export const FINALE: PassageId = "ingas";

const toCook: Choice = {
  label: "Cook, then carry it all to Inga's",
  next: "ingas",
};

export const STORY: Record<PassageId, Passage> = {
  clarkStreet: {
    place: PLACES.station,
    text: `Our story begins deep under Clark Street, where the 2 and 3 trains rumble through the dark.

A mustache named Gerald rode the old elevators up, humming. He had a mission. Tonight he was making Italian wedding soup and chocolate chip cookies, and he needed supplies.`,
    choices: [
      { label: "Follow the smell of cardamom to Ferrane", next: "ferrane" },
      {
        label: "Coffee first, down by the river at the 1 Hotel",
        next: "oneHotel",
      },
    ],
  },
  ferrane: {
    place: PLACES.ferrane,
    text: `Ferrane was a few doors down Clark, and it smelled like a Swedish grandmother's kitchen. Gerald ate a cardamom bun in four bites.

The baker leaned in. "For cookies, brown the butter." Gerald wrote it on a napkin and underlined it twice.`,
    choices: [{ label: "Up Henry Street to Poppy's", next: "poppys" }],
  },
  oneHotel: {
    place: PLACES.oneHotel,
    text: `Gerald rolled down the hill to the 1 Hotel and ordered a coffee in the lobby, where the tables are old beams from the Domino Sugar Factory.

Out the window, the Brooklyn Bridge. Gerald sipped slowly. A mustache should never rush a coffee.`,
    choices: [{ label: "Back up the hill to Poppy's", next: "poppys" }],
  },
  poppys: {
    place: PLACES.poppys,
    text: `At Poppy's on Henry Street, Gerald bought one chocolate chip cookie. For research.

He studied it. Crisp edges, soft middle, a little flaky salt. "Yes," he said to no one. "That is the goal."`,
    choices: [{ label: "Down to Montague Street", next: "montague" }],
  },
  montague: {
    place: PLACES.montague,
    text: `Montague Street was busy with strollers, dogs, and people pretending not to stare at the dogs.

Gerald made his list. Soup: tiny meatballs, escarole, little pasta, a parmesan rind. Cookies: butter, sugar, too much chocolate. But first, the right tools.`,
    choices: [
      { label: "Whisk, for a ladle and a wooden spoon", next: "whisk" },
      {
        label: "Salter House, for a pot worth writing home about",
        next: "salter",
      },
    ],
  },
  whisk: {
    place: PLACES.whisk,
    text: `Whisk, on Atlantic Avenue, had every tool a kitchen could dream of. Gerald chose a ladle, a wooden spoon, and a cookie scoop he did not need but absolutely wanted.

All this shopping had made him hungry.`,
    choices: [{ label: "A few doors down to Yemen Cafe", next: "yemen" }],
  },
  salter: {
    place: PLACES.salter,
    text: `At Salter House, Gerald found a heavy pot the color of a Brooklyn sunset. He tried to carry it with dignity. He mostly succeeded.

All this shopping had made him hungry.`,
    choices: [{ label: "Over to Hibino on Henry Street", next: "hibino" }],
  },
  yemen: {
    place: PLACES.yemen,
    text: `At Yemen Cafe, the bread arrived puffed up like a pillow, still steaming. Gerald tore it open and closed his eyes.

Fortified, he went home and got to work.`,
    choices: [toCook],
  },
  hibino: {
    place: PLACES.hibino,
    text: `At Hibino, Gerald ordered the obanzai, a tray of tiny Kyoto dishes. Each one was perfect. He took this as a sign about tiny meatballs.

Fortified, he went home and got to work.`,
    choices: [toCook],
  },
  ingas: {
    place: PLACES.ingas,
    text: `He browned the butter. He rolled forty tiny meatballs. The soup simmered, the cookies came out crisp at the edges, and the whole kitchen smelled like a hug.

Then he carried it all to Inga's on Hicks Street, where a friend sat sniffling with a terrible cold. One bowl of soup. One warm cookie. The sniffles stopped.

Soup saves lives. So do mustaches, mostly by bringing soup.`,
    choices: [{ label: "Take another walk", next: "clarkStreet" }],
  },
};
