// Static GeoJSON fallback – used when /api/stations is unreachable.
// Replace or extend these entries with real local data.
const MOCK_STATIONS = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9857, 40.7484] },
      properties: {
        id: "mock-001",
        name: "Bryant Park Fountain",
        type: "drinking_water",
        is_free: true,
        address: "Bryant Park, New York, NY 10018",
        last_verified: "2025-06-01T10:00:00Z"
      }
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9776, 40.7614] },
      properties: {
        id: "mock-002",
        name: "Central Park South Refill",
        type: "drinking_water",
        is_free: true,
        address: "59th St & 5th Ave, New York, NY 10019",
        last_verified: "2025-05-15T09:30:00Z"
      }
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9903, 40.7503] },
      properties: {
        id: "mock-003",
        name: "Penn Station Water Vending",
        type: "vending_machine_water",
        is_free: false,
        address: "Penn Station, New York, NY 10001",
        last_verified: "2025-04-20T14:00:00Z"
      }
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9442, 40.6782] },
      properties: {
        id: "mock-004",
        name: "Prospect Park Drinking Fountain",
        type: "drinking_water",
        is_free: true,
        address: "Prospect Park, Brooklyn, NY 11215",
        last_verified: "2025-06-10T08:00:00Z"
      }
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9988, 40.7282] },
      properties: {
        id: "mock-005",
        name: "SoHo Filtered Refill Kiosk",
        type: "vending_machine_water",
        is_free: false,
        address: "550 Broadway, New York, NY 10012",
        last_verified: "2025-03-05T11:00:00Z"
      }
    }
  ]
};
