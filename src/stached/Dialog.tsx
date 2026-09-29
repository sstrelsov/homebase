import { type ReactNode, useEffect, useRef } from "react";
import styles from "./stached.module.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** A native modal dialog: focus trap, Escape, and backdrop for free. */
const Dialog = ({ open, onClose, title, children }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes a native dialog already
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={title}
      className={styles.dialog}
    >
      <div className="p-5 space-y-5">
        <header className="flex items-center justify-between gap-4">
          <h2 className={`${styles.title} text-sm`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 p-2 text-3xl leading-none opacity-70"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
};

export default Dialog;
