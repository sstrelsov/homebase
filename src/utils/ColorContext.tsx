import React, { createContext, useContext, useEffect, useState } from "react";
/**
 * Generates a random hex color, to be used in links throughout the site for a given session.
 *
 * @returns a random color in hex format
 */
const genRandomColor = (): string => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// 1) Create the context
const ColorContext = createContext<string>("");

// 2) Provider component that generates the color once
export const ColorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [linkColor, setLinkColor] = useState("");

  useEffect(() => {
    setLinkColor(genRandomColor());
  }, []);

  return (
    <ColorContext.Provider value={linkColor}>{children}</ColorContext.Provider>
  );
};

// 3) Export a handy custom hook to consume the color:
export function useLinkColor() {
  return useContext(ColorContext);
}
