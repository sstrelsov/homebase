import { useEffect, useState } from "react";

// Tailwind's default breakpoints in pixels
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

type TailwindBreakpoint = keyof typeof BREAKPOINTS;

/**
 * Usage:
 *   const isLargeUp = useTailwindBreakpoint("lg");
 *   // returns true if window width >= 1024
 */
export default function useAtOrAboveBreakpoint(breakpoint: TailwindBreakpoint) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const updateMatch = () => {
      const currentWidth = window.innerWidth;
      // Check if current width is at or above the requested breakpoint
      setMatches(currentWidth >= BREAKPOINTS[breakpoint]);
    };

    // Check once on mount
    updateMatch();

    // Add event listener to handle subsequent resizes
    window.addEventListener("resize", updateMatch);
    return () => window.removeEventListener("resize", updateMatch);
  }, [breakpoint]);

  return matches;
}
