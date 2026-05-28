import { create } from 'zustand';
import { createAgents, getAgentFrame } from '../engine/agents.js';
import { ZONE_LIST, DIRT_THRESHOLD } from '../engine/zones.js';

export const DAY_END = 660;

export const DEFAULT_PARAMS = {
  employeeCount:     40,
  bathroomTrips:     5,
  meetingsPerRoom:   2,
  lunchAtOffice:     70,
  meetingAttendance: 4,
  cleanersOnSite:    2,
  cleaningDuration:  15,
  restDuration:      30,
};

export const SPEED_OPTIONS = [
  { value: 2.5, label: '×¼',  title: 'Muy lento (4 min/día)' },
  { value: 5,   label: '×½',  title: 'Lento (2 min/día)' },
  { value: 10,  label: '×1',  title: 'Normal (66 seg/día)' },
  { value: 20,  label: '×2',  title: 'Rápido (33 seg/día)' },
  { value: 30,  label: '×3',  title: 'Muy rápido (22 seg/día)' },
];

const MAX_HISTORY = 20;

// Zonas monitoreadas en orden canónico (excl. CORRIDOR)
export const MONITORED_ZONE_IDS = ZONE_LIST
  .filter(z => (DIRT_THRESHOLD[z.type] || 9999) !== 9999)
  .map(z => z.id);

const EMPTY = {
  zoneDirt:          {},
  cleanFlash:        {},
  cleanCount:        {},
  cleanHistory:      [],
  cleaningQueue:     [],    // [zoneId] — en espera de limpiador
  activeCleanings:   {},    // {zoneId: ticksRestantes}
  dirtyMinutes:      0,     // minutos-zona acumulados con pct >= 0.7 sin limpieza activa
  tradRoundCount:    0,     // rondas completadas en modo tradicional
  tradRestRemaining: 0,     // ticks restantes de descanso entre rondas
};

function computeFrames(agents, tick) {
  return agents.map(a => getAgentFrame(a, tick));
}

function computeZoneOcc(frames) {
  const occ = {};
  for (const f of frames) {
    if (f.zone) occ[f.zone] = (occ[f.zone] || 0) + 1;
  }
  return occ;
}

function initialQueue(mode) {
  return mode === 'traditional' ? [...MONITORED_ZONE_IDS] : [];
}

export const useSimStore = create((set, get) => ({
  params:      DEFAULT_PARAMS,
  serviceMode: 'cleanless',   // 'cleanless' | 'traditional' — persiste al reset
  tick:        0,
  speed:       10,
  agents:      [],
  frames:      [],
  zoneOcc:     {},
  ...EMPTY,
  isRunning:   false,

  init() {
    const { params, serviceMode } = get();
    const agents = createAgents(params);
    const frames = computeFrames(agents, 0);
    set({
      agents, frames, zoneOcc: computeZoneOcc(frames),
      ...EMPTY, cleaningQueue: initialQueue(serviceMode),
      tick: 0, isRunning: false,
    });
  },

  setParam(key, value) {
    const { serviceMode } = get();
    const params = { ...get().params, [key]: value };
    const agents = createAgents(params);
    const frames = computeFrames(agents, 0);
    set({
      params, agents, frames, zoneOcc: computeZoneOcc(frames),
      ...EMPTY, cleaningQueue: initialQueue(serviceMode),
      tick: 0,
    });
  },

  setServiceMode(mode) {
    const { agents } = get();
    const frames = computeFrames(agents, 0);
    set({
      serviceMode: mode,
      ...EMPTY, cleaningQueue: initialQueue(mode),
      tick: 0, isRunning: false,
      frames, zoneOcc: computeZoneOcc(frames),
    });
  },

  setSpeed(speed) {
    set({ speed, isRunning: speed > 0 });
  },

  togglePause() {
    const { isRunning, speed } = get();
    set({ isRunning: !isRunning, speed: !isRunning && speed === 0 ? 10 : speed });
  },

  advanceTicks(n) {
    const {
      tick, agents, zoneDirt, cleanFlash, cleanCount, cleanHistory,
      cleaningQueue, activeCleanings, params, serviceMode,
      dirtyMinutes, tradRoundCount, tradRestRemaining,
    } = get();
    const { cleanersOnSite, cleaningDuration } = params;
    const isTraditional = serviceMode === 'traditional';

    const newTick = Math.min(tick + n, DAY_END);
    const frames  = computeFrames(agents, newTick);
    const zoneOcc = computeZoneOcc(frames);

    const dirt    = { ...zoneDirt };
    const flash   = { ...cleanFlash };
    const count   = { ...cleanCount };
    const history = [...cleanHistory];
    let   queue   = [...cleaningQueue];
    const active  = { ...activeCleanings };

    // ── 0. Métrica: minutos con suciedad >70% sin limpieza activa (pre-tick) ──
    let newDirtyMinutes = dirtyMinutes;
    for (const zone of ZONE_LIST) {
      const threshold = DIRT_THRESHOLD[zone.type] || 9999;
      if (threshold === 9999) continue;
      const pct = (zoneDirt[zone.id] || 0) / threshold;
      if (pct >= 0.7 && activeCleanings[zone.id] === undefined) {
        newDirtyMinutes += n;
      }
    }

    // ── 1. Acumular suciedad ──
    for (const zone of ZONE_LIST) {
      const threshold = DIRT_THRESHOLD[zone.type] || 9999;
      if (threshold === 9999)            continue;
      if (active[zone.id] !== undefined) continue; // siendo limpiada

      // CleanLess: no acumular en zonas ya encoladas
      if (!isTraditional && queue.includes(zone.id)) continue;

      const occ = zoneOcc[zone.id] || 0;
      dirt[zone.id] = Math.min(
        (dirt[zone.id] || 0) + occ * n,
        threshold * 0.82
      );

      // CleanLess: encolar al superar umbral
      if (!isTraditional && dirt[zone.id] >= threshold * 0.8) {
        queue.push(zone.id);
      }
    }

    // ── 2. Avanzar limpiezas activas ──
    for (const zId of Object.keys(active)) {
      active[zId] -= n;
      if (active[zId] <= 0) {
        delete active[zId];
        dirt[zId] = 0;
        flash[zId] = 45;
        count[zId] = (count[zId] || 0) + 1;
        history.unshift({ tick: newTick, zoneId: zId });
      }
    }

    // ── 3. Despachar ──
    let newTradRoundCount    = tradRoundCount;
    let newTradRestRemaining = tradRestRemaining;

    if (isTraditional) {
      if (newTradRestRemaining > 0) {
        // Descansando entre rondas
        newTradRestRemaining = Math.max(0, newTradRestRemaining - n);
        if (newTradRestRemaining === 0) {
          // Descanso terminó → cargar nueva ronda
          queue = [...MONITORED_ZONE_IDS];
        }
      } else {
        // No descansando → despachar trabajadores
        while (Object.keys(active).length < cleanersOnSite && queue.length > 0) {
          const next = queue.shift();
          active[next] = cleaningDuration;
        }
        // Si no queda nada → ronda completa, iniciar descanso
        if (Object.keys(active).length === 0 && queue.length === 0) {
          newTradRoundCount += 1;
          if (params.restDuration > 0) {
            newTradRestRemaining = params.restDuration;
          } else {
            queue = [...MONITORED_ZONE_IDS]; // sin descanso: recarga inmediata
          }
        }
      }
    } else {
      // CleanLess: despachar por demanda
      while (Object.keys(active).length < cleanersOnSite && queue.length > 0) {
        const next = queue.shift();
        active[next] = cleaningDuration;
      }
    }

    // ── 4. Decrementar flashes ──
    for (const zId of Object.keys(flash)) {
      flash[zId] = Math.max(0, flash[zId] - n);
      if (flash[zId] === 0) delete flash[zId];
    }

    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

    set({
      tick: newTick, frames, zoneOcc,
      zoneDirt: dirt, cleanFlash: flash,
      cleanCount: count, cleanHistory: history,
      cleaningQueue: queue, activeCleanings: active,
      dirtyMinutes: newDirtyMinutes,
      tradRoundCount: newTradRoundCount,
      tradRestRemaining: newTradRestRemaining,
      isRunning: newTick < DAY_END,
    });
  },

  reset() {
    const { agents, serviceMode } = get();
    const frames = computeFrames(agents, 0);
    set({
      tick: 0, frames, zoneOcc: computeZoneOcc(frames),
      ...EMPTY, cleaningQueue: initialQueue(serviceMode),
      isRunning: false,
    });
  },
}));
