import { useEffect, useRef } from 'react';
import { useSimStore } from './store/simulationStore.js';
import FloorPlan from './components/FloorPlan.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import ClockBar from './components/ClockBar.jsx';

export default function App() {
  const init         = useSimStore(s => s.init);
  const isRunning    = useSimStore(s => s.isRunning);
  const speed        = useSimStore(s => s.speed);
  const advanceTicks = useSimStore(s => s.advanceTicks);

  // Inicializar agentes al montar
  useEffect(() => { init(); }, []);

  // RAF loop — avanza el tiempo de simulación
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(null);
  const accRef      = useRef(0);

  useEffect(() => {
    if (!isRunning) {
      cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
      return;
    }

    function loop(now) {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      accRef.current += (speed * delta) / 1000; // speed en ticks/seg, delta en ms
      const whole = Math.floor(accRef.current);
      if (whole > 0) {
        accRef.current -= whole;
        advanceTicks(whole);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isRunning, speed, advanceTicks]);

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">CleanLess — Simulador</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Optimización de limpieza por uso real de zonas.
              <span className="ml-2 text-gray-600">PoC · PFM IAE 2026</span>
            </p>
          </div>
          <div className="text-right text-xs text-gray-600 leading-relaxed">
            <div>Capa 1 — Verdad de simulación</div>
            <div>50 empleados · 667 m²</div>
          </div>
        </div>

        {/* Reloj y controles */}
        <ClockBar />

        {/* Plano + Panel */}
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <FloorPlan />
          </div>
          <div className="w-80 shrink-0">
            <ControlPanel />
          </div>
        </div>

      </div>
    </div>
  );
}
