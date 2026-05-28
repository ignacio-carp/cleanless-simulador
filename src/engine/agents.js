import { ZONES, getAllDesks } from './zones.js';

// Mulberry32 seeded RNG — determinístico por semilla
function makeRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPosInZone(zone, rng) {
  const pad = 15;
  return {
    x: zone.x + pad + rng() * (zone.w - pad * 2),
    y: zone.y + pad + rng() * (zone.h - pad * 2),
  };
}

const MEETING_ZONES = ['MEETING_1', 'MEETING_2', 'MEETING_3'];

// DAY_START = 0 (8:00), DAY_END = 660 (19:00), 1 tick = 1 minuto
function generateAgenda(agentId, params, rng) {
  const { bathroomTrips, meetingsPerRoom, lunchAtOffice, meetingAttendance, employeeCount } = params;

  const entryTick = Math.floor(rng() * 120);        // 8:00–10:00
  const exitTick  = 480 + Math.floor(rng() * 120);  // 16:00–18:00

  const events = [];

  // Almuerzo
  if (rng() * 100 < lunchAtOffice) {
    const start = 210 + Math.floor(rng() * 60);      // 11:30–12:30
    const dur   = 20 + Math.floor(rng() * 40);
    if (start > entryTick && start + dur < exitTick) {
      events.push({
        type: 'LUNCH', start, end: start + dur,
        zone: 'KITCHEN',
        pos: randomPosInZone(ZONES.KITCHEN, rng),
      });
    }
  }

  // Reuniones
  const totalSlots = MEETING_ZONES.length * meetingsPerRoom;
  const prob = meetingAttendance / Math.max(employeeCount, 1);
  for (let m = 0; m < totalSlots; m++) {
    if (rng() < prob) {
      const dur   = 45 + Math.floor(rng() * 45);     // 45–90 min
      const start = 60 + Math.floor(rng() * 360);    // 9:00–15:00
      const zoneId = MEETING_ZONES[m % MEETING_ZONES.length];
      if (start > entryTick && start + dur < exitTick) {
        events.push({
          type: 'MEETING', start, end: start + dur,
          zone: zoneId,
          pos: randomPosInZone(ZONES[zoneId], rng),
        });
      }
    }
  }

  // Idas al baño
  const trips = Math.max(1, Math.round(bathroomTrips * (0.5 + rng())));
  for (let i = 0; i < trips; i++) {
    const start = entryTick + Math.floor(rng() * (exitTick - entryTick - 10));
    const dur   = 3 + Math.floor(rng() * 5);
    events.push({
      type: 'BATHROOM', start, end: start + dur,
      zone: 'BATHROOM',
      pos: randomPosInZone(ZONES.BATHROOM, rng),
    });
  }

  // Tránsito breve por pasillo
  for (let i = 0; i < 4; i++) {
    const start = entryTick + Math.floor(rng() * (exitTick - entryTick - 5));
    events.push({
      type: 'TRANSIT', start, end: start + 2,
      zone: 'CORRIDOR',
      pos: randomPosInZone(ZONES.CORRIDOR, rng),
    });
  }

  events.sort((a, b) => a.start - b.start);
  return { entryTick, exitTick, events };
}

export function createAgents(params, seed = 42) {
  const rng = makeRng(seed);
  const allDesks = getAllDesks();
  const count = Math.min(params.employeeCount, allDesks.length);

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    desk: allDesks[i],
    ...generateAgenda(i, params, rng),
  }));
}

export function getAgentFrame(agent, tick) {
  if (tick < agent.entryTick || tick >= agent.exitTick) {
    return { zone: null, pos: agent.desk, status: 'AWAY' };
  }

  const active = agent.events.find(e => tick >= e.start && tick < e.end);
  if (active) {
    return { zone: active.zone, pos: active.pos, status: active.type };
  }

  return { zone: agent.desk.zone, pos: agent.desk, status: 'WORKING' };
}
