// A choose-your-route walk through Brooklyn Heights. Coordinates are in the
// HeightsMap viewBox: x runs west (the river) to east, y runs north to south.

export type Point = [number, number];

export type PassageId =
  | "clarkStreet"
  | "fruitStreets"
  | "willow"
  | "montague"
  | "squibbBridge"
  | "promenade"
  | "twirl";

export interface Choice {
  label: string;
  next: PassageId;
  /** The streets Gerald walks to get there, after where he stands now. */
  walk: Point[];
}

export interface Passage {
  text: string;
  choices: Choice[];
}

// Avenues (x) and streets (y) of the map grid.
export const X = {
  promenade: 80,
  columbiaHeights: 95,
  willow: 135,
  hicks: 175,
  henry: 215,
  clinton: 255,
} as const;

export const Y = {
  middagh: 40,
  cranberry: 75,
  orange: 110,
  pineapple: 145,
  clark: 180,
  pierrepont: 215,
  montague: 250,
  remsen: 285,
} as const;

export const PARK_X = 52;

/** The Clark Street station, under the old Hotel St. George. */
export const START: Point = [X.henry, Y.clark];

export const FIRST_PASSAGE: PassageId = "clarkStreet";

/** Reached the harbor: the map lights Gerald up. */
export const FINALE: PassageId = "twirl";

const toPromenade: Choice = {
  label: "Follow Montague to where it ends at the sky",
  next: "promenade",
  walk: [
    [X.columbiaHeights, Y.montague],
    [X.promenade, Y.montague],
  ],
};

export const STORY: Record<PassageId, Passage> = {
  clarkStreet: {
    text: `Our story begins deep under Clark Street, where the 2 and 3 trains rumble through the dark.

A mustache named Gerald stepped off the train and into the old elevators of the Hotel St. George. Up, up, up he went, humming. The doors opened, and Gerald smelled the river.`,
    choices: [
      {
        label: "Head west on Clark, toward the water",
        next: "willow",
        walk: [
          [X.hicks, Y.clark],
          [X.willow, Y.clark],
        ],
      },
      {
        label: "Wander up to the fruit streets",
        next: "fruitStreets",
        walk: [
          [X.henry, Y.pineapple],
          [X.henry, Y.orange],
          [X.hicks, Y.orange],
          [X.hicks, Y.cranberry],
        ],
      },
    ],
  },
  fruitStreets: {
    text: `Gerald turned up Henry to Pineapple, then Orange, then Cranberry.

The story goes that long ago, a neighbor pulled down the street signs named for rich families and put up fruit instead. Gerald respected anyone who did things with flair. He twirled once, in her honor.`,
    choices: [
      {
        label: "Cut over to the Promenade",
        next: "promenade",
        walk: [
          [X.hicks, Y.orange],
          [X.promenade, Y.orange],
          [X.promenade, Y.pierrepont],
        ],
      },
      {
        label: "Take the bouncy bridge down to the park",
        next: "squibbBridge",
        walk: [
          [X.columbiaHeights, Y.cranberry],
          [X.columbiaHeights, Y.middagh],
          [PARK_X, Y.middagh],
        ],
      },
    ],
  },
  willow: {
    text: `Gerald walked west on Clark, past stoops and brownstones and one very serious cat.

At Willow Street, a dog in a yellow raincoat nodded at him. Gerald nodded back. Some things go without saying.`,
    choices: [
      {
        label: "Grab a coffee on Montague",
        next: "montague",
        walk: [[X.willow, Y.montague]],
      },
      {
        label: "Straight to the Promenade",
        next: "promenade",
        walk: [
          [X.promenade, Y.clark],
          [X.promenade, Y.pierrepont],
        ],
      },
    ],
  },
  montague: {
    text: `On Montague Street, Gerald ordered a cappuccino and immediately regretted it. Foam everywhere.

This is the price of greatness. He dabbed himself dry with a napkin and kept walking west.`,
    choices: [toPromenade],
  },
  squibbBridge: {
    text: `The Squibb Park Bridge bounced with every step. Gerald bounced too. He could not help it.

Below him, the piers of Brooklyn Bridge Park stretched into the water, and a ferry horn called out across the river.`,
    choices: [
      {
        label: "Walk the water's edge, then climb back up",
        next: "promenade",
        walk: [
          [PARK_X, Y.pierrepont],
          [X.promenade, Y.pierrepont],
        ],
      },
    ],
  },
  promenade: {
    text: `On the Promenade, the whole skyline was lit up like a birthday cake.

Then the lights along the harbor flickered and went dark. Out on the water, a little ferry drifted toward the piers, lost.

Gerald did not panic. Gerald bristled.`,
    choices: [{ label: "Twirl.", next: "twirl", walk: [] }],
  },
  twirl: {
    text: `He twirled so hard that he glowed, a small, confident light at the edge of Brooklyn. The ferry saw it, turned, and came safely home.

That is how mustaches save lives. Scientists call it the Mustache Effect. (They don't. But they should.)

Twirl bravely, Brooklyn Heights.`,
    choices: [{ label: "Take another walk", next: "clarkStreet", walk: [] }],
  },
};
