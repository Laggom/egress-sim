import { useEffect, useRef } from "react";
import { SimCanvas } from "./components/SimCanvas";
import { Controls } from "./components/Controls";
import { Chart } from "./components/Chart";
import { useSim } from "./sim/store";

export default function App() {
  const running = useSim((s) => s.running);
  const step = useSim((s) => s.step);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastRef.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastRef.current) / 1000);
      lastRef.current = now;
      // 시뮬 속도: 실시간의 2배 (체감)
      step(dt * 2);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, step]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b border-slate-800 flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-lg sm:text-xl font-semibold text-white">
          🚪 세미나실 퇴장 시뮬레이터
        </h1>
        <div className="text-xs text-slate-400">
          좌석을 클릭하면 그 사람의 퇴장 경로가 보입니다 · 빨간색은 정체 누적
        </div>
      </header>

      <main className="flex-1 grid gap-3 p-3 lg:grid-cols-[1fr_320px] grid-cols-1">
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 min-h-[55vh] lg:min-h-0">
          <SimCanvas />
        </div>
        <aside className="flex flex-col gap-3">
          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-3">
            <Controls />
          </div>
          <Chart />
          <Legend />
        </aside>
      </main>

      <footer className="px-4 py-2 text-[11px] text-slate-500 border-t border-slate-800">
        Stand-up 평균 2.5s ± 1.2s · 보행속도 평균 ± 25% · cell = 0.5m · BFS 경로 · 1-cell 1-person 충돌모델
      </footer>
    </div>
  );
}

function Legend() {
  const items = [
    { c: "#64748b", l: "착석" },
    { c: "#a78bfa", l: "기립 중" },
    { c: "#38bdf8", l: "보행" },
    { c: "#22c55e", l: "출구" },
    { c: "rgba(239,68,68,0.7)", l: "정체 heat" },
  ];
  return (
    <div className="bg-slate-800/50 rounded p-3 flex flex-wrap gap-3 text-xs text-slate-300">
      {items.map((i) => (
        <span key={i.l} className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: i.c }} />
          {i.l}
        </span>
      ))}
    </div>
  );
}
