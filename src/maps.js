// The Castles of Burgundy Dice Game - Map Data
// A synthesized and balanced reconstruction of the 3 maps

export const mapAData = [
  ['blue', 'blue', 'gray', 'gray'],
  ['orange', 'orange', 'purple', 'purple', 'orange'],
  ['orange', 'green_blue', 'yellow', 'yellow', 'green_gray', 'purple'],
  ['orange', 'blue', 'blue', 'purple', 'orange', 'orange', 'orange'],
  ['yellow', 'green_orange', 'purple', 'blue', 'green_purple', 'yellow'],
  ['yellow', 'gray', 'blue', 'purple', 'purple'],
  ['gray', 'orange', 'yellow', 'yellow']
];

export const mapBData = [
  ['yellow', 'yellow', 'purple', 'gray'],
  ['orange', 'orange', 'orange', 'gray', 'blue'],
  ['orange', 'green_purple', 'blue', 'yellow', 'green_orange', 'purple'],
  ['gray', 'blue', 'blue', 'yellow', 'blue', 'purple', 'purple'],
  ['gray', 'green_gray', 'purple', 'blue', 'green_blue', 'orange'],
  ['purple', 'purple', 'orange', 'yellow', 'orange'],
  ['yellow', 'orange', 'orange', 'yellow']
];

export const mapCData = [
  ['orange', 'green_silver', 'purple', 'purple'],
  ['gray', 'gray', 'orange', 'orange', 'orange'],
  ['orange', 'green_commodity', 'yellow', 'blue', 'purple', 'yellow'],
  ['yellow', 'orange', 'yellow', 'blue', 'orange', 'blue', 'blue'],
  ['yellow', 'purple', 'green_worker', 'orange', 'orange', 'green_monk'],
  ['purple', 'gray', 'gray', 'yellow', 'purple'],
  ['blue', 'blue', 'yellow', 'purple']
];

export const mapDData = [
  ['yellow', 'green_gray', 'orange', 'orange'],
  ['orange', 'yellow', 'purple', 'gray', 'yellow'],
  ['blue', 'green_orange', 'orange', 'gray', 'blue', 'blue'],
  ['blue', 'yellow', 'yellow', 'blue', 'purple', 'purple', 'yellow'],
  ['orange', 'purple', 'green_blue', 'blue', 'green_purple', 'orange'],
  ['purple', 'purple', 'orange', 'orange', 'orange'],
  ['yellow', 'gray', 'gray', 'purple']
];

// Helper to parse the map data into Hex objects and compute connected components (Areas)
export function buildMap(dataRows) {
  const hexes = [];
  const qOffsets = [0, -1, -2, -3, -3, -3, -3];

  let idCounter = 0;

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx];
    const r = rowIdx - 3;
    const qStart = qOffsets[rowIdx];

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const q = qStart + colIdx;
      let rawColor = row[colIdx];
      let color = rawColor;
      let isStart = false;
      let castleBonus = null;

      if (rawColor.startsWith('green_')) {
        color = 'green';
        castleBonus = rawColor.split('_')[1];
      }

      const hex = {
        id: idCounter++,
        q, r, s: -q - r,
        color,
        isStart,
        castleBonus,
        val: null, // the die number placed
        areaId: null
      };
      hexes.push(hex);
    }
  }

  // Calculate adjacency
  const hexMap = new Map();
  hexes.forEach(h => hexMap.set(`${h.q},${h.r}`, h));

  const dirs = [
    [1, 0], [1, -1], [0, -1],
    [-1, 0], [-1, 1], [0, 1]
  ];

  for (const hex of hexes) {
    hex.neighbors = dirs
      .map(d => hexMap.get(`${hex.q + d[0]},${hex.r + d[1]}`))
      .filter(Boolean)
      .map(n => n.id);
  }

  // Connected components / Areas (same color connected)
  let nextAreaId = 1;
  const visited = new Set();

  for (const hex of hexes) {
    if (visited.has(hex.id)) continue;

    const areaId = nextAreaId++;
    const queue = [hex];
    visited.add(hex.id);

    while (queue.length > 0) {
      const current = queue.shift();
      current.areaId = areaId;

      for (const nid of current.neighbors) {
        const neighbor = hexes[nid];
        if (!visited.has(nid) && neighbor.color === current.color) {
          visited.add(nid);
          queue.push(neighbor);
        }
      }
    }
  }

  // Store area sizes
  const areaSizes = {};
  for (const hex of hexes) {
    areaSizes[hex.areaId] = (areaSizes[hex.areaId] || 0) + 1;
  }
  for (const hex of hexes) {
    hex.areaSize = areaSizes[hex.areaId];
  }

  return { hexes, areaSizes };
}
