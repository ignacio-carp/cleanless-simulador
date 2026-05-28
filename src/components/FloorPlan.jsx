import { memo } from 'react';
import { ZONE_LIST, FLOOR_COLOR, ZONE_STROKE, DIRT_THRESHOLD, getAllDesks, SVG_W, SVG_H } from '../engine/zones.js';
import { useSimStore } from '../store/simulationStore.js';

// ═══════════════════════════════════════════════════════════════
// PRIMITIVOS DE MOBILIARIO
// ═══════════════════════════════════════════════════════════════

const Desk = memo(({ x, y }) => (
  <g>
    <rect x={x - 14} y={y - 8} width={28} height={18} rx={2}
      fill="#1c1007" stroke="#3d2a10" strokeWidth={0.8} />
    <rect x={x - 8}  y={y - 17} width={16} height={10} rx={1}
      fill="#0a0f1a" stroke="#1d4ed8" strokeWidth={0.7} />
    <rect x={x - 1}  y={y - 7}  width={2}  height={2}
      fill="#1d4ed8" />
    <rect x={x - 7}  y={y - 3}  width={14} height={5} rx={0.5}
      fill="#141c2a" stroke="#1e293b" strokeWidth={0.5} />
    <rect x={x - 6}  y={y + 10} width={12} height={10} rx={2}
      fill="#111827" stroke="#1e293b" strokeWidth={0.5} />
  </g>
));

const MeetingTable = memo(({ cx, cy, rx = 58, ry = 30, seats = 6 }) => {
  const chairAngles = Array.from({ length: seats }, (_, i) => (i / seats) * 2 * Math.PI - Math.PI / 2);
  return (
    <g>
      {chairAngles.map((angle, i) => {
        const px = cx + (rx + 18) * Math.cos(angle);
        const py = cy + (ry + 12) * Math.sin(angle);
        const rot = (angle * 180 / Math.PI) + 90;
        return (
          <g key={i} transform={`rotate(${rot} ${px} ${py})`}>
            <rect x={px - 9} y={py - 9} width={18} height={18} rx={3}
              fill="#1c2333" stroke="#334155" strokeWidth={0.8} />
            <rect x={px - 9} y={py - 9} width={18} height={5} rx={2}
              fill="#2d3f55" />
          </g>
        );
      })}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill="#1c1007" stroke="#3d2a10" strokeWidth={1.2} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.55} ry={ry * 0.55}
        fill="none" stroke="#3d2a10" strokeWidth={0.5} opacity={0.4} />
    </g>
  );
});

const Plant = memo(({ x, y, r = 10 }) => (
  <g>
    <rect x={x - 5} y={y + r - 2} width={10} height={8} rx={2} fill="#1c0a00" />
    <circle cx={x}     cy={y}     r={r}       fill="#14532d" />
    <circle cx={x - 4} cy={y - 3} r={r * 0.6} fill="#16a34a" />
    <circle cx={x + 3} cy={y - 4} r={r * 0.55} fill="#15803d" />
    <circle cx={x}     cy={y - 2} r={r * 0.4}  fill="#22c55e" opacity={0.7} />
  </g>
));

const Toilet = memo(({ x, y, dir = 'up' }) => {
  const rot = dir === 'up' ? 0 : dir === 'down' ? 180 : dir === 'left' ? -90 : 90;
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <rect x={x - 8} y={y - 14} width={16} height={7} rx={2}
        fill="#071520" stroke="#0ea5e9" strokeWidth={0.8} />
      <ellipse cx={x} cy={y} rx={8} ry={10}
        fill="#071520" stroke="#0ea5e9" strokeWidth={0.8} />
      <ellipse cx={x} cy={y + 1} rx={5} ry={7}
        fill="#040f18" />
    </g>
  );
});

const Sink = memo(({ x, y }) => (
  <g>
    <rect x={x - 8} y={y - 7} width={16} height={12} rx={4}
      fill="#071520" stroke="#0ea5e9" strokeWidth={0.8} />
    <circle cx={x} cy={y + 1} r={3} fill="#040f18" />
    <circle cx={x} cy={y - 5} r={1.5} fill="#0ea5e9" opacity={0.5} />
  </g>
));

const Sofa = memo(({ x, y, w = 50 }) => (
  <g>
    <rect x={x - w / 2} y={y - 10} width={w} height={20} rx={5}
      fill="#1e293b" stroke="#334155" strokeWidth={0.8} />
    <rect x={x - w / 2} y={y - 10} width={w} height={6} rx={3}
      fill="#334155" />
    <rect x={x - w / 2 - 5} y={y - 10} width={7} height={20} rx={3}
      fill="#334155" />
    <rect x={x + w / 2 - 2} y={y - 10} width={7} height={20} rx={3}
      fill="#334155" />
  </g>
));

const CoffeeMachine = memo(({ x, y }) => (
  <g>
    <rect x={x - 10} y={y - 18} width={20} height={28} rx={3}
      fill="#1c1007" stroke="#78350f" strokeWidth={0.8} />
    <rect x={x - 7}  y={y - 15} width={14} height={8} rx={1}
      fill="#0a0f1a" />
    <circle cx={x} cy={y + 4} r={4} fill="#78350f" stroke="#92400e" strokeWidth={0.5} />
    <rect x={x - 8} y={y + 8} width={16} height={2} rx={1} fill="#92400e" />
  </g>
));

const Fridge = memo(({ x, y }) => (
  <g>
    <rect x={x - 10} y={y - 20} width={20} height={40} rx={2}
      fill="#111827" stroke="#1e293b" strokeWidth={0.8} />
    <line x1={x - 10} y1={y + 2} x2={x + 10} y2={y + 2}
      stroke="#1e293b" strokeWidth={1} />
    <rect x={x - 2} y={y - 12} width={4} height={1.5} rx={0.5}
      fill="#374151" />
    <rect x={x - 2} y={y + 8} width={4} height={1.5} rx={0.5}
      fill="#374151" />
  </g>
));

const Window = memo(({ x, y, length = 50, horizontal = true }) => {
  const x2 = horizontal ? x + length : x;
  const y2 = horizontal ? y : y + length;
  const offset = 3;
  return (
    <g>
      <line x1={x} y1={y} x2={x2} y2={y2}
        stroke="#38bdf8" strokeWidth={2} opacity={0.35} />
      <line
        x1={horizontal ? x + 5 : x + offset}
        y1={horizontal ? y + offset : y + 5}
        x2={horizontal ? x2 - 5 : x2 + offset}
        y2={horizontal ? y2 + offset : y2 - 5}
        stroke="#38bdf8" strokeWidth={1} opacity={0.2}
      />
    </g>
  );
});

// ═══════════════════════════════════════════════════════════════
// PLANO ESTÁTICO DE LA OFICINA (fondo + mobiliario)
// ═══════════════════════════════════════════════════════════════

const desks = getAllDesks();

function OfficePlan() {
  return (
    <g>
      {/* ── Fondo exterior (paredes) ── */}
      <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#070c14" />

      {/* ── Pisos de cada zona ── */}
      {ZONE_LIST.map(z => (
        <rect key={z.id}
          x={z.x + 1} y={z.y + 1} width={z.w - 2} height={z.h - 2}
          fill={FLOOR_COLOR[z.type]}
          stroke={ZONE_STROKE[z.type]}
          strokeWidth={1.5}
        />
      ))}

      {/* ── Ventanas (paredes norte) ── */}
      <Window x={20}  y={1} length={110} />
      <Window x={170} y={1} length={160} />
      <Window x={370} y={1} length={160} />
      <Window x={570} y={1} length={160} />

      {/* ── División baños H/M ── */}
      <line x1={875} y1={1} x2={875} y2={208}
        stroke={ZONE_STROKE.bathroom} strokeWidth={1.5} />
      <text x={812} y={18} textAnchor="middle"
        fill="#38bdf8" fontSize={9} fontFamily="system-ui" opacity={0.7}>♂ Hombres</text>
      <text x={937} y={18} textAnchor="middle"
        fill="#f472b6" fontSize={9} fontFamily="system-ui" opacity={0.7}>♀ Mujeres</text>

      {/* ── Puertas (gaps en la pared del pasillo) ── */}
      {/* Recepción → pasillo */}
      <rect x={55} y={208} width={40} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Sala 1 */}
      <rect x={215} y={208} width={40} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Sala 2 */}
      <rect x={415} y={208} width={40} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Sala 3 */}
      <rect x={615} y={208} width={40} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Baños */}
      <rect x={820} y={208} width={30} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Open A → pasillo */}
      <rect x={80}  y={252} width={40} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Open B */}
      <rect x={390} y={252} width={40} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Open C */}
      <rect x={680} y={252} width={40} height={4} fill={FLOOR_COLOR.corridor} />
      {/* Break Room */}
      <rect x={875} y={252} width={40} height={4} fill={FLOOR_COLOR.corridor} />

      {/* ── RECEPCIÓN ── */}
      {/* Alfombra */}
      <rect x={18} y={55} width={114} height={80} rx={6}
        fill="none" stroke="#4c1d95" strokeWidth={1.2} strokeDasharray="5,3" opacity={0.3} />
      {/* Sillones de espera */}
      <rect x={25} y={65} width={22} height={22} rx={4} fill="#1e1030" stroke="#4c1d95" strokeWidth={0.8} />
      <rect x={25} y={65} width={22} height={6}  rx={2} fill="#2d1a50" />
      <rect x={55} y={65} width={22} height={22} rx={4} fill="#1e1030" stroke="#4c1d95" strokeWidth={0.8} />
      <rect x={55} y={65} width={22} height={6}  rx={2} fill="#2d1a50" />
      {/* Mesa ratona */}
      <ellipse cx={75} cy={105} rx={14} ry={9} fill="#1a0f2e" stroke="#4c1d95" strokeWidth={0.7} />
      {/* Mostrador */}
      <rect x={15} y={148} width={120} height={32} rx={3}
        fill="#1a0f2e" stroke="#4c1d95" strokeWidth={1} />
      <text x={75} y={168} textAnchor="middle"
        fill="#7c3aed" fontSize={9} fontFamily="system-ui">Recepción</text>
      {/* Cuadro decorativo en pared este */}
      <rect x={137} y={30} width={10} height={14} rx={1} fill="#1a0f2e" stroke="#4c1d95" strokeWidth={0.8} />

      {/* ── SALA 1: mesa + pizarra + planta ── */}
      {/* Pizarra/whiteboard */}
      <rect x={165} y={6} width={130} height={32} rx={2}
        fill="#0d1829" stroke="#1e40af" strokeWidth={0.9} opacity={0.85} />
      <line x1={175} y1={18} x2={285} y2={18} stroke="#1d4ed8" strokeWidth={0.7} opacity={0.5} />
      <line x1={175} y1={25} x2={265} y2={25} stroke="#1d4ed8" strokeWidth={0.5} opacity={0.3} />
      <text x={175} y={14} fill="#3b82f6" fontSize={7} fontFamily="system-ui" opacity={0.5}>Pizarra</text>
      <MeetingTable cx={250} cy={115} rx={55} ry={28} seats={6} />
      {/* Proyector (punto en techo) */}
      <circle cx={250} cy={10} r={4} fill="#1e3a8a" stroke="#2563eb" strokeWidth={0.7} opacity={0.6} />

      {/* ── SALA 2: mesa + pizarra ── */}
      <rect x={365} y={6} width={130} height={32} rx={2}
        fill="#0d1829" stroke="#1e40af" strokeWidth={0.9} opacity={0.85} />
      <line x1={375} y1={18} x2={485} y2={18} stroke="#1d4ed8" strokeWidth={0.7} opacity={0.5} />
      <line x1={375} y1={25} x2={455} y2={25} stroke="#1d4ed8" strokeWidth={0.5} opacity={0.3} />
      <text x={375} y={14} fill="#3b82f6" fontSize={7} fontFamily="system-ui" opacity={0.5}>Pizarra</text>
      <MeetingTable cx={450} cy={115} rx={55} ry={28} seats={8} />
      <circle cx={450} cy={10} r={4} fill="#1e3a8a" stroke="#2563eb" strokeWidth={0.7} opacity={0.6} />

      {/* ── SALA 3: mesa + pizarra ── */}
      <rect x={565} y={6} width={130} height={32} rx={2}
        fill="#0d1829" stroke="#1e40af" strokeWidth={0.9} opacity={0.85} />
      <line x1={575} y1={18} x2={685} y2={18} stroke="#1d4ed8" strokeWidth={0.7} opacity={0.5} />
      <line x1={575} y1={25} x2={665} y2={25} stroke="#1d4ed8" strokeWidth={0.5} opacity={0.3} />
      <text x={575} y={14} fill="#3b82f6" fontSize={7} fontFamily="system-ui" opacity={0.5}>Pizarra</text>
      <MeetingTable cx={650} cy={115} rx={55} ry={28} seats={6} />
      <circle cx={650} cy={10} r={4} fill="#1e3a8a" stroke="#2563eb" strokeWidth={0.7} opacity={0.6} />

      {/* ── BAÑOS ── */}
      {/* Hombres */}
      <Toilet x={786} y={75} />
      <Toilet x={826} y={75} />
      <Toilet x={856} y={75} />
      <Sink   x={786} y={170} />
      <Sink   x={820} y={170} />
      <Sink   x={854} y={170} />
      {/* Mujeres */}
      <Toilet x={896} y={75} />
      <Toilet x={932} y={75} />
      <Toilet x={968} y={75} />
      <Sink   x={896} y={170} />
      <Sink   x={932} y={170} />
      <Sink   x={968} y={170} />

      {/* ── ESCRITORIOS (open spaces) ── */}
      {desks.map((d, i) => <Desk key={i} x={d.x} y={d.y} />)}

      {/* ── PLANTAS + DECORACIÓN en open spaces ── */}
      {/* Esquinas Open A */}
      {/* Papeleras en pasillos internos Open A */}
      <rect x={135} y={264} width={8} height={10} rx={1.5} fill="#111827" stroke="#1f2937" strokeWidth={0.7} />
      <rect x={134} y={262} width={10} height={3}  rx={0.5} fill="#1f2937" />
      {/* Cuadro en pared izq del Open A */}
      <rect x={2}  y={350} width={8} height={12} rx={1} fill="#0d1a0e" stroke="#14532d" strokeWidth={0.7} />
      <rect x={2}  y={430} width={8} height={12} rx={1} fill="#0d1a0e" stroke="#14532d" strokeWidth={0.7} />

      {/* Esquinas Open B */}
      {/* Papelera Open B */}
      <rect x={455} y={264} width={8} height={10} rx={1.5} fill="#111827" stroke="#1f2937" strokeWidth={0.7} />
      <rect x={454} y={262} width={10} height={3}  rx={0.5} fill="#1f2937" />

      {/* Esquinas Open C */}
      {/* Papelera Open C */}
      <rect x={700} y={264} width={8} height={10} rx={1.5} fill="#111827" stroke="#1f2937" strokeWidth={0.7} />
      <rect x={699} y={262} width={10} height={3}  rx={0.5} fill="#1f2937" />


      {/* ── BREAK ROOM ── */}
      {/* Mesada / counter superior */}
      <rect x={843} y={258} width={155} height={40} rx={2}
        fill="#1c1007" stroke="#3d2a10" strokeWidth={0.8} />
      <CoffeeMachine x={865}  y={279} />
      {/* Microondas */}
      <rect x={892} y={263} width={28} height={20} rx={2}
        fill="#111827" stroke="#1e293b" strokeWidth={0.7} />
      <rect x={895} y={266} width={18} height={12} rx={1}
        fill="#0a0f1a" />
      <circle cx={916} cy={272} r={3} fill="#1e293b" stroke="#374151" strokeWidth={0.5} />
      <Fridge x={970} y={279} />
      {/* Divisor de mesada */}
      <line x1={843} y1={298} x2={998} y2={298}
        stroke="#3d2a10" strokeWidth={0.8} opacity={0.5} />
      {/* Mesa de reunión del break */}
      <ellipse cx={920} cy={385} rx={30} ry={16}
        fill="#1c1007" stroke="#3d2a10" strokeWidth={1} />
      {/* Sillas alrededor */}
      {[870, 895, 920, 945, 970].map((px, i) => (
        <circle key={px} cx={px} cy={408} r={9}
          fill="#1e293b" stroke="#334155" strokeWidth={0.7} />
      ))}
      <Sofa x={920} y={490} w={130} />
      {/* Mesa ratona frente al sillón */}
      <ellipse cx={920} cy={524} rx={22} ry={10}
        fill="#1c1007" stroke="#3d2a10" strokeWidth={0.7} />
      {/* Cuadro decorativo en pared del break */}
      <rect x={992} y={330} width={6} height={10} rx={1} fill="#1a1205" stroke="#78350f" strokeWidth={0.7} />
      <rect x={992} y={400} width={6} height={10} rx={1} fill="#1a1205" stroke="#78350f" strokeWidth={0.7} />

      {/* ── LABELS de zonas ── */}
      {[
        { x: 75,  y: 15,  label: 'Recepción',    color: '#a78bfa' },
        { x: 250, y: 15,  label: 'Sala de Reunión 1', color: '#93c5fd' },
        { x: 450, y: 15,  label: 'Sala de Reunión 2', color: '#93c5fd' },
        { x: 650, y: 15,  label: 'Sala de Reunión 3', color: '#93c5fd' },
        { x: 875, y: 218, label: 'Pasillo',       color: '#6b7280' },
        { x: 155, y: 270, label: 'Open Space A',  color: '#4ade80' },
        { x: 465, y: 270, label: 'Open Space B',  color: '#4ade80' },
        { x: 730, y: 270, label: 'Open Space C',  color: '#4ade80' },
        { x: 920, y: 270, label: 'Break Room',    color: '#fbbf24' },
      ].map(({ x, y, label, color }) => (
        <text key={label} x={x} y={y} textAnchor="middle"
          fill={color} fontSize={9.5} fontWeight="600"
          fontFamily="system-ui, sans-serif" opacity={0.75}>
          {label}
        </text>
      ))}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// SILUETA DE PERSONA
// ═══════════════════════════════════════════════════════════════

const STATUS_COLOR = {
  WORKING:  '#4ade80',
  MEETING:  '#a78bfa',
  LUNCH:    '#fbbf24',
  BATHROOM: '#38bdf8',
  TRANSIT:  '#94a3b8',
};

const Person = memo(({ x, y, color }) => (
  <g style={{ transform: `translate(${x}px,${y}px)`, transition: 'transform 0.55s ease' }}>
    {/* Cabeza */}
    <circle cy={-12} r={5.5} fill={color} />
    {/* Torso */}
    <path d="M -5,-6 C -6,0 -5,7 -4,9 L 4,9 C 5,7 6,0 5,-6 Z"
      fill={color} opacity={0.9} />
    {/* Piernas */}
    <line x1={-2} y1={9} x2={-3} y2={17}
      stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.75} />
    <line x1={2}  y1={9} x2={3}  y2={17}
      stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.75} />
  </g>
));

// ═══════════════════════════════════════════════════════════════
// OVERLAY DE SUCIEDAD
// ═══════════════════════════════════════════════════════════════

function dirtToColor(pct) {
  if (pct < 0.25) return null;
  if (pct < 0.55) return `rgba(234,179,8,${(pct - 0.25) * 0.55})`;
  if (pct < 0.7)  return `rgba(249,115,22,${0.18 + (pct - 0.55) * 0.7})`;
  return `rgba(239,68,68,${0.32 + Math.min(pct - 0.7, 0.1) * 2})`;
}

const DirtOverlay = memo(({ zone, pct, flash, queued, cleaning, cleaningDuration }) => {
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;

  // ── Siendo limpiada ahora ──
  if (cleaning !== undefined) {
    const progress = Math.max(0, (cleaningDuration - cleaning) / cleaningDuration);
    return (
      <g>
        <rect x={zone.x + 1} y={zone.y + 1} width={zone.w - 2} height={zone.h - 2}
          fill={`rgba(52,211,153,${0.12 + progress * 0.18})`} />
        <rect x={cx - 36} y={cy - 26} width={72} height={52} rx={5}
          fill="#042f2e" stroke="#10b981" strokeWidth={1.2} />
        <text x={cx} y={cy - 11} textAnchor="middle"
          fill="#6ee7b7" fontSize={10} fontWeight="700" fontFamily="system-ui">
          🧹 LIMPIANDO
        </text>
        {/* Barra de progreso */}
        <rect x={cx - 26} y={cy - 2} width={52} height={5} rx={2} fill="#064e3b" />
        <rect x={cx - 26} y={cy - 2} width={52 * progress} height={5} rx={2} fill="#10b981" />
        <text x={cx} y={cy + 17} textAnchor="middle"
          fill="#34d399" fontSize={8} fontFamily="system-ui">
          {Math.ceil(cleaning)} min restantes
        </text>
      </g>
    );
  }

  // ── En cola, esperando limpiador ──
  if (queued) {
    return (
      <g>
        <rect x={zone.x + 1} y={zone.y + 1} width={zone.w - 2} height={zone.h - 2}
          fill="rgba(249,115,22,0.22)" />
        <rect x={cx - 34} y={cy - 15} width={68} height={30} rx={5}
          fill="#431407" stroke="#f97316" strokeWidth={1.2} />
        <text x={cx} y={cy + 5} textAnchor="middle"
          fill="#fb923c" fontSize={10} fontWeight="700" fontFamily="system-ui">
          ⏳ EN COLA
        </text>
      </g>
    );
  }

  // ── Flash de limpieza recién terminada ──
  if (flash > 0) {
    return (
      <rect x={zone.x + 1} y={zone.y + 1} width={zone.w - 2} height={zone.h - 2}
        fill={`rgba(52,211,153,${(flash / 45) * 0.5})`} />
    );
  }

  // ── Suciedad acumulada ──
  const fill = dirtToColor(pct);
  if (!fill) return null;

  return (
    <g>
      <rect x={zone.x + 1} y={zone.y + 1} width={zone.w - 2} height={zone.h - 2}
        fill={fill} style={{ transition: 'fill 1.2s ease' }} />
      {pct >= 0.7 && (
        <g>
          <rect x={cx - 32} y={cy - 14} width={64} height={28} rx={5}
            fill="#7f1d1d" stroke="#dc2626" strokeWidth={1.2} />
          <text x={cx} y={cy + 7} textAnchor="middle"
            fill="#fca5a5" fontSize={11} fontWeight="700" fontFamily="system-ui">
            ⚠ LIMPIAR
          </text>
        </g>
      )}
    </g>
  );
});

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function FloorPlan() {
  const params          = useSimStore(s => s.params);
  const frames          = useSimStore(s => s.frames);
  const zoneDirt        = useSimStore(s => s.zoneDirt);
  const cleanFlash      = useSimStore(s => s.cleanFlash);
  const cleaningQueue   = useSimStore(s => s.cleaningQueue);
  const activeCleanings = useSimStore(s => s.activeCleanings);

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <OfficePlan />

        {/* Overlays de suciedad / limpieza */}
        {ZONE_LIST.map(zone => {
          const threshold = DIRT_THRESHOLD[zone.type] || 9999;
          if (threshold === 9999) return null;
          const pct     = (zoneDirt[zone.id] || 0) / threshold;
          const flash   = cleanFlash[zone.id] || 0;
          const queued  = cleaningQueue.includes(zone.id);
          const cleaning = activeCleanings[zone.id]; // undefined o ticks restantes
          return (
            <DirtOverlay key={zone.id} zone={zone} pct={pct} flash={flash}
              queued={queued} cleaning={cleaning} cleaningDuration={params.cleaningDuration} />
          );
        })}

        {/* Personas */}
        {frames.map((frame, i) => {
          if (frame.status === 'AWAY') return null;
          const color = STATUS_COLOR[frame.status] ?? '#f8fafc';
          return (
            <Person key={i} x={frame.pos.x} y={frame.pos.y} color={color} />
          );
        })}
      </svg>
    </div>
  );
}
