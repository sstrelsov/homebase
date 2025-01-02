// colorSlice.ts
import { Theme } from "@nextui-org/use-theme";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

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

interface ColorState {
  linkColor: string;
}

const initialState: ColorState = {
  linkColor: "",
};

const colorSlice = createSlice({
  name: "color",
  initialState,
  reducers: {
    /**
     * Directly sets a given color.
     */
    setLinkColor(state, action: PayloadAction<string>) {
      state.linkColor = action.payload;
    },
    /**
     * Generates and sets a random color based on the theme mode.
     */
    setRandomColor(state, action: PayloadAction<Theme>) {
      state.linkColor = genRandomColor(action.payload);
    },
  },
});

export const { setLinkColor, setRandomColor } = colorSlice.actions;
export default colorSlice.reducer;

export const selectLinkColor = (state: RootState) => state.color.linkColor;
