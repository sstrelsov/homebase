// globeSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

interface GlobeState {
  focusIso?: string;
}

const initialState: GlobeState = {
  focusIso: undefined,
};

const globeSlice = createSlice({
  name: "globe",
  initialState,
  reducers: {
    setFocusIso: (state, action: PayloadAction<string | undefined>) => {
      state.focusIso = action.payload;
    },
  },
  extraReducers: (builder) => {},
});

export const { setFocusIso } = globeSlice.actions;
export const selectFocusIso = (state: RootState) => state.globe.focusIso;
export default globeSlice.reducer;
