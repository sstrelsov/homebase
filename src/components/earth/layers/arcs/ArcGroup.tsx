import { useEffect, useRef, useState } from "react";
import { ArcLocation } from "../../../../types/earthTypes";
import Arc from "./ArcLight";

export interface ArcGroupProps {
  /**
   * Array of start/end coords or city stops.
   * In "showAll" mode, we draw arcs from locationArray.
   * In "freeMode" (infinite random) mode, we treat these as potential arcs.
   */
  locationArray: ArcLocation[];

  /** Arc color. */
  color: string;

  /** Earth radius (used by child Arc). */
  radius: number;

  /**
   * Duration (in ms) of the arc animation.
   */
  animationDuration?: number;

  /**
   * If true, arcs continue infinitely in random order.
   * If false, they all appear at once.
   */
  freeMode?: boolean;

  /**
   * If arcs are partially complete, do we keep them in the scene or remove them?
   */
  onProgressPersist?: boolean;
}

function createRandomArc(allPoints: ArcLocation[]): ArcLocation {
  // Pick a random arc from the *existing* trip pairs (i.e., we only spawn arcs that exist in `locationArray`).
  // If you truly want random start/end from the city list, you'd do something different.
  const i = Math.floor(Math.random() * allPoints.length);

  // Generate a stable ID
  const id = crypto.randomUUID();

  return {
    id,
    start: allPoints[i].start,
    end: allPoints[i].end,
  };
}

export default function ArcGroup({
  locationArray,
  color,
  radius,
  animationDuration = 2500,
  freeMode = false,
  onProgressPersist = true,
}: ArcGroupProps) {
  /** The arcs we want to render right now. */
  const [arcsToRender, setArcsToRender] = useState<ArcLocation[]>([]);

  /** Whether each arc has started or completed. */
  const [arcsTriggered, setArcsTriggered] = useState<boolean[]>([]);
  const [arcsCompleted, setArcsCompleted] = useState<boolean[]>([]);

  /**
   * For free mode, we keep spawning arcs.
   * For showAll mode, we show them once.
   */
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============== "Show All" (non-freeMode) ==============
  function showAllArcs() {
    // We'll just show all arcs in `locationArray` at once (immediately triggered).
    // Make sure each has an ID:
    const arcsWithId = locationArray.map((arc) =>
      arc.id
        ? arc // already has an ID
        : { ...arc, id: crypto.randomUUID() }
    );

    setArcsToRender(arcsWithId);
    setArcsTriggered(Array(arcsWithId.length).fill(true));
    setArcsCompleted(Array(arcsWithId.length).fill(false));
  }

  // ============== "Free Mode" ==============
  /** Start an interval that spawns arcs in random order. */
  function startFreeMode() {
    // Clear existing arcs if you want a fresh start:
    setArcsToRender([]);
    setArcsTriggered([]);
    setArcsCompleted([]);

    if (!spawnIntervalRef.current) {
      // For example, spawn a new arc every 2 seconds.
      spawnIntervalRef.current = setInterval(() => {
        // Create a random arc from locationArray
        const newArc = createRandomArc(locationArray);

        // Append it to arcsToRender
        setArcsToRender((prev) => [...prev, newArc]);
        setArcsTriggered((prev) => [...prev, false]);
        setArcsCompleted((prev) => [...prev, false]);
      }, 1500);
    }
  }

  /** Cleanup intervals on unmount. */
  useEffect(() => {
    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
  }, []);

  /** On mount or when `freeMode` changes. */
  useEffect(() => {
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }

    if (freeMode) {
      startFreeMode();
    } else {
      showAllArcs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeMode]);

  /**
   * Whenever we add arcs in free mode, we trigger them with a small random delay
   * so they don't all start at the same moment.
   */
  useEffect(() => {
    arcsToRender.forEach((arc, i) => {
      if (!arcsTriggered[i]) {
        const delay = Math.random() * 500; // 0-500ms
        setTimeout(() => {
          setArcsTriggered((prev) => {
            const copy = [...prev];
            copy[i] = true;
            return copy;
          });
        }, delay);
      }
    });
  }, [arcsToRender, arcsTriggered]);

  /**
   * If freeMode && !onProgressPersist, remove arcs once they're done so we don't accumulate forever.
   */
  useEffect(() => {
    if (!freeMode || onProgressPersist) return;

    const activeArcs = arcsToRender.filter((_, i) => !arcsCompleted[i]);
    if (activeArcs.length !== arcsToRender.length) {
      // rebuild arcsTriggered / arcsCompleted
      const newTriggered: boolean[] = [];
      const newCompleted: boolean[] = [];
      arcsToRender.forEach((arc, i) => {
        if (!arcsCompleted[i]) {
          newTriggered.push(arcsTriggered[i]);
          newCompleted.push(arcsCompleted[i]);
        }
      });
      setArcsToRender(activeArcs);
      setArcsTriggered(newTriggered);
      setArcsCompleted(newCompleted);
    }
  }, [arcsToRender, arcsCompleted, arcsTriggered, freeMode, onProgressPersist]);

  return (
    <>
      {arcsToRender.map((arc, i) => {
        // If it's not triggered yet, don't render
        if (!arcsTriggered[i]) return null;

        // If it's completed & we don't keep arcs in progress => hide
        if (arcsCompleted[i] && !onProgressPersist) return null;

        return (
          <Arc
            key={arc.id}
            color={color}
            startLat={arc.start.lat}
            startLon={arc.start.lon}
            endLat={arc.end.lat}
            endLon={arc.end.lon}
            radius={radius}
            animationDuration={animationDuration}
            onProgressPersist={onProgressPersist}
            onDone={() => {
              setArcsCompleted((prev) => {
                const copy = [...prev];
                copy[i] = true;
                return copy;
              });
            }}
          />
        );
      })}
    </>
  );
}
