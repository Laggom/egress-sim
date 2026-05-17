import { useEffect, useRef } from "react";
import { SimCanvas } from "./components/SimCanvas";
import { Controls } from "./components/Controls";
import { Chart } from "./components/Chart";
import { useSim } from "./sim/store";

export default function App() {
  const running = useSim((s) => s.running);
  const step = useSim((s) => s.step);
  const timeScale = useSim((s) => s.cfg.timeScale);
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
      const realDt = Math.min(0.1, (now - lastRef.current) / 1000);
      lastRef.current = now;
      // 배속 적용: 큰 배속에서는 sub-step으로 잘게 나눠 정확도 유지
      let remaining = realDt * timeScale;
      const sub = 0.05;
      while (remaining > 0) {
        const d = Math.min(sub, remaining);
        step(d);
        remaining -= d;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, step, timeScale]);

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
  const groups: { title: string; items: { c: string; l: string; ring?: string; dashed?: boolean; emoji?: string }[] }[] = [
    {
      title: "상태",
      items: [
        { c: "#64748b", l: "착석" },
        { c: "#a78bfa", l: "기립 중" },
        { c: "#38bdf8", l: "보행 (보통)" },
      ],
    },
    {
      title: "사람 특성",
      items: [
        { c: "#22c55e", l: "⚡ 빠른 사람" },
        { c: "#fb923c", l: "🐢 느린 사람" },
        { c: "#84cc16", l: "🦨 냄새나는 사람", ring: "rgba(132,204,22,0.5)" },
        { c: "#38bdf8", l: "💬 대화 짝 (점선 연결)", dashed: true },
        { c: "#38bdf8", l: "📦 물건 떨어뜨림 (아이콘)", emoji: "📦" },
      ],
    },
    {
      title: "환경",
      items: [
        { c: "#22c55e", l: "출구 (EXIT)" },
        { c: "rgba(239,68,68,0.7)", l: "정체 heat" },
        { c: "#facc15", l: "선택된 좌석/사람" },
      ],
    },
  ];
  return (
    <div className="bg-slate-800/50 rounded p-3 text-xs text-slate-300 space-y-2">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{g.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {g.items.map((i) => (
              <span key={i.l} className="inline-flex items-center gap-1.5">
                <LegendSwatch color={i.c} ring={i.ring} dashed={i.dashed} emoji={i.emoji} />
                {i.l}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LegendSwatch({ color, ring, dashed, emoji }: { color: string; ring?: string; dashed?: boolean; emoji?: string }) {
  if (emoji) {
    return <span className="inline-flex w-4 h-4 items-center justify-center text-[12px] leading-none">{emoji}</span>;
  }
  if (dashed) {
    return (
      <span className="inline-flex w-5 h-3 items-center">
        <span className="w-full border-t-2 border-dashed" style={{ borderColor: "#ec4899" }} />
      </span>
    );
  }
  return (
    <span
      className="inline-block w-3 h-3 rounded-full"
      style={{ background: color, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    />
  );
}
