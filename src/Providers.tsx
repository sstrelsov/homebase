import { NextUIProvider } from "@nextui-org/system";
import type React from "react";
import { ColorProvider } from "./utils/ColorContext";
export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ColorProvider>
      <NextUIProvider>{children}</NextUIProvider>
    </ColorProvider>
  );
}
