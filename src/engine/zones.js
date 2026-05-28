export const SVG_W = 1000;
export const SVG_H = 600;

export const ZONES = {
  RECEPTION: {
    id: 'RECEPTION', label: 'Recepción',
    x: 0, y: 0, w: 150, h: 210,
    type: 'reception',
  },
  MEETING_1: {
    id: 'MEETING_1', label: 'Sala 1',
    x: 150, y: 0, w: 200, h: 210,
    type: 'meeting',
  },
  MEETING_2: {
    id: 'MEETING_2', label: 'Sala 2',
    x: 350, y: 0, w: 200, h: 210,
    type: 'meeting',
  },
  MEETING_3: {
    id: 'MEETING_3', label: 'Sala 3',
    x: 550, y: 0, w: 200, h: 210,
    type: 'meeting',
  },
  BATHROOM: {
    id: 'BATHROOM', label: 'Baños',
    x: 750, y: 0, w: 250, h: 210,
    type: 'bathroom',
  },
  CORRIDOR: {
    id: 'CORRIDOR', label: 'Pasillo',
    x: 0, y: 210, w: 1000, h: 45,
    type: 'corridor',
  },
  OPEN_A: {
    id: 'OPEN_A', label: 'Open Space A',
    x: 0, y: 255, w: 310, h: 345,
    type: 'openspace',
  },
  OPEN_B: {
    id: 'OPEN_B', label: 'Open Space B',
    x: 310, y: 255, w: 310, h: 345,
    type: 'openspace',
  },
  OPEN_C: {
    id: 'OPEN_C', label: 'Open Space C',
    x: 620, y: 255, w: 220, h: 345,
    type: 'openspace',
  },
  KITCHEN: {
    id: 'KITCHEN', label: 'Break Room',
    x: 840, y: 255, w: 160, h: 345,
    type: 'kitchen',
  },
};

export const ZONE_LIST = Object.values(ZONES);

// Cuántos person-ticks de uso disparan la alerta de limpieza
export const DIRT_THRESHOLD = {
  openspace: 1800,
  meeting:   450,
  bathroom:  160,
  corridor:  9999,   // el pasillo no se muestra como "sucio"
  kitchen:   550,
  reception: 2500,
};

export const FLOOR_COLOR = {
  reception: '#1a0f2e',
  meeting:   '#0f1a2e',
  bathroom:  '#071a20',
  corridor:  '#111318',
  openspace: '#0d1a0e',
  kitchen:   '#1a1205',
};

export const ZONE_STROKE = {
  reception: '#4c1d95',
  meeting:   '#1e3a8a',
  bathroom:  '#0c4a6e',
  corridor:  '#1f2937',
  openspace: '#14532d',
  kitchen:   '#78350f',
};

function generateDesksForZone(zone, count) {
  const pad = 28;
  const availW = zone.w - pad * 2;
  const availH = zone.h - pad * 2;
  const cols = Math.ceil(Math.sqrt(count * availW / availH));
  const rows = Math.ceil(count / cols);
  const cellW = availW / cols;
  const cellH = availH / rows;

  const desks = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    desks.push({
      x: zone.x + pad + col * cellW + cellW / 2,
      y: zone.y + pad + row * cellH + cellH / 2,
      zone: zone.id,
    });
  }
  return desks;
}

export function getAllDesks() {
  return [
    ...generateDesksForZone(ZONES.OPEN_A, 17),
    ...generateDesksForZone(ZONES.OPEN_B, 17),
    ...generateDesksForZone(ZONES.OPEN_C, 16),
  ];
}
