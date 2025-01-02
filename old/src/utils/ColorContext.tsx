import { Theme, useTheme } from "@nextui-org/use-theme";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Helper function that returns a luminance-based "lightness" measure.
 */
function getColorBrightness(hexColor: string): number {
  const color = hexColor.replace("#", "");
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);

  // Relative luminance formula approximation
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Generate a random hex color. Keeps generating until it meets
 * a luminance threshold based on the mode (dark or light).
 */
function genRandomColor(mode: Theme): string {
  const letters = "0123456789ABCDEF";
  let color = "#";

  do {
    color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }

    const brightness = getColorBrightness(color);
    if (mode === "dark" && brightness > 0.6) {
      return color; // Bright color for dark mode
    } else if (mode === "light" && brightness < 0.4) {
      return color; // Darker color for light mode
    }
  } while (true);
}

interface IColorContext {
  linkColor: string;
  setRandomColor: (mode: Theme) => void;
}

const ColorContext = createContext<IColorContext>({
  linkColor: "",
  setRandomColor: () => {},
});

type ColorProviderProps = {
  children: ReactNode;
};

/**
 * ColorProvider: Provides the current link color and an updater function.
 */
export const ColorProvider: React.FC<ColorProviderProps> = ({ children }) => {
  const [linkColor, setLinkColor] = useState("");
  const { theme } = useTheme(); // Access current theme from NextUI's useTheme

  /**
   * Function to set a random link color based on the current mode.
   */
  const setRandomColor = (mode: Theme) => {
    setLinkColor(genRandomColor(mode));
  };

  // Update the color whenever the theme changes
  useEffect(() => {
    setRandomColor(theme); // Use current theme from NextUI
  }, [theme]);

  return (
    <ColorContext.Provider value={{ linkColor, setRandomColor }}>
      {children}
    </ColorContext.Provider>
  );
};

/**
 * A custom hook to access link color and updater function.
 */
export function useLinkColor() {
  return useContext(ColorContext);
}
