import x from "./iphone.module.css";
import QUOTES from "./quotes.json";

// Simplified drawings of an iPhone, for the dialogs that ask for the
// home-screen app (HomeScreen.tsx) and for notifications
// (NotificationsDialog.tsx). They're pictures, so each reads as one image.

const ICON = "/images/stached-icon-v2-180.png";

/** When a puzzle's push goes out: ANNOUNCE_AT in stached-api/push.ts. */
const PUSH_TIME = "9:12";

// Icons in the style of Apple's, drawn in the text's color.
const stroke = {
  className: x.icon,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Share: a box with an arrow out of the top. */
const ShareIcon = () => (
  <svg {...stroke} aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4M8 10H5v11h14V10h-3" />
  </svg>
);

/** Add to Home Screen: a plus in a rounded square. */
const AddIcon = () => (
  <svg {...stroke} aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

/** Find on Page: a magnifying glass. */
const FindIcon = () => (
  <svg {...stroke} aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.8-4.8" />
  </svg>
);

/** Markup: a pen nib in a circle. */
const MarkupIcon = () => (
  <svg {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 17L12 7l3.5 10M10 13h4" />
  </svg>
);

/** Bookmarks: an open book. */
const BookIcon = () => (
  <svg {...stroke} aria-hidden="true">
    <path d="M12 6.5C10 5 7 4.5 3.5 5v14c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v14" />
  </svg>
);

/** Tabs: two squares, one over the other. */
const TabsIcon = () => (
  <svg {...stroke} aria-hidden="true">
    <rect x="8" y="8" width="13" height="13" rx="2.5" />
    <path d="M4 16V6a2 2 0 0 1 2-2h10" />
  </svg>
);

const Chevron = ({ back }: { back?: boolean }) => (
  <svg {...stroke} aria-hidden="true">
    <path d={back ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

/** "Monday, October 5": tomorrow, when the next push goes out. */
const tomorrow = () =>
  new Date(Date.now() + 86_400_000).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

/**
 * Tomorrow's push on a lock screen: "Puzzle #N is up", iOS's "from Stached",
 * then a line from the crawl, like the ones the API sends.
 */
export const LockScreen = ({ number }: { number: number }) => (
  <div
    role="img"
    aria-label={`A notification on an iPhone: Puzzle #${number} is up, from Stached`}
    className={x.lock}
  >
    <p className={x.lockDay}>{tomorrow()}</p>
    <p className={x.lockTime}>{PUSH_TIME}</p>
    <div className={x.notice}>
      <img src={ICON} alt="" className={x.noticeIcon} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <strong className="truncate">Puzzle #{number} is up</strong>
          <span className={x.noticeMuted}>{PUSH_TIME} AM</span>
        </div>
        <p className={x.noticeMuted}>from Stached</p>
        <p className={x.noticeBody}>{QUOTES[0]}</p>
      </div>
    </div>
  </div>
);

/** Safari's toolbar, with Share ringed. */
export const SafariToolbar = () => (
  <div role="img" aria-label="Safari's toolbar" className={x.step}>
    <div className={x.toolbar}>
      <p className={x.address}>spencerstrelsov.com</p>
      <div className={x.toolbarIcons}>
        <Chevron back />
        <Chevron />
        <span className={x.lit}>
          <ShareIcon />
        </span>
        <BookIcon />
        <TabsIcon />
      </div>
    </div>
  </div>
);

/** The share menu's list, after View More, with Add to Home Screen ringed. */
export const ShareSheet = () => (
  <div role="img" aria-label="The share menu" className={x.step}>
    <div className={x.sheet}>
      <p className={x.row}>
        <FindIcon /> Find on Page
      </p>
      <p className={`${x.row} ${x.lit}`}>
        <AddIcon /> Add to Home Screen
      </p>
      <p className={x.row}>
        <MarkupIcon /> Markup
      </p>
    </div>
  </div>
);

/** A home screen, with Stached's icon ringed among the apps. */
export const HomeScreenApps = () => (
  <div role="img" aria-label="Stached on a home screen" className={x.step}>
    <div className={x.apps}>
      {[0, 1, 2, 3, 4].map((app) => (
        <span key={app} className={x.app} />
      ))}
      <span>
        <img src={ICON} alt="" className={`${x.app} ${x.lit}`} />
        <span className={x.appName}>Stached</span>
      </span>
      {[5, 6].map((app) => (
        <span key={app} className={x.app} />
      ))}
    </div>
  </div>
);
