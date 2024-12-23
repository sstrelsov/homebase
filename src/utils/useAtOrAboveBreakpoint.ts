import { useEffect, useState } from "react";

// Tailwind's default breakpoints in pixels
const BREAKPOINTS = {
  xs: 320,
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
const useAtOrAboveBreakpoint = (breakpoint: TailwindBreakpoint) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    function handleResize() {
      const newMatches = window.innerWidth >= BREAKPOINTS[breakpoint];
      // Only update state if the value actually changed
      setMatches((old) => {
        if (old !== newMatches) {
          return newMatches;
        }
        return old;
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return matches;
};

export default useAtOrAboveBreakpoint;
