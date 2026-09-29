import Dialog from "./Dialog";
import styles from "./stached.module.css";

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

const RulesDialog = ({ open, onClose }: RulesDialogProps) => (
  <Dialog open={open} onClose={onClose} title="How to play">
    <div className="space-y-4 text-[19px] leading-snug">
      <p>It's Connections, with a 'stache.</p>
      <p>
        Find the groups of four. Tap four words, then hit{" "}
        <span className={styles.display}>Submit</span>. Four wrong guesses and
        you're out.
      </p>
      <div className={`${styles.stacheBox} p-3`}>
        <p>
          One row is stache themed. Get it as fast as you can: that's your{" "}
          <span className={styles.stacheText}>stache time</span>.
        </p>
      </div>
    </div>
  </Dialog>
);

export default RulesDialog;
