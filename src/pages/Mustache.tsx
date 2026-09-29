import Typewriter from "../components/Typewriter";
import styles from "../css/mustache.module.css";
import { useLinkColor } from "../utils/ColorContext";

const story = `Once upon a time, a mustache named Gerald lived on the lip of a lighthouse keeper.

One stormy night, the lamp went out. Ships were heading for the rocks. Gerald did not panic. Gerald bristled.

He caught the last spark from the dying wick, and he twirled. He twirled so hard that he glowed, and the ships saw a small, confident light in the window and steered for home.

Mustaches have been saving lives ever since. They filter soup. They catch sneezes before they escape. They make strangers stop and smile, and a smile has never hurt anyone.

Scientists call this the Mustache Effect. (They don't. But they should.)

So if you ever feel lost at sea, remember Gerald.

Twirl bravely.`;

const MustachePage = () => {
  const { linkColor } = useLinkColor();

  return (
    <div className="self-start w-full max-w-2xl px-6 pt-24 pb-16">
      <svg
        viewBox="0 0 200 80"
        role="img"
        aria-label="A mustache"
        className={`w-40 sm:w-48 mb-8 ${styles.sway}`}
        style={{ fill: linkColor }}
      >
        <path d="M100 30c-8-14-26-20-42-12-12 6-18 20-32 22-10 1-18-5-22-12 2 18 16 32 36 34 22 2 44-8 60-24 16 16 38 26 60 24 20-2 34-16 36-34-4 7-12 13-22 12-14-2-20-16-32-22-16-8-34-2-42 12z" />
      </svg>
      <div className="text-lg sm:text-xl leading-relaxed">
        <Typewriter
          phrases={[story]}
          typingSpeed={35}
          deletingSpeed={0}
          loop={false}
        />
      </div>
    </div>
  );
};

export default MustachePage;
