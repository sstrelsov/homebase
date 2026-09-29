import styles from "./stached.module.css";

const QUOTES = [
  "Mustaches save lives",
  "Don't talk to me until you've admired my mustache",
  "Behind every sexy mustache is a woman",
  "I mustache you a question",
  "A kiss without a mustache is like an egg without salt",
  "Mo' stache, mo' problems",
  "With great mustache comes great responsibility",
  "Keep calm and stache on",
];

/** Mustache wisdom rolling off into space, Star Wars style. */
const Crawl = () => (
  <div aria-hidden="true" className={styles.crawl}>
    <div className={styles.crawlText}>
      {QUOTES.map((quote) => (
        <p key={quote}>“{quote}”</p>
      ))}
    </div>
  </div>
);

export default Crawl;
