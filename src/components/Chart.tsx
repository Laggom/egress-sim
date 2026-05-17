import { useSim } from "../sim/store";
import type { Policy } from "../sim/types";

const POLICIES: { v: Policy; label: string; color: string }[] = [
  { v: "front-back", label: "앞→뒤", color: "#38bdf8" },
  { v: "back-front", label: "뒤→앞", color: "#a78bfa" },
  { v: "row-by-row", label: "줄별", color: "#34d399" },
  { v: "checkerboard", label: "격자", color: "#f472b6" },
  { v: "free", label: "자유", color: "#fbbf24" },
];

export function Chart() {
  const { history, cfg } = useSim();
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const data = POLICIES.map((p) => ({
    ...p,
    runs: history[p.v].length,
    avg: avg(history[p.v]),
  }));
  const max = Math.max(1, ...data.map((d) => d.avg));

  return (
    <div className="bg-slate-800/50 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-200 font-medium">정책별 평균 퇴장시간</div>
        <div className="text-xs text-slate-400">현재: {POLICIES.find((p) => p.v === cfg.policy)?.label}</div>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.v}>
            <div className="flex justify-between text-xs text-slate-300 mb-0.5">
              <span>{d.label}</span>
              <span className="font-mono">
                {d.avg > 0 ? `${d.avg.toFixed(1)}s` : "—"}{" "}
                <span className="text-slate-500">({d.runs}회)</span>
              </span>
            </div>
            <div className="h-3 bg-slate-900/70 rounded overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${d.avg > 0 ? (d.avg / max) * 100 : 0}%`,
                  background: d.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        Run을 끝까지 돌리면 해당 정책에 기록이 1회 누적됩니다. 비교하려면 정책을 바꿔서 다시 Run.
      </p>
    </div>
  );
}
