// generateLandDots_fibonacci.js
const fs = require("fs");
const turf = require("@turf/turf");

// CONFIG
const DOT_COUNT = 60000; // tweak as you like
const RADIUS = 300;
const LOG_INTERVAL = 5000; // log progress every 5k points

/**
 * 1) Generate points on the unit sphere using a Fibonacci approach.
 *    (Golden angle approach a.k.a. "sunflower" distribution)
 *    Returns an array of { x, y, z } on the *unit* sphere.
 */
function fibonacciSphere(numPoints) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399963
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    // y goes from +1 down to -1
    const y = 1 - (i / (numPoints - 1)) * 2; // in [-1..+1]
    const radiusAtY = Math.sqrt(1 - y * y); // circle radius for that slice
    const theta = goldenAngle * i;

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    points.push({ x, y, z });
  }
  return points;
}

/**
 * 2) Convert a unit-sphere point (x,y,z) to lat-lon in degrees.
 *    Here, we assume Y is "up" => lat is arcsin(y),
 *    and we derive lon from x,z with the usual formula.
 *
 *    We'll then apply the "flip the z" fix when we convert *back*
 *    to final x,y,z. See step 4 below.
 */
function xyzToLatLon(x, y, z) {
  // 'y' is the up-axis, so lat = arcsin(y)
  const latRad = Math.asin(y);
  const latDeg = (latRad * 180) / Math.PI;

  // compute lon from x,z
  // Usually, lonRad = atan2(z, x)
  const lonRad = Math.atan2(z, x);
  const lonDeg = (lonRad * 180) / Math.PI;
  return { latDeg, lonDeg };
}

/**
 * 3) Identify which feature (country) a lat-lon belongs to using Turf.
 */
function getPointFeature(lat, lon, features) {
  // Make a turf point [lon, lat] in degrees
  const pt = turf.point([lon, lat]);
  for (const feature of features) {
    if (turf.booleanPointInPolygon(pt, feature)) {
      return feature;
    }
  }
  return null;
}

/**
 * 4) Convert lat-lon back to final 3D coords, with the fix that flips z
 *    so we don’t mirror the Western Hemisphere.
 */
function latLonToXYZ(latDeg, lonDeg, radius) {
  const latRad = (Math.PI / 180) * latDeg;
  const lonRad = (Math.PI / 180) * lonDeg;

  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  // NOTE the minus sign to avoid mirrored Earth:
  const z = -radius * Math.cos(latRad) * Math.sin(lonRad);
  return { x, y, z };
}

async function main() {
  console.log("Starting generateLandDots_fibonacci...");

  // 1) Load your land GeoJSON (WGS84 lat/lon)
  const filename = "generate-globe/input.geojson"; // adapt to your file
  console.log(`Reading GeoJSON from "${filename}"...`);
  const raw = fs.readFileSync(filename, "utf8");
  const geojson = JSON.parse(raw);

  if (!geojson.features || !geojson.features.length) {
    console.error(`No "features" found in ${filename}!`);
    return;
  }
  console.log(`GeoJSON features count: ${geojson.features.length}`);

  // 2) Generate ~DOT_COUNT points on the unit sphere
  console.log(`Generating ${DOT_COUNT} fibonacci-sphere points...`);
  const unitSpherePoints = fibonacciSphere(DOT_COUNT);

  // 3) For each point, convert to lat-lon, check if it's on land
  const landPoints = [];
  let landCount = 0;
  for (let i = 0; i < unitSpherePoints.length; i++) {
    if (i > 0 && i % LOG_INTERVAL === 0) {
      console.log(`Processed ${i} points... (land so far: ${landCount}).`);
    }

    const { x, y, z } = unitSpherePoints[i];
    // Convert from (x,y,z) => lat/lon
    const { latDeg, lonDeg } = xyzToLatLon(x, y, z);

    // Identify which feature (country) the lat-lon belongs to
    const match = getPointFeature(latDeg, lonDeg, geojson.features);
    if (match) {
      landCount++;
      // Convert lat-lon back to final 3D coords (with the z-flip fix)
      const {
        x: finalX,
        y: finalY,
        z: finalZ,
      } = latLonToXYZ(latDeg, lonDeg, RADIUS);

      const props = match.properties || {};
      const countryName = props.ADMIN || "(unknown)";
      const isoA3 = props.ADM0_A3 || "(none)";

      landPoints.push({ x: finalX, y: finalY, z: finalZ, countryName, isoA3 });
    }
  }

  console.log(
    `Finished fibonacci distribution. Found ${landCount} land points out of ${DOT_COUNT}.`
  );

  // 4) Write output to JSON
  const outFile = "landDots.json";
  fs.writeFileSync(outFile, JSON.stringify(landPoints, null, 2));
  console.log(`Wrote ${landCount} land points to "${outFile}".`);
  console.log("Done!");
}

main().catch((err) => {
  console.error("An error occurred in generateLandDots_fibonacci:", err);
});
