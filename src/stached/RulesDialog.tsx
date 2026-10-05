import Dialog from "./Dialog";
import styles from "./stached.module.css";

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
  /** This device's look, and the switch that changes it. */
  dark: boolean;
  onDark: (dark: boolean) => void;
  /** Who's signed in, and a way to sign in as someone else. */
  name: string;
  onSwitchPlayer: () => void;
}

/** How to play, behind the gear on home and Rules in a game. */
const RulesDialog = ({
  open,
  onClose,
  dark,
  onDark,
  name,
  onSwitchPlayer,
}: RulesDialogProps) => (
  <Dialog open={open} onClose={onClose} title="How to play">
    <div className="space-y-4 text-[19px] leading-snug">
      <p>It's Connections, but with a twist: the 'stache.</p>
      <div className={`${styles.stacheBox} p-3`}>
        <p>
          One group embodies the 'stache. Get it as fast as you can to get the
          quickest <span className={styles.stacheText}>stache time</span>.
          Solving it also earns a bonus life.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        onClick={() => onDark(!dark)}
        className={styles.toggleRow}
      >
        Dark mode
        <span aria-hidden="true" className={styles.switch} />
      </button>
      <button
        type="button"
        onClick={onSwitchPlayer}
        className={`${styles.label} underline underline-offset-4`}
      >
        Not {name}? Switch player
      </button>
    </div>
  </Dialog>
);

export default RulesDialog;
