export const flightPaths = [
  //
  // Roundtrip: NYC -> Dallas -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 32.7767, lon: -96.797 }, // Dallas
  },
  {
    start: { lat: 32.7767, lon: -96.797 }, // Dallas
    end: { lat: 40.7128, lon: -74.006 }, // Back to NYC
  },

  //
  // Roundtrip: NYC -> San Francisco -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 37.7749, lon: -122.4194 }, // San Francisco
  },
  {
    start: { lat: 37.7749, lon: -122.4194 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // Roundtrip: NYC -> Louisville -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 38.2527, lon: -85.7585 }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // Roundtrip: NYC -> Seattle -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 47.6062, lon: -122.3321 }, // Seattle
  },
  {
    start: { lat: 47.6062, lon: -122.3321 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // NYC -> Bogota -> Cumaral -> Cartagena -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 4.711, lon: -74.0721 }, // Bogota
  },
  {
    start: { lat: 4.711, lon: -74.0721 }, // Bogota
    end: { lat: 4.2702, lon: -73.4772 }, // Cumaral
  },
  {
    start: { lat: 4.2702, lon: -73.4772 }, // Cumaral
    end: { lat: 10.391, lon: -75.4794 }, // Cartagena
  },
  {
    start: { lat: 10.391, lon: -75.4794 }, // Cartagena
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // Roundtrip: NYC -> Destin -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 30.3935, lon: -86.4958 }, // Destin
  },
  {
    start: { lat: 30.3935, lon: -86.4958 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // Roundtrip: NYC -> San Jose, CA -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 37.3382, lon: -121.8863 }, // San Jose, CA
  },
  {
    start: { lat: 37.3382, lon: -121.8863 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // NYC -> Nashville -> Louisville -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 36.1627, lon: -86.7816 }, // Nashville
  },
  {
    start: { lat: 36.1627, lon: -86.7816 }, // Nashville
    end: { lat: 38.2527, lon: -85.7585 }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // NYC -> London -> Zurich -> Copenhagen -> Bern -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 51.5074, lon: -0.1278 }, // London
  },
  {
    start: { lat: 51.5074, lon: -0.1278 }, // London
    end: { lat: 47.3769, lon: 8.5417 }, // Zurich
  },
  {
    start: { lat: 47.3769, lon: 8.5417 }, // Zurich
    end: { lat: 55.6761, lon: 12.5683 }, // Copenhagen
  },
  {
    start: { lat: 55.6761, lon: 12.5683 }, // Copenhagen
    end: { lat: 46.948, lon: 7.4474 }, // Bern
  },
  {
    start: { lat: 46.948, lon: 7.4474 }, // Bern
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // Roundtrip: NYC -> Reykjavik -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 64.1466, lon: -21.9426 }, // Reykjavik
  },
  {
    start: { lat: 64.1466, lon: -21.9426 }, // Reykjavik
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // Roundtrip: NYC -> Louisville -> NYC
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 38.2527, lon: -85.7585 }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },

  //
  // Roundtrip: NYC -> Louisville -> NYC (again)
  //
  {
    start: { lat: 40.7128, lon: -74.006 }, // NYC
    end: { lat: 38.2527, lon: -85.7585 }, // Louisville
  },
  {
    start: { lat: 38.2527, lon: -85.7585 },
    end: { lat: 40.7128, lon: -74.006 }, // NYC
  },
];
