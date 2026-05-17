import { useSim } from "../sim/store";
import type { Policy } from "../sim/types";

const POLICIES: { v: Policy; label: string; color: string }[] = [
  { v: "front-back", label: "앞→뒤", color: "#38bdf8" },
  { v: "back-front", label: "뒤→앞", color: "#a78bfa" },
  { v: "row-by-row", label: "줄별", color: "#34d399" },
  { v: "checkerboard", label: "격자", color: "#f472b6" },
  { v: "free", label: "자유", color: "#fbbf24" },
];

const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export function Chart() {
  const { history, cfg, traitBench } = useSim();

  const policyData = POLICIES.map((p) => ({
    ...p,
    runs: history[p.v].length,
    avg: avg(history[p.v]),
  }));
  const policyMax = Math.max(1, ...policyData.map((d) => d.avg));

  // trait bench 결과: 현재 설정 대비 변화율 계산
  const current = traitBench.find((r) => r.scenario === "current");
  const currentAvg = current ? avg(current.runs) : 0;
  const traitMax = Math.max(1, ...traitBench.map((r) => avg(r.runs)));

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-slate-800/50 rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-200 font-medium">정책별 평균 퇴장시간</div>
          <div className="text-xs text-slate-400">현재: {POLICIES.find((p) => p.v === cfg.policy)?.label}</div>
        </div>
        <div className="space-y-2">
          {policyData.map((d) => (
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
                  style={{ width: `${d.avg > 0 ? (d.avg / policyMax) * 100 : 0}%`, background: d.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Run을 끝까지 돌리거나 정책 Benchmark 실행 시 누적.
        </p>
      </div>

      {traitBench.length > 0 && (
        <div className="bg-slate-800/50 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-200 font-medium">특성 ON/OFF 영향</div>
            {currentAvg > 0 && (
              <div className="text-xs text-slate-400">기준: {currentAvg.toFixed(1)}s</div>
            )}
          </div>
          <div className="space-y-2">
            {traitBench.map((r) => {
              const v = avg(r.runs);
              const delta = currentAvg > 0 && v > 0 ? ((v - currentAvg) / currentAvg) * 100 : 0;
              const color = traitColor(r.scenario);
              return (
                <div key={r.scenario}>
                  <div className="flex justify-between text-xs text-slate-300 mb-0.5">
                    <span>{r.label}</span>
                    <span className="font-mono">
                      {v > 0 ? `${v.toFixed(1)}s` : "…"}
                      {currentAvg > 0 && v > 0 && r.scenario !== "current" && (
                        <span className={`ml-1 ${delta > 0 ? "text-red-300" : delta < 0 ? "text-emerald-300" : "text-slate-500"}`}>
                          ({delta > 0 ? "+" : ""}{delta.toFixed(1)}%)
                        </span>
                      )}{" "}
                      <span className="text-slate-500">({r.runs.length}회)</span>
                    </span>
                  </div>
                  <div className="h-3 bg-slate-900/70 rounded overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${v > 0 ? (v / traitMax) * 100 : 0}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            "현재 설정" 대비 각 특성을 하나씩 끄거나 모두 끄는/켜는 시나리오 비교. 음수%(초록)면 그 특성을 줄이면 빨라짐.
          </p>
        </div>
      )}
    </div>
  );
}

function traitColor(s: string): string {
  switch (s) {
    case "current": return "#94a3b8";
    case "no-fast": return "#22c55e";
    case "no-slow": return "#fb923c";
    case "no-smelly": return "#84cc16";
    case "no-chatter": return "#ec4899";
    case "no-drop": return "#fbbf24";
    case "all-off": return "#38bdf8";
    case "all-on": return "#ef4444";
    default: return "#94a3b8";
  }
}
