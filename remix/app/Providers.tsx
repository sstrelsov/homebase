import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import { Provider } from "react-redux";
import store from "./store/store";
export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <NextUIProvider>{children}</NextUIProvider>
    </Provider>
  );
}
