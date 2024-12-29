// useLandDotsData.ts
import { useEffect, useState } from "react";
import { DotInfo } from "../../types/earthTypes";

/**
 * A simple custom hook to fetch DotInfo[] from a given URL.
 */
export function useLandDotsData(jsonUrl: string) {
  const [dots, setDots] = useState<DotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        const response = await fetch(jsonUrl);
        const data: DotInfo[] = await response.json();
        if (!isCancelled) {
          setDots(data);
        }
      } catch (err) {
        console.error("Failed to load landDots:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      // If the component unmounts early, mark fetch as cancelled
      isCancelled = true;
    };
  }, [jsonUrl]);

  return { dots, isLoading };
}
