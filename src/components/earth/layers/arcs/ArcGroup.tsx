import { useEffect, useState } from "react";
import {
  AllArcsBehavior,
  ArcLocation,
  OnAllArcsDoneBehavior,
} from "../../../../types/earthTypes";
import AllArcsStaticMesh from "./AllArcsStaticMesh";
import ArcLight from "./Arc";

export interface ArcGroupProps {
  /**
   * Array of start and end coordinates for each arc.
   */
  locationArray: ArcLocation[];

  /**
   * If true, arcs animate sequentially one-by-one.
   * If false, all arcs animate in parallel.
   */
  sequential?: boolean;

  /**
   * Color of the arcs (e.g., hex code, RGB, etc.).
   */
  color: string;

  /**
   * Radius of the globe used to map lat/lon to 3D coordinates.
   */
  radius: number;

  /**
   * Duration of each arc animation in milliseconds.
   * Default is 2500ms.
   */
  animationDuration?: number;

  /**
   * If true, completed arcs remain visible after animation ends.
   * If false, arcs disappear upon completing their animation.
   */
  onProgressPersist?: boolean;

  /**
   * Behavior when all arcs finish:
   *  - "persist": Keep arcs visible (default).
   *  - "remove": Hide all arcs immediately after completion.
   *  - "reset": Hide arcs and restart the animation sequence.
   */
  onAllArcsDone?: OnAllArcsDoneBehavior;

  /**
   * Determines how arcs behave after persisting in the final state.
   */
  persistArcBehavior: AllArcsBehavior;
}

/**
 * Component for rendering a group of arcs between geographic points.
 * Arcs can animate sequentially or in parallel based on the `sequential` prop.
 *
 * Once an arc finishes:
 *  - If `onProgressPersist` is false, the arc disappears.
 *  - Otherwise, the arc remains visible until all arcs are complete.
 *
 * When all arcs finish:
 *  - Behavior is determined by the `onAllArcsDone` prop.
 */
const ArcGroup = ({
  locationArray,
  sequential = false,
  color,
  radius,
  animationDuration = 2500,
  onProgressPersist = true,
  onAllArcsDone = "persist",
  persistArcBehavior,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              radius={radius + 0.1}
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
          radius={radius + 0.1}
          behavior={persistArcBehavior}
        />
      )}
    </>
  );
};

export default ArcGroup;
