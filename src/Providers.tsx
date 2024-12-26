import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import { Provider } from "react-redux";
import store from "./store/store";
import { ColorProvider } from "./utils/ColorContext";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <ColorProvider>
        <NextUIProvider>{children}</NextUIProvider>
      </ColorProvider>
    </Provider>
  );
}
