import { ArcLocation } from "../../../types/earthTypes";

export const flightPaths: ArcLocation[] = [
  //
  // Roundtrip: NYC -> Dallas -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 32.7767, lon: -96.797, name: "Dallas" }, // Dallas
  },
  {
    start: { lat: 32.7767, lon: -96.797, name: "Dallas" }, // Dallas
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> San Francisco -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 37.7749, lon: -122.4194, name: "San Francisco" }, // San Francisco
  },
  {
    start: { lat: 37.7749, lon: -122.4194, name: "San Francisco" }, // San Francisco
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> Louisville -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> Seattle -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 47.6062, lon: -122.3321, name: "Seattle" }, // Seattle
  },
  {
    start: { lat: 47.6062, lon: -122.3321, name: "Seattle" }, // Seattle
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // NYC -> Bogota -> Cumaral -> Cartagena -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 4.711, lon: -74.0721, name: "Bogota" }, // Bogota
  },
  {
    start: { lat: 4.711, lon: -74.0721, name: "Bogota" }, // Bogota
    end: { lat: 4.2702, lon: -73.4772, name: "Cumaral" }, // Cumaral
  },
  {
    start: { lat: 4.2702, lon: -73.4772, name: "Cumaral" }, // Cumaral
    end: { lat: 10.391, lon: -75.4794, name: "Cartagena" }, // Cartagena
  },
  {
    start: { lat: 10.391, lon: -75.4794, name: "Cartagena" }, // Cartagena
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> Destin -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 30.3935, lon: -86.4958, name: "Destin" }, // Destin
  },
  {
    start: { lat: 30.3935, lon: -86.4958, name: "Destin" }, // Destin
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> San Jose, CA -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 37.3382, lon: -121.8863, name: "San Jose, CA" }, // San Jose, CA
  },
  {
    start: { lat: 37.3382, lon: -121.8863, name: "San Jose, CA" }, // San Jose, CA
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // NYC -> Nashville -> Louisville -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 36.1627, lon: -86.7816, name: "Nashville" }, // Nashville
  },
  {
    start: { lat: 36.1627, lon: -86.7816, name: "Nashville" }, // Nashville
    end: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // NYC -> London -> Zurich -> Copenhagen -> Bern -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 51.5074, lon: -0.1278, name: "London" }, // London
  },
  {
    start: { lat: 51.5074, lon: -0.1278, name: "London" }, // London
    end: { lat: 47.3769, lon: 8.5417, name: "Zurich" }, // Zurich
  },
  {
    start: { lat: 47.3769, lon: 8.5417, name: "Zurich" }, // Zurich
    end: { lat: 55.6761, lon: 12.5683, name: "Copenhagen" }, // Copenhagen
  },
  {
    start: { lat: 55.6761, lon: 12.5683, name: "Copenhagen" }, // Copenhagen
    end: { lat: 46.948, lon: 7.4474, name: "Bern" }, // Bern
  },
  {
    start: { lat: 46.948, lon: 7.4474, name: "Bern" }, // Bern
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> Reykjavik -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 64.1466, lon: -21.9426, name: "Reykjavik" }, // Reykjavik
  },
  {
    start: { lat: 64.1466, lon: -21.9426, name: "Reykjavik" }, // Reykjavik
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> Louisville -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },

  //
  // Roundtrip: NYC -> Louisville -> NYC (again)
  //
  {
    start: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
    end: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585, name: "Louisville" }, // Louisville
    end: { lat: 40.7128, lon: -74.006, name: "New York City" }, // NYC
  },
];
