// earthMath.test.ts
import gsap from "gsap";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  flyCameraToCountry,
  flyCameraToPoint,
  getCountryCentroid,
  getNearestIntersection,
} from "../components/earth/utils/earthMath";
import { DotInfo } from "../types/earthTypes";

jest.mock("gsap", () => ({
  // Mock GSAP: we’ll track the calls to ensure correct usage.
  to: jest.fn(),
}));

describe("getCountryCentroid", () => {
  it("returns null if no dots match the given ISO code", () => {
    const dots: DotInfo[] = [
      { isoA3: "USA", x: 10, y: 0, z: 5, countryName: "USA" },
      { isoA3: "CAN", x: 2, y: 2, z: 2, countryName: "Canada" },
    ];
    const centroid = getCountryCentroid({ isoA3: "MEX", dots });
    expect(centroid).toBeNull();
  });

  it("returns the correct centroid for a single dot", () => {
    const dots: DotInfo[] = [
      { isoA3: "USA", x: 10, y: 20, z: 30, countryName: "USA" },
    ];
    const centroid = getCountryCentroid({ isoA3: "USA", dots });
    expect(centroid).not.toBeNull();
    expect(centroid).toBeInstanceOf(THREE.Vector3);
    expect(centroid?.x).toBe(10);
    expect(centroid?.y).toBe(20);
    expect(centroid?.z).toBe(30);
  });

  it("returns the average of multiple dots for the given ISO code", () => {
    const dots: DotInfo[] = [
      { isoA3: "USA", x: 10, y: 0, z: 0, countryName: "USA" },
      { isoA3: "USA", x: 20, y: 0, z: 10, countryName: "USA" },
      { isoA3: "CAN", x: 2, y: 2, z: 2, countryName: "Canada" },
      { isoA3: "USA", x: 30, y: 10, z: 0, countryName: "USA" },
    ];
    const centroid = getCountryCentroid({ isoA3: "USA", dots });
    // Dots for USA = (10,0,0), (20,0,10), (30,10,0)
    // Summation = (60,10,10), count=3 → average = (20,3.333...,3.333...)
    expect(centroid).toBeInstanceOf(THREE.Vector3);
    expect(centroid).not.toBeNull();
    expect(centroid?.x).toBeCloseTo(20);
    expect(centroid?.y).toBeCloseTo(3.3333, 4);
    expect(centroid?.z).toBeCloseTo(3.3333, 4);
  });
});

describe("flyCameraToPoint", () => {
  let camera: THREE.Camera;
  let controls: OrbitControlsImpl;

  beforeEach(() => {
    // Reset mock calls before each test
    (gsap.to as jest.Mock).mockClear();

    // Create a simple mock camera & controls
    camera = new THREE.PerspectiveCamera();
    controls = {
      update: jest.fn(),
      // Mock the rest if needed...
    } as unknown as OrbitControlsImpl;
  });

  it("calls gsap.to with the correct position", () => {
    const targetPos = new THREE.Vector3(10, 0, 0);
    flyCameraToPoint({ camera, controls, targetPos, distanceOffset: 50 });

    // The direction from (0,0,0) to (10,0,0) is simply x=1, y=0, z=0
    // targetPos.length()=10, so final camera position is:
    // direction(1,0,0) × (distance=10 + 50) = (60,0,0)
    const expectedPos = { x: 60, y: 0, z: 0 };

    // The last call to gsap.to should contain the final camera coords
    const lastCallArgs = (gsap.to as jest.Mock).mock.calls[0][1]; // the second param is the config
    expect(lastCallArgs).toMatchObject(expectedPos);
    expect(lastCallArgs.duration).toBe(2);
    expect(lastCallArgs.ease).toBe("power2.inOut");

    // Also check onUpdate calls controls.update
    lastCallArgs.onUpdate();
    expect(controls.update).toHaveBeenCalled();
  });

  it("defaults distanceOffset to 300 if not provided", () => {
    const targetPos = new THREE.Vector3(0, 100, 0);
    flyCameraToPoint({ camera, controls, targetPos });

    // targetPos.length()=100, direction is (0,1,0)
    // => final camera position is (0, 400, 0)
    const lastCallArgs = (gsap.to as jest.Mock).mock.calls[0][1];
    expect(lastCallArgs).toMatchObject({ x: 0, y: 400, z: 0 });
  });
});

describe("flyCameraToCountry", () => {
  let camera: THREE.Camera;
  let controls: OrbitControlsImpl;
  let globe: THREE.Group;
  let dots: DotInfo[];

  beforeEach(() => {
    (gsap.to as jest.Mock).mockClear();

    camera = new THREE.PerspectiveCamera();
    controls = { update: jest.fn() } as unknown as OrbitControlsImpl;
    globe = new THREE.Group();
    dots = [
      { isoA3: "AAA", x: 1, y: 2, z: 3, countryName: "CountryA" },
      { isoA3: "BBB", x: 10, y: 10, z: 10, countryName: "CountryB" },
    ];
  });

  it("does nothing if centroid is null (country not found)", () => {
    flyCameraToCountry({
      camera,
      controls,
      globe,
      isoA3: "UNKNOWN",
      dots,
      distanceOffset: 300,
    });
    // Should NOT call gsap.to
    expect(gsap.to).not.toHaveBeenCalled();
  });

  it("calls localToWorld & flyCameraToPoint if centroid is found", () => {
    // Spy on localToWorld
    const localToWorldSpy = jest.spyOn(globe, "localToWorld");
    flyCameraToCountry({
      camera,
      controls,
      globe,
      isoA3: "AAA",
      dots,
      distanceOffset: 100,
    });

    expect(localToWorldSpy).toHaveBeenCalled();
    expect(gsap.to).toHaveBeenCalledTimes(1);
  });
});

describe("getNearestIntersection", () => {
  it("returns null if there are no intersections", () => {
    const evt = {
      intersections: [],
    } as unknown as THREE.Event & { intersections?: THREE.Intersection[] };
    const intersection = getNearestIntersection(evt);
    expect(intersection).toBeNull();
  });

  it("returns the single intersection if only one exists", () => {
    const single = { distance: 5 } as THREE.Intersection;
    const evt = {
      intersections: [single],
    } as unknown as THREE.Event & { intersections?: THREE.Intersection[] };
    const intersection = getNearestIntersection(evt);
    expect(intersection).toBe(single);
  });

  it("returns the nearest intersection among multiple", () => {
    const intersectionA = { distance: 10 } as THREE.Intersection;
    const intersectionB = { distance: 3 } as THREE.Intersection;
    const intersectionC = { distance: 7 } as THREE.Intersection;

    const evt = {
      intersections: [intersectionA, intersectionB, intersectionC],
    } as unknown as THREE.Event & { intersections?: THREE.Intersection[] };

    const nearest = getNearestIntersection(evt);
    expect(nearest).toBe(intersectionB);
  });
});
