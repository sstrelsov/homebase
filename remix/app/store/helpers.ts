// thunkApiHelper.ts

import { GetThunkAPI } from "@reduxjs/toolkit";

export async function handleThunkApiCall(
  apiCall: () => Promise<any>,
  { dispatch, rejectWithValue }: GetThunkAPI<any>
) {
  try {
    return await apiCall();
  } catch (error: any) {
    const errorPayload = {
      message: error.message || "An error occurred",
      details: {
        name: error.name,
        message: error.message,
        // Include other serializable properties if needed
        // Avoid including the entire error object
      },
    };

    return rejectWithValue(errorPayload);
  }
}
