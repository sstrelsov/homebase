// globeSlice.ts
import { createSlice } from "@reduxjs/toolkit";

interface GlobeState {}

const initialState: GlobeState = {};

const globeSlice = createSlice({
  name: "globe",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
});

export default globeSlice.reducer;
