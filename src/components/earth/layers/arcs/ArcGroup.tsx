import { useEffect, useRef, useState } from "react";
import {
  AllArcsBehavior,
  ArcLocation,
  CityLocation,
  OnAllArcsDoneBehavior,
} from "../../../../types/earthTypes";
import { getArcCities } from "../../../../utils/arcs";
import AllArcsStaticMesh from "./AllArcsStaticMesh";
import ArcLight from "./ArcLight";

export interface ArcGroupProps {
  /**
   * Array of start/end coords or city stops.
   * In normal mode, we draw arcs from locationArray.
   * In infiniteRandom mode, we *extract* the cities from these arcs
   * and treat them as our set of available points.
   */
  locationArray: ArcLocation[];

  /**
   * If true, arcs animate sequentially one-by-one.
   * If false, all arcs animate in parallel (in normal mode).
   * (Might ignore this if we’re doing infinite random firing.)
   */
  sequential?: boolean;

  color: string;
  radius: number;
  animationDuration?: number;
  firstAnimationDuration?: number;
  onProgressPersist?: boolean;
  onAllArcsDone?: OnAllArcsDoneBehavior;
  persistArcBehavior: AllArcsBehavior;

  /**
   * If true, we continuously generate arcs between any pairs
   * of the available points (derived from locationArray).
   */
  infiniteRandom?: boolean;
  /**
   * How often (in ms) to create a new random arc.
   * (If infiniteRandom is true)
   */
  spawnInterval?: number;
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function createRandomArc(allPoints: CityLocation[]): ArcLocation {
  const startIdx = randomInt(allPoints.length);
  let endIdx = randomInt(allPoints.length);
  while (endIdx === startIdx) {
    endIdx = randomInt(allPoints.length);
  }
  return {
    start: allPoints[startIdx],
    end: allPoints[endIdx],
  };
}

export default function ArcGroup({
  locationArray,
  color,
  radius,
  animationDuration = 2500,
  firstAnimationDuration,
  onProgressPersist = true,
  onAllArcsDone = "persist",
  persistArcBehavior,
  infiniteRandom = false,
  spawnInterval = 1500, // default 2 sec between spawns
}: ArcGroupProps) {
  // “All arcs we want to show in the scene right now”
  const [arcsToRender, setArcsToRender] = useState<ArcLocation[]>([]);
  // Track which arcs have started animating
  const [arcsTriggered, setArcsTriggered] = useState<boolean[]>([]);
  // Track which arcs have completed animation
  const [arcsCompleted, setArcsCompleted] = useState<boolean[]>([]);
  // Show final arcs as static?
  const [showFinalArcs, setShowFinalArcs] = useState(false);

  // If not infiniteRandom, once we finish all arcs, increment this
  const [arcsDoneCount, setArcsDoneCount] = useState(0);

  // For an interval-based approach, we may keep a ref to the interval ID
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * One-time reset if we are NOT infinite random.
   * In normal mode, we generate arcs from the locationArray
   * (or do whatever “random” logic you had before).
   */
  const normalResetAll = () => {
    // Possibly your existing function that
    // picks random arcs from locationArray
    const coordinatePoints = getArcCities(locationArray);

    // Example: we just generate 1 arc per city, etc.
    const newArcs: ArcLocation[] = [];
    for (let i = 0; i < coordinatePoints.length - 1; i++) {
      newArcs.push({
        start: coordinatePoints[i],
        end: coordinatePoints[i + 1],
      });
    }

    setArcsToRender(newArcs);
    setArcsTriggered(Array(newArcs.length).fill(false));
    setArcsCompleted(Array(newArcs.length).fill(false));
    setArcsDoneCount(0);
    setShowFinalArcs(false);
  };

  /**
   * If infiniteRandom, spin up an interval to spawn a new arc every X seconds.
   * We spawn arcs from the *city list* derived from locationArray.
   */
  const infiniteStart = () => {
    const coordinatePoints = getArcCities(locationArray);

    // Clean up any existing arcs, or maybe keep them
    setArcsToRender([]);
    setArcsTriggered([]);
    setArcsCompleted([]);
    setShowFinalArcs(false);

    // Start interval that spawns new arcs
    if (!spawnIntervalRef.current) {
      spawnIntervalRef.current = setInterval(() => {
        const newArc = createRandomArc(coordinatePoints);

        // Add the new arc to our arcsToRender
        setArcsToRender((prev) => [...prev, newArc]);
        // Also expand arcsTriggered / arcsCompleted
        setArcsTriggered((prev) => [...prev, false]);
        setArcsCompleted((prev) => [...prev, false]);
      }, spawnInterval);
    }
  };

  /**
   * On mount:
   * - If infiniteRandom, start the spawn interval
   * - Else do normalResetAll
   */
  useEffect(() => {
    if (infiniteRandom) {
      infiniteStart();
    } else {
      normalResetAll();
    }

    return () => {
      // Cleanup: if we had an interval going, clear it
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infiniteRandom, spawnInterval]);

  /**
   * Whenever arcsToRender changes (new arcs added),
   * schedule each *newly added* arc to start at a random delay.
   * (So they don’t all begin animating the moment they appear.)
   */
  useEffect(() => {
    // For each arc, if it’s not yet triggered, schedule it
    arcsToRender.forEach((_arc, i) => {
      if (!arcsTriggered[i]) {
        const delay = Math.random() * 200; // up to 1s
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
   * In normal (non-infinite) mode, once all arcs are done, handle onAllArcsDone
   */
  useEffect(() => {
    if (!infiniteRandom) {
      if (arcsDoneCount === arcsToRender.length && arcsToRender.length > 0) {
        switch (onAllArcsDone) {
          case "remove":
            setArcsCompleted(Array(arcsToRender.length).fill(true));
            break;
          case "reset":
            setTimeout(() => {
              normalResetAll();
            }, 500);
            break;
          case "persist":
            setShowFinalArcs(true);
            break;
          default:
            break;
        }
      }
    }
  }, [arcsDoneCount, arcsToRender.length, onAllArcsDone, infiniteRandom]);

  /**
   * Clean up arcs for infinite mode if we’re *not* persisting.
   * (So we don’t get an unbounded array of old arcs in memory.)
   */
  useEffect(() => {
    if (infiniteRandom && !onProgressPersist) {
      // Filter out arcs that have completed
      const stillActiveArcs = arcsToRender.filter((_a, i) => !arcsCompleted[i]);
      if (stillActiveArcs.length !== arcsToRender.length) {
        setArcsToRender(stillActiveArcs);

        // We also need to keep arcsTriggered/arcsCompleted
        // in sync with the *new* array’s ordering.
        const stillActiveTriggered: boolean[] = [];
        const stillActiveCompleted: boolean[] = [];
        arcsToRender.forEach((arc, i) => {
          if (!arcsCompleted[i]) {
            stillActiveTriggered.push(arcsTriggered[i]);
            stillActiveCompleted.push(arcsCompleted[i]);
          }
        });
        setArcsTriggered(stillActiveTriggered);
        setArcsCompleted(stillActiveCompleted);
      }
    }
  }, [arcsCompleted, arcsToRender, infiniteRandom, onProgressPersist]);

  return (
    <>
      {/* If we are showing final arcs in normal mode, 
          or if we ever wanted to “persist” for infinite mode, 
          you could show a single static mesh. */}
      {showFinalArcs && (
        <AllArcsStaticMesh
          flights={arcsToRender}
          color={color}
          radius={radius + 0.1}
          behavior={persistArcBehavior}
        />
      )}

      {/* Otherwise, render all arcs that are triggered. */}
      {!showFinalArcs &&
        arcsToRender.map((arc, i) => {
          if (!arcsTriggered[i]) {
            return null; // not started yet
          }

          // If arc completed & onProgressPersist=false => hide
          if (arcsCompleted[i] && !onProgressPersist) {
            return null;
          }

          // Possibly first arc special duration
          const arcDuration =
            i === 0 && firstAnimationDuration
              ? firstAnimationDuration
              : animationDuration;

          return (
            <ArcLight
              key={i}
              color={color}
              startLat={arc.start.lat}
              startLon={arc.start.lon}
              endLat={arc.end.lat}
              endLon={arc.end.lon}
              radius={radius + 0.1}
              onProgressPersist={onProgressPersist}
              animationDuration={arcDuration}
              onDone={() => {
                setArcsCompleted((prev) => {
                  const copy = [...prev];
                  copy[i] = true;
                  return copy;
                });
                setArcsDoneCount((prev) => prev + 1);
              }}
            />
          );
        })}
    </>
  );
}
