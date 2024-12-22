import { useEffect, useState } from "react";

const useTailwindBreakpoint = () => {
  const [isXL, setIsXL] = useState(false);

  useEffect(() => {
    const updateBreakpoint = () => {
      setIsXL(window.innerWidth >= 1280); // Tailwind's `xl` breakpoint
    };

    updateBreakpoint(); // Check on mount

    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return isXL;
};

export default useTailwindBreakpoint;
