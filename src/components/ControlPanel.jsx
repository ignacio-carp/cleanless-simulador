import { useState } from 'react';
import { useSimStore } from '../store/simulationStore.js';
import { ZONE_LIST, DIRT_THRESHOLD } from '../engine/zones.js';
import { tickToTime } from './ClockBar.jsx';

// ── Labels de zonas ──────────────────────────────────────────
const ZONE_LABEL = {
  RECEPTION: 'Recepción',
  MEETING_1: 'Sala 1',
  MEETING_2: 'Sala 2',
  MEETING_3: 'Sala 3',
  BATHROOM:  'Baños',
  CORRIDOR:  'Pasillo',
  OPEN_A:    'Open Space A',
  OPEN_B:    'Open Space B',
  OPEN_C:    'Open Space C',
  KITCHEN:   'Break Room',
};

// ── Parámetros disponibles ───────────────────────────────────
const PARAMS = [
  { key: 'cleanersOnSite',    label: 'Empleados de limpieza en el sitio', min: 1,  max: 5,   step: 1,  unit: 'personas', modes: 'both' },
  { key: 'cleaningDuration',  label: 'Duración de limpieza',              min: 5,  max: 30,  step: 5,  unit: 'min',      modes: 'both' },
  { key: 'restDuration',      label: 'Descanso entre rondas',             min: 0,  max: 120, step: 10, unit: 'min',      modes: 'traditional' },
  { key: 'employeeCount',     label: 'Empleados presentes',               min: 10, max: 50,  step: 1,  unit: 'personas', modes: 'both' },
  { key: 'bathroomTrips',     label: 'Idas al baño / día',                min: 2,  max: 10,  step: 1,  unit: 'c/persona',modes: 'both' },
  { key: 'meetingsPerRoom',   label: 'Reuniones por sala',                min: 0,  max: 5,   step: 1,  unit: 'por día',  modes: 'both' },
  { key: 'lunchAtOffice',     label: 'Almuerza en Break Room',            min: 0,  max: 100, step: 10, unit: '%',        modes: 'both' },
  { key: 'meetingAttendance', label: 'Asistentes / reunión',              min: 2,  max: 8,   step: 1,  unit: 'promedio', modes: 'both' },
];

const PEOPLE_LEGEND = [
  { color: '#4ade80', label: 'En escritorio' },
  { color: '#a78bfa', label: 'En reunión' },
  { color: '#fbbf24', label: 'En Break Room' },
  { color: '#38bdf8', label: 'En baños' },
  { color: '#94a3b8', label: 'En tránsito' },
];

const DIRT_LEGEND = [
  { color: 'rgba(234,179,8,0.5)',  label: 'Uso moderado' },
  { color: 'rgba(249,115,22,0.6)', label: 'Uso alto' },
  { color: 'rgba(239,68,68,0.7)',  label: 'Requiere limpieza' },
  { color: 'rgba(52,211,153,0.5)', label: 'Recién limpiada' },
];

// ── Barra de suciedad ────────────────────────────────────────
function DirtBar({ pct }) {
  const color = pct < 0.4
    ? 'from-emerald-600 to-emerald-500'
    : pct < 0.75
    ? 'from-amber-600 to-amber-400'
    : 'from-red-700 to-red-500';
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
        style={{ width: `${Math.min(pct * 100, 100)}%` }} />
    </div>
  );
}

// ── TAB: Dashboard ───────────────────────────────────────────
function Dashboard() {
  const params            = useSimStore(s => s.params);
  const serviceMode       = useSimStore(s => s.serviceMode);
  const frames            = useSimStore(s => s.frames);
  const zoneDirt          = useSimStore(s => s.zoneDirt);
  const cleanHistory      = useSimStore(s => s.cleanHistory);
  const cleanCount        = useSimStore(s => s.cleanCount);
  const cleanFlash        = useSimStore(s => s.cleanFlash);
  const cleaningQueue     = useSimStore(s => s.cleaningQueue);
  const activeCleanings   = useSimStore(s => s.activeCleanings);
  const dirtyMinutes      = useSimStore(s => s.dirtyMinutes);
  const tradRoundCount    = useSimStore(s => s.tradRoundCount);
  const tradRestRemaining = useSimStore(s => s.tradRestRemaining);

  const isTraditional = serviceMode === 'traditional';

  const present = frames.filter(f => f.status !== 'AWAY').length;
  const atDesk  = frames.filter(f => f.status === 'WORKING').length;
  const meeting = frames.filter(f => f.status === 'MEETING').length;
  const onBreak = frames.filter(f => f.status === 'LUNCH').length;
  const inBath  = frames.filter(f => f.status === 'BATHROOM').length;

  const monitoredZones = ZONE_LIST
    .filter(z => DIRT_THRESHOLD[z.type] !== 9999)
    .map(z => {
      const threshold = DIRT_THRESHOLD[z.type];
      const pct      = (zoneDirt[z.id] || 0) / threshold;
      const flash    = cleanFlash[z.id] || 0;
      const inActive = activeCleanings[z.id] !== undefined;
      const inQueue  = cleaningQueue.includes(z.id);
      return { zone: z, pct, flash, inActive, inQueue };
    })
    .sort((a, b) => {
      if (a.inActive && !b.inActive) return -1;
      if (!a.inActive && b.inActive) return 1;
      if (a.inQueue && !b.inQueue)   return -1;
      if (!a.inQueue && b.inQueue)   return 1;
      return b.pct - a.pct;
    });

  const alerts = monitoredZones.filter(
    z => z.pct >= 0.7 && !z.inActive && !z.inQueue && z.flash === 0
  );
  const totalCleans = Object.values(cleanCount).reduce((a, b) => a + b, 0);

  const accentDot   = isTraditional ? 'bg-amber-400'  : 'bg-emerald-400';
  const accentText  = isTraditional ? 'text-amber-400' : 'text-emerald-400';
  const accentBg    = isTraditional ? 'bg-amber-950/30 border-amber-900/50' : 'bg-emerald-950/30 border-emerald-900/50';
  const accentInner = isTraditional ? 'bg-amber-950 ' : 'bg-emerald-950';
  const accentBar   = isTraditional ? 'bg-amber-500'  : 'bg-emerald-500';
  const accentText2 = isTraditional ? 'text-amber-200' : 'text-emerald-200';

  return (
    <div className="flex flex-col gap-3">

      {/* KPIs rápidos + métrica de desatención */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">
          En este momento
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'Presentes',     value: present,          color: 'text-white',       bg: 'bg-gray-800' },
            { label: 'En escritorio', value: atDesk,           color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
            { label: 'En reunión',    value: meeting,          color: 'text-purple-400',  bg: 'bg-purple-950/40' },
            { label: 'Break / Baños', value: onBreak + inBath, color: 'text-yellow-400',  bg: 'bg-yellow-950/30' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-lg p-3`}>
              <div className={`text-2xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
              <div className="text-gray-600 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Métrica de desatención — ambos modos */}
        <div className="bg-amber-950/30 rounded-lg p-3 border border-amber-900/40 flex items-center justify-between">
          <div className="text-amber-300 text-xs font-medium">Min. con suciedad &gt;70% sin atención</div>
          <div className="text-amber-400 font-mono font-bold text-lg tabular-nums">{dirtyMinutes}</div>
        </div>
      </div>

      {/* Estado del servicio Tradicional */}
      {isTraditional && (
        <div className="bg-amber-950/20 rounded-xl p-4 border border-amber-900/40">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <p className="text-amber-400 text-[10px] uppercase tracking-widest font-bold">
              Servicio Tradicional
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-amber-200 text-xs font-medium">
                {tradRestRemaining > 0
                  ? `Descansando — ${Math.ceil(tradRestRemaining)} min`
                  : cleaningQueue.length > 0 || Object.keys(activeCleanings).length > 0
                  ? `Ronda ${tradRoundCount + 1} en curso`
                  : 'Iniciando ronda...'}
              </div>
              <div className="text-gray-600 text-[10px] mt-0.5">
                {tradRoundCount} {tradRoundCount === 1 ? 'ronda completada' : 'rondas completadas'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-amber-400 font-mono font-bold text-xl tabular-nums">{tradRoundCount}</div>
              <div className="text-gray-600 text-[10px]">rondas</div>
            </div>
          </div>
          {tradRestRemaining > 0 && (
            <div className="mt-2.5 h-1 bg-amber-950 rounded-full overflow-hidden">
              <div className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${((params.restDuration - tradRestRemaining) / params.restDuration) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Limpiando ahora */}
      {Object.keys(activeCleanings).length > 0 && (
        <div className={`rounded-xl p-4 border ${accentBg}`}>
          <div className="flex items-center gap-2 mb-2.5">
            <div className={`w-2 h-2 rounded-full animate-pulse ${accentDot}`} />
            <p className={`text-[10px] uppercase tracking-widest font-bold ${accentText}`}>
              Limpiando ahora — {Object.keys(activeCleanings).length}
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {Object.entries(activeCleanings).map(([zId, remaining]) => {
              const progress = Math.max(0, (params.cleaningDuration - remaining) / params.cleaningDuration);
              return (
                <div key={zId}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-medium ${accentText2}`}>{ZONE_LABEL[zId]}</span>
                    <span className={`text-xs font-mono ${accentText}`}>{Math.ceil(remaining)} min</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${accentInner}`}>
                    <div className={`h-full rounded-full transition-all duration-300 ${accentBar}`}
                      style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* En cola / Programadas */}
      {cleaningQueue.length > 0 && (
        <div className="bg-orange-950/25 rounded-xl p-4 border border-orange-900/40">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-orange-400 text-[10px] uppercase tracking-widest font-bold">
              {isTraditional ? `Programadas esta ronda — ${cleaningQueue.length}` : `⏳ En cola — ${cleaningQueue.length}`}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {cleaningQueue.map((zId, i) => (
              <div key={zId} className="flex items-center gap-2">
                <span className="text-gray-600 text-[10px] font-mono w-4">#{i + 1}</span>
                <span className="text-orange-300 text-xs">{ZONE_LABEL[zId]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas activas */}
      {alerts.length > 0 && (
        <div className="bg-red-950/30 rounded-xl p-4 border border-red-900/60">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-amber-400 text-[10px] uppercase tracking-widest font-bold">
              {isTraditional ? `Sucias sin atención — ${alerts.length}` : `Zonas sobre 70% — ${alerts.length}`}
            </p>
          </div>
          {isTraditional && (
            <p className="text-gray-600 text-[10px] mb-2 leading-relaxed">
              Zonas que acumularon suciedad durante el descanso. Se limpiarán en la próxima ronda.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {alerts.map(({ zone, pct }) => {
              const urgent = pct >= 0.95;
              const high   = pct >= 0.8;
              return (
                <div key={zone.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                    urgent ? 'bg-red-950/50 border-red-800/60' :
                    high   ? 'bg-orange-950/40 border-orange-800/50' :
                             'bg-amber-950/30 border-amber-800/40'
                  }`}>
                  <div>
                    <div className={`text-xs font-semibold ${urgent ? 'text-red-200' : high ? 'text-orange-200' : 'text-amber-200'}`}>
                      {ZONE_LABEL[zone.id]}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{Math.round(pct * 100)}% de uso</div>
                  </div>
                  <span className={`text-xs font-bold ${urgent ? 'text-red-400' : high ? 'text-orange-400' : 'text-amber-400'}`}>
                    {urgent ? 'URGENTE' : high ? 'ALTA' : 'MEDIA'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado de todas las zonas */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">
          Estado de zonas
        </p>
        <div className="flex flex-col gap-2.5">
          {monitoredZones.map(({ zone, pct, flash }) => (
            <div key={zone.id}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-medium ${flash > 0 ? 'text-emerald-300' : pct >= 0.7 ? 'text-amber-300' : 'text-gray-400'}`}>
                  {ZONE_LABEL[zone.id]}
                </span>
                <span className={`text-xs font-mono tabular-nums ${
                  flash > 0  ? 'text-emerald-400' :
                  pct >= 0.9 ? 'text-red-400 font-bold' :
                  pct > 0.75 ? 'text-amber-400' : 'text-gray-600'
                }`}>
                  {flash > 0 ? '✓ limpia' : `${Math.round(pct * 100)}%`}
                </span>
              </div>
              {flash > 0
                ? <div className="h-1.5 bg-emerald-500/30 rounded-full">
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${(flash / 40) * 100}%` }} />
                  </div>
                : <DirtBar pct={pct} />
              }
            </div>
          ))}
        </div>
      </div>

      {/* Historial de limpiezas */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold">
            Limpiezas ejecutadas hoy
          </p>
          <span className={`font-mono font-bold text-sm tabular-nums ${accentText}`}>{totalCleans}</span>
        </div>
        {cleanHistory.length === 0
          ? <p className="text-gray-700 text-xs text-center py-2">Sin limpiezas aún</p>
          : (
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {cleanHistory.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${accentBar}`} />
                  <span className="text-gray-600 font-mono w-10 tabular-nums shrink-0">
                    {tickToTime(item.tick)}
                  </span>
                  <span className="text-gray-400 flex-1 truncate">
                    {ZONE_LABEL[item.zoneId] || item.zoneId}
                  </span>
                  <span className={`font-bold ${accentText}`}>✓</span>
                </div>
              ))}
            </div>
          )
        }
      </div>

    </div>
  );
}

// ── TAB: Configuración ───────────────────────────────────────
function Configuracion() {
  const params      = useSimStore(s => s.params);
  const setParam    = useSimStore(s => s.setParam);
  const serviceMode = useSimStore(s => s.serviceMode);
  const isTraditional = serviceMode === 'traditional';

  const visibleParams = PARAMS.filter(p =>
    p.modes === 'both' || p.modes === serviceMode
  );

  return (
    <div className="flex flex-col gap-3">

      {/* Sliders */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-4 font-semibold">
          Parámetros de simulación
        </p>
        <div className="flex flex-col gap-4">
          {visibleParams.map(({ key, label, min, max, step, unit }) => (
            <div key={key}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-gray-300 text-xs">{label}</span>
                <span className="text-white font-mono text-sm font-semibold tabular-nums">
                  {params[key]}{unit === '%' ? '%' : ''}
                  {unit !== '%' && <span className="text-gray-600 text-xs ml-1">{unit}</span>}
                </span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={params[key]}
                onChange={e => setParam(key, Number(e.target.value))}
                className={`w-full h-1.5 cursor-pointer ${isTraditional ? 'accent-amber-500' : 'accent-emerald-500'}`}
              />
              <div className="flex justify-between text-gray-700 text-[10px] mt-0.5">
                <span>{min}{unit === '%' ? '%' : ''}</span>
                <span>{max}{unit === '%' ? '%' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda personas */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">
          Personas
        </p>
        <div className="flex flex-col gap-2">
          {PEOPLE_LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda suciedad */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">
          Nivel de suciedad
        </p>
        <div className="flex flex-col gap-2">
          {DIRT_LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-8 h-2 rounded shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-gray-600 text-[10px] leading-relaxed">
            {isTraditional
              ? 'En modo Tradicional las zonas se limpian en orden fijo, sin importar el nivel de suciedad. La métrica de desatención muestra la ineficiencia del modelo.'
              : 'En modo CleanLess las zonas se limpian cuando superan el umbral de uso. Solo se interviene donde hay uso real.'}
          </p>
        </div>
      </div>

    </div>
  );
}

// ── Panel principal con tabs ─────────────────────────────────
export default function ControlPanel() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'config',    label: 'Configuración' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              tab === id
                ? 'bg-gray-700 text-white'
                : 'bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-800'
            }`}>
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 235px)' }}>
        {tab === 'dashboard' ? <Dashboard /> : <Configuracion />}
      </div>
    </div>
  );
}
