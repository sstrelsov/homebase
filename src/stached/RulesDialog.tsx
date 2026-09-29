import type { CSSProperties } from "react";
import { MUSTACHE_PATH } from "../components/RetroMustache";
import { COLOR_HEX } from "./api";
import Dialog from "./Dialog";
import styles from "./stached.module.css";

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

const RulesDialog = ({ open, onClose }: RulesDialogProps) => (
  <Dialog open={open} onClose={onClose} title="How to play">
    <div className="space-y-4 text-[21px] leading-snug">
      <p>Find groups of four words that share something in common.</p>
      <p>
        Tap four words, then hit <span className={styles.pixel}>Submit</span>.
        Right, and the group locks in. Wrong, and you lose a mustache.
      </p>
      <div className="flex items-center gap-3">
        <span className={styles.label}>Lives</span>
        {[0, 1, 2, 3].map((i) => (
          <svg
            key={i}
            viewBox="0 12 200 54"
            aria-hidden="true"
            className={styles.life}
          >
            <path d={MUSTACHE_PATH} />
          </svg>
        ))}
      </div>
      <p>Four mistakes and it's game over.</p>

      <div
        className="rounded-lg p-3 space-y-2"
        style={{ border: `2px solid ${COLOR_HEX.stache}` }}
      >
        <p className={`${styles.pixel} text-[11px]`}>Get the stache</p>
        <p>
          One group is <strong>Stached</strong>: its words are all mustache
          business, somehow. The clock starts when you press{" "}
          <span className={styles.pixel}>Play</span> and stops when you find it.
          That's your stache time.
        </p>
      </div>

      <p>
        Two ways to win: solve the whole board, and get the stache fast. Both go
        on the scoreboard.
      </p>
      <p className="opacity-70">
        Watch for red herrings: a word can look like it fits more than one
        group. You get one try per puzzle.
      </p>

      <div className="space-y-2">
        <p className={styles.label}>Example</p>
        <div
          className={`${styles.bar} min-h-16`}
          style={{ "--color": COLOR_HEX.blue } as CSSProperties}
        >
          <span className={styles.barTitle}>___ball</span>
          <span className={styles.barWords}>Basket, Eye, Meat, Foot</span>
        </div>
      </div>
    </div>
  </Dialog>
);

export default RulesDialog;
