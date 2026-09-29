import { useContext } from "react";
import Dialog from "./Dialog";
import styles from "./stached.module.css";
import { THEMES, type Theme, ThemeContext } from "./theme";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onTheme: (theme: Theme) => void;
}

/** Settings, for now just the theme. Each choice is drawn in its own look. */
const SettingsDialog = ({ open, onClose, onTheme }: SettingsDialogProps) => {
  const current = useContext(ThemeContext);

  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <section className="space-y-3">
        <h3 className={styles.label}>Theme</h3>
        <div className="space-y-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              aria-pressed={theme.id === current}
              onClick={() => onTheme(theme.id)}
              data-theme={theme.id}
              className={styles.themeCard}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className={`${styles.title} text-lg`}>{theme.name}</span>
                {theme.id === current && (
                  <span className={styles.label}>On</span>
                )}
              </span>
              <span className="flex gap-1.5">
                {(["1", "2", "3", "4"] as const).map((color) => (
                  <span
                    key={color}
                    data-color={color}
                    className={styles.swatch}
                  />
                ))}
              </span>
              <span>{theme.blurb}</span>
            </button>
          ))}
        </div>
      </section>
    </Dialog>
  );
};

export default SettingsDialog;
