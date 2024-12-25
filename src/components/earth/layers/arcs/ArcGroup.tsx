import { useEffect, useState } from "react";
import AllArcsStaticMesh from "./AllArcsStaticMesh";
import ArcLight from "./Arc";

interface Coordinates {
  lat: number;
  lon: number;
}

interface ArcLocation {
  start: Coordinates;
  end: Coordinates;
}

export type OnAllArcsDoneBehavior = "persist" | "remove" | "reset";

interface ArcGroupProps {
  /**
   * Array of start/end lat/lon coords for each arc.
   */
  locationArray: ArcLocation[];

  /**
   * If true, arcs animate one-by-one in sequence.
   * If false, all arcs animate in parallel.
   */
  sequential?: boolean;

  /**
   * Color of all arcs.
   */
  color?: string;

  /**
   * Earth radius used by ArcLight to project lat/lon to 3D coords.
   */
  radius: number;

  /**
   * How long each arc takes to draw (in ms).
   */
  animationDuration?: number;

  /**
   * If true, arcs remain visible after finishing.
   * If false, arcs immediately hide upon completion.
   */
  onProgressPersist?: boolean;

  /**
   * Determines behavior after all arcs have completed:
   *  - "persist": Do nothing (leave arcs as they are).
   *  - "remove": Hide all arcs as soon as the final arc completes.
   *  - "reset": Hide all arcs and re-run the entire sequence from scratch.
   */
  onAllArcsDone?: OnAllArcsDoneBehavior;
}

/**
 * Renders multiple ArcLight components in either:
 *  - Parallel mode (all arcs shown at once).
 *  - Sequential mode (arcs shown one-by-one).
 *
 * Once an arc finishes, if `onProgressPersist` is false, that arc disappears.
 * Once all arcs finish:
 *  - "persist": do nothing special (default).
 *  - "remove": hide all arcs immediately.
 *  - "reset": hide all arcs and start again from arc #0.
 */
const ArcGroup = ({
  locationArray,
  sequential = false,
  color = "#ffcd53",
  radius,
  animationDuration = 2500,
  onProgressPersist = true,
  onAllArcsDone = "persist",
}: ArcGroupProps) => {
  /**
   * currentArcIndex:
   *  - In sequential mode, the index of the arc currently animating (or just finished).
   *  - In parallel mode, not really used to limit arcs, but we still track for resetting logic.
   */
  const [currentArcIndex, setCurrentArcIndex] = useState(0);

  /**
   * arcsDoneCount: how many arcs have fully completed their animation.
   */
  const [arcsDoneCount, setArcsDoneCount] = useState(0);

  /**
   * Track which arcs have completed to control per-arc visibility if onProgressPersist=false
   */
  const [arcsCompleted, setArcsCompleted] = useState<boolean[]>(
    Array(locationArray.length).fill(false)
  );

  const [showFinalArcs, setShowFinalArcs] = useState(false);

  /**
   * Reset everything if the user chooses "reset" after the final arc,
   * or if we mount fresh.
   */
  const resetAll = () => {
    setCurrentArcIndex(0);
    setArcsDoneCount(0);
    setArcsCompleted(Array(locationArray.length).fill(false));
  };

  /**
   * Once the final arc is done, handle "onAllArcsDone" behavior
   */
  useEffect(() => {
    if (arcsDoneCount === locationArray.length && locationArray.length > 0) {
      // If we've just completed the final arc:
      switch (onAllArcsDone) {
        case "remove":
          // Hide all arcs
          setArcsCompleted(Array(locationArray.length).fill(true));
          // But "onProgressPersist" logic here means we set arcsCompleted to show them as "done"
          // Actually, we want them hidden, so let's do a separate "removeAll" approach:
          setTimeout(() => {
            // Instantly hide all arcs
            setArcsCompleted(Array(locationArray.length).fill(false));
          }, 0);
          break;
        case "reset":
          // Wait a short moment so we can see the final arc
          setTimeout(() => {
            resetAll();
          }, 500);
          break;
        case "persist":
          setShowFinalArcs(true);
          break;
        default:
          break;
      }
    }
  }, [arcsDoneCount, locationArray.length, onAllArcsDone]);

  return (
    <>
      {!showFinalArcs &&
        locationArray.map((flight, i) => {
          // If we are in sequential mode, skip arcs beyond currentArcIndex
          if (sequential && i > currentArcIndex) {
            return null;
          }

          // If arc i is done & onProgressPersist is false => hide it
          if (arcsCompleted[i] && !onProgressPersist) {
            return null;
          }

          return (
            <ArcLight
              key={i}
              color={color}
              startLat={flight.start.lat}
              startLon={flight.start.lon}
              endLat={flight.end.lat}
              endLon={flight.end.lon}
              radius={radius + 2}
              onProgressPersist={onProgressPersist}
              animationDuration={animationDuration}
              onDone={() => {
                setArcsCompleted((prev) => {
                  const copy = [...prev];
                  copy[i] = true;
                  return copy;
                });

                // Increase arcsDoneCount
                setArcsDoneCount((prev) => prev + 1);

                // If sequential, move to the next arc in line
                if (sequential && i === currentArcIndex) {
                  setTimeout(() => {
                    setCurrentArcIndex((prev) => prev + 1);
                  }, 500);
                }
              }}
            />
          );
        })}
      {showFinalArcs && (
        <AllArcsStaticMesh
          flights={locationArray}
          color={color}
          radius={radius + 2}
          smoothOn
        />
      )}
    </>
  );
};

export default ArcGroup;
