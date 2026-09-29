import Dialog from "./Dialog";
import styles from "./stached.module.css";

interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

const RulesDialog = ({ open, onClose }: RulesDialogProps) => (
  <Dialog open={open} onClose={onClose} title="How to play">
    <div className="space-y-4 text-[19px] leading-snug">
      <p>It's Connections, but with a twist: the 'stache.</p>
      <div className={`${styles.stacheBox} p-3`}>
        <p>
          One group embodies the 'stache. Get it as fast as you can to get the
          quickest <span className={styles.stacheText}>stache time</span>.
        </p>
      </div>
    </div>
  </Dialog>
);

export default RulesDialog;
