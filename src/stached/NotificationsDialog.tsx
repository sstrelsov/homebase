import { useAsk } from "./ask";
import Dialog from "./Dialog";
import { LockScreen } from "./IPhone";
import type { useNotifications } from "./push";
import styles from "./stached.module.css";

interface NotificationsDialogProps extends ReturnType<typeof useNotifications> {
  /** The next puzzle's number, for the picture of its push. */
  number: number;
}

/**
 * "Notifications: please turn on notifications for new games!", in the
 * home-screen app, over a picture of the push. Its button is the tap iOS
 * needs before it asks. Once they're on, or after "Don't Allow", it never
 * shows again; closed, it asks again the next day.
 */
const NotificationsDialog = ({
  offer,
  busy,
  turnOn,
  number,
}: NotificationsDialogProps) => {
  const [open, close] = useAsk("stached.notificationsAsked", 1, offer);

  return (
    <Dialog open={open} onClose={close} title="Notifications">
      <p className="text-[19px] leading-snug">
        Please turn on notifications for new games!
      </p>
      <LockScreen number={number} />
      <button
        type="button"
        onClick={turnOn}
        disabled={busy}
        className={`${styles.button} ${styles.primary} w-full`}
      >
        Turn on notifications
      </button>
      <button
        type="button"
        onClick={close}
        className={`${styles.link} mx-auto block`}
      >
        Not now
      </button>
    </Dialog>
  );
};

export default NotificationsDialog;
