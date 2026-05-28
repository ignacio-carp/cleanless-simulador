import { useSimStore, SPEED_OPTIONS, DAY_END } from '../store/simulationStore.js';

export function tickToTime(tick) {
  const totalMin = tick + 8 * 60;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const TIME_MARKS  = [0, 120, 240, 360, 480, 600, 660];
const TIME_LABELS = ['08', '10', '12', '14', '16', '18', '19'];

export default function ClockBar() {
  const tick           = useSimStore(s => s.tick);
  const speed          = useSimStore(s => s.speed);
  const isRunning      = useSimStore(s => s.isRunning);
  const cleanCount     = useSimStore(s => s.cleanCount);
  const serviceMode    = useSimStore(s => s.serviceMode);
  const setSpeed       = useSimStore(s => s.setSpeed);
  const togglePause    = useSimStore(s => s.togglePause);
  const reset          = useSimStore(s => s.reset);
  const setServiceMode = useSimStore(s => s.setServiceMode);

  const progress    = (tick / DAY_END) * 100;
  const totalCleans = Object.values(cleanCount).reduce((a, b) => a + b, 0);
  const isTraditional = serviceMode === 'traditional';

  // Color de la barra de progreso según modo
  const barColor = isTraditional ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex flex-col gap-2">

      {/* Toggle de modo */}
      <div className="flex gap-1.5 p-1 bg-gray-900 rounded-xl border border-gray-800 w-fit">
        <button
          onClick={() => setServiceMode('cleanless')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !isTraditional
              ? 'bg-emerald-600 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Servicio CleanLess
        </button>
        <button
          onClick={() => setServiceMode('traditional')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isTraditional
              ? 'bg-amber-600 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Servicio Tradicional
        </button>
      </div>

      {/* Barra de control */}
      <div className="bg-gray-900 rounded-xl px-5 py-3 border border-gray-800 flex items-center gap-5">

        {/* Hora */}
        <span className="font-mono text-3xl font-bold text-white w-24 shrink-0 tabular-nums">
          {tickToTime(tick)}
        </span>

        {/* Barra de progreso */}
        <div className="flex-1">
          <div className="relative h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`absolute left-0 top-0 h-full ${barColor} rounded-full`}
              style={{ width: `${progress}%`, transition: 'width 0.08s linear' }} />
            {TIME_MARKS.map(t => (
              <div key={t} className="absolute top-0 w-px h-full bg-gray-600 opacity-30"
                style={{ left: `${(t / DAY_END) * 100}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1 px-0.5">
            {TIME_LABELS.map((l, i) => (
              <span key={i}>{l}h</span>
            ))}
          </div>
        </div>

        {/* Limpiezas del día */}
        <div className="text-center shrink-0 w-16">
          <div className={`font-bold text-xl font-mono tabular-nums ${isTraditional ? 'text-amber-400' : 'text-emerald-400'}`}>
            {totalCleans}
          </div>
          <div className="text-gray-600 text-xs">limpiezas</div>
        </div>

        {/* Play/Pause + Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={togglePause}
            className={`w-10 h-10 rounded-xl text-white text-base font-bold flex items-center justify-center transition-colors ${
              isTraditional
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}>
            {isRunning ? '⏸' : '▶'}
          </button>
          <button onClick={reset}
            className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-lg flex items-center justify-center transition-colors">
            ↺
          </button>

          {/* Velocidades */}
          <div className="flex gap-1 ml-1">
            {SPEED_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setSpeed(opt.value)}
                title={opt.title}
                className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors min-w-[36px] ${
                  speed === opt.value && isRunning
                    ? isTraditional ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
