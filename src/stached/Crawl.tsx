import QUOTES from "./quotes.json";
import styles from "./stached.module.css";

/**
 * Mustache wisdom rolling off into space, Star Wars style. Each puzzle's push
 * notification borrows a line (stached-api/push.ts).
 */
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
