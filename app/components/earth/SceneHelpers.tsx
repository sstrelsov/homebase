import { RefObject, useEffect } from "react";
import * as THREE from "three";
import { EARTH_RADIUS } from "./EarthScene";

interface SceneHelpersProps {
  axesHelperRef: RefObject<THREE.AxesHelper | null>;
  cameraRef: RefObject<THREE.Camera | null>;
}

const SceneHelpers = ({ axesHelperRef, cameraRef }: SceneHelpersProps) => {
  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = true;
    }
  }, [axesHelperRef]);

  return (
    <>
      <primitive
        ref={axesHelperRef}
        object={new THREE.AxesHelper(500).setColors("red", "white", "blue")}
      />
      <gridHelper args={[1000, 50]} />
      <primitive
        object={
          new THREE.BoxHelper(
            new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS))
          )
        }
      />
      {cameraRef.current && (
        <primitive object={new THREE.CameraHelper(cameraRef.current)} />
      )}
      <polarGridHelper args={[EARTH_RADIUS, 16, 8, 64]} />
    </>
  );
};

export default SceneHelpers;
