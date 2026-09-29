import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import styles from "../css/mustache.module.css";
import { type LatLng, MUSTACHE_PATH, type Place } from "../data/mustacheStory";

const HOP_MS = 1600;
const NEON = "#39ff14";

// CARTO basemaps need a (free) API key — https://carto.com/basemaps/apikey.
// Without one, every CARTO tile is an "API KEY REQUIRED" watermark, so we
// fall back to Esri's keyless dark canvas (native tiles stop at zoom 16).
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILES = CARTO_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
      options: {
        subdomains: "abcd",
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    }
  : {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      options: {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
      },
    };

/** Points along a gentle arc from a to b, so each hop reads as a jump. */
function hopArc([aLat, aLng]: LatLng, [bLat, bLng]: LatLng): LatLng[] {
  const bend = 0.25;
  const cLat = (aLat + bLat) / 2 + (bLng - aLng) * bend;
  const cLng = (aLng + bLng) / 2 - (bLat - aLat) * bend;
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    const u = 1 - t;
    return [
      u * u * aLat + 2 * u * t * cLat + t * t * bLat,
      u * u * aLng + 2 * u * t * cLng + t * t * bLng,
    ];
  });
}

const geraldIcon = L.divIcon({
  className: styles.gerald,
  html: `<svg viewBox="0 0 200 80"><path d="${MUSTACHE_PATH}"/></svg>`,
  iconSize: [34, 14],
  iconAnchor: [17, 7],
});

interface HeightsMapProps {
  /** Every place on the walk, shown dim until Gerald visits. */
  places: Place[];
  /** Where Gerald has been, in order. The last one is where he stands. */
  stops: Place[];
  glowing: boolean;
}

const HeightsMap = ({ places, stops, glowing }: HeightsMapProps) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>(null);
  const gerald = useRef<L.Marker>(null);
  const hops = useRef<L.LayerGroup>(null);
  const dots = useRef(new Map<Place, L.CircleMarker>());
  const hopsDrawn = useRef(0);

  useEffect(() => {
    if (!container.current) return;
    const m = L.map(container.current, {
      zoomControl: false,
      scrollWheelZoom: false,
    }).fitBounds(L.latLngBounds(places.map((p) => p.at)), {
      padding: [18, 18],
    });
    if (!CARTO_KEY) {
      console.info(
        "VITE_CARTO_API_KEY is not set; using Esri fallback tiles. See .env.example.",
      );
    }
    L.tileLayer(TILES.url, TILES.options).addTo(m);
    for (const place of places) {
      dots.current.set(
        place,
        L.circleMarker(place.at, {
          radius: 4,
          color: NEON,
          weight: 1,
          opacity: 0.35,
          fillOpacity: 0.15,
        }).addTo(m),
      );
    }
    hops.current = L.layerGroup().addTo(m);
    gerald.current = L.marker(places[0].at, {
      icon: geraldIcon,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      dots.current.clear();
      hopsDrawn.current = 0;
    };
  }, [places]);

  // Light up the places Gerald has visited, and name the one he's at.
  useEffect(() => {
    const visited = new Set(stops);
    const here = stops[stops.length - 1];
    for (const [place, dot] of dots.current) {
      const seen = visited.has(place);
      dot.setStyle({
        opacity: seen ? 1 : 0.35,
        fillOpacity: seen ? 0.9 : 0.15,
      });
      dot.unbindTooltip();
      if (place === here) {
        dot.bindTooltip(place.name, {
          permanent: true,
          direction: "right",
          offset: [8, 0],
          className: styles.label,
        });
      }
    }
  }, [stops]);

  // Draw the newest hop and walk Gerald along it.
  useEffect(() => {
    const m = map.current;
    const marker = gerald.current;
    const layer = hops.current;
    if (!m || !marker || !layer) return;

    // A new walk: back to the start.
    if (stops.length - 1 < hopsDrawn.current) {
      layer.clearLayers();
      hopsDrawn.current = 0;
      marker.setLatLng(stops[0].at);
      m.flyToBounds(L.latLngBounds(places.map((p) => p.at)), {
        padding: [18, 18],
        duration: 1,
      });
      return;
    }
    if (stops.length - 1 === hopsDrawn.current) return;

    const from = stops[stops.length - 2].at;
    const to = stops[stops.length - 1].at;
    const arc = hopArc(from, to);
    const line = L.polyline(arc, {
      color: NEON,
      weight: 3,
      className: styles.hop,
      interactive: false,
    }).addTo(layer);
    line.getElement()?.setAttribute("pathLength", "1");
    hopsDrawn.current = stops.length - 1;

    m.flyToBounds(L.latLngBounds([from, to]), {
      padding: [56, 56],
      maxZoom: 17,
      duration: 1,
    });

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / HOP_MS, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      marker.setLatLng(arc[Math.round(eased * (arc.length - 1))]);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      marker.setLatLng(to);
    };
  }, [places, stops]);

  useEffect(() => {
    gerald.current?.getElement()?.classList.toggle(styles.glowing, glowing);
  }, [glowing]);

  return (
    <div
      ref={container}
      className={`h-[38vh] w-full overflow-hidden rounded-xl ${styles.map}`}
      role="img"
      aria-label="A map of Brooklyn Heights showing Gerald's walk"
    />
  );
};

export default HeightsMap;
