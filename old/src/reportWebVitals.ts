import type { Metric } from "web-vitals";
// `Metric` is a type provided by the `web-vitals` library that describes the structure of performance metric objects.

import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

/**
 * Reports web performance metrics using the `web-vitals` library.
 *
 * @param onPerfEntry - A callback function that receives a `Metric` object for each performance metric.
 *                      This function can be used to log metrics, send them to an analytics endpoint, etc.
 */
export function reportWebVitals(onPerfEntry?: (metric: Metric) => void): void {
  if (onPerfEntry && typeof onPerfEntry === "function") {
    // Measure and report the Cumulative Layout Shift (CLS)
    // CLS quantifies visual stability by tracking unexpected layout shifts.
    onCLS(onPerfEntry);

    // Measure and report the First Contentful Paint (FCP)
    // FCP is the time taken to render the first visible element on the screen.
    onFCP(onPerfEntry);

    // Measure and report the Interaction to Next Paint (INP)
    // INP tracks overall responsiveness to user interactions, representing the latency of the slowest interaction.
    onINP(onPerfEntry);

    // Measure and report the Largest Contentful Paint (LCP)
    // LCP is the time taken to render the largest visible element (e.g., a hero image or headline).
    onLCP(onPerfEntry);

    // Measure and report the Time to First Byte (TTFB)
    // TTFB is the time taken for the browser to receive the first byte of data from the server.
    onTTFB(onPerfEntry);
  }
}

export default reportWebVitals;
