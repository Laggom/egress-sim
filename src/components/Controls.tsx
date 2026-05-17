import { useState } from "react";
import { useSim } from "../sim/store";
import type { Policy, ExitSide } from "../sim/types";

const policies: { v: Policy; label: string }[] = [
  { v: "front-back", label: "앞 → 뒤" },
  { v: "back-front", label: "뒤 → 앞" },
  { v: "row-by-row", label: "줄별" },
  { v: "checkerboard", label: "격자" },
  { v: "free", label: "자유" },
];

const exitSides: { v: ExitSide; label: string }[] = [
  { v: "front", label: "앞" },
  { v: "back", label: "뒤" },
  { v: "side", label: "측면" },
];

const SPEED_OPTIONS = [1, 2, 4, 8, 16];

export function Controls() {
  const {
    cfg, setCfg, running, toggleRun, reset, t, finishedAt,
    setTimeScale, runBenchmark, runTraitBenchmark, benchmarking, benchProgress,
    clearHistory, clearTraitBench,
  } = useSim();
  const [benchRuns, setBenchRuns] = useState(5);
  const [traitRuns, setTraitRuns] = useState(3);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex gap-2">
        <button
          disabled={benchmarking}
          onClick={toggleRun}
          className={`flex-1 px-3 py-2 rounded font-medium ${
            running ? "bg-amber-500 text-black" : "bg-emerald-500 text-black"
          } ${benchmarking ? "opacity-40" : ""}`}
        >
          {running ? "⏸ Pause" : "▶ Run"}
        </button>
        <button
          disabled={benchmarking}
          onClick={reset}
          className="flex-1 px-3 py-2 rounded font-medium bg-slate-600 text-white disabled:opacity-40"
        >
          ↺ Reset
        </button>
      </div>

      {/* 배속 */}
      <div>
        <div className="mb-1 text-slate-300 flex justify-between">
          <span>시뮬 배속</span>
          <span className="text-slate-400">{cfg.timeScale}×</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setTimeScale(s)}
              className={`px-2 py-1.5 rounded text-xs font-mono ${
                cfg.timeScale === s ? "bg-sky-500 text-black" : "bg-slate-700 text-slate-200"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 rounded p-2 grid grid-cols-2 gap-2">
        <Stat label="경과" value={`${t.toFixed(1)}s`} />
        <Stat label="완료" value={finishedAt !== null ? `${finishedAt.toFixed(1)}s` : "—"} />
      </div>

      {/* Benchmark */}
      <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded p-2">
        <div className="text-fuchsia-300 text-xs mb-2 font-medium">🧪 Benchmark</div>

        {/* 진행 표시 (둘 다 공유) */}
        {benchmarking && benchProgress && (
          <div className="mb-2 text-[11px] text-fuchsia-200 bg-fuchsia-500/10 rounded px-2 py-1">
            ▶ {benchProgress.label} · {benchProgress.run}/{benchProgress.total}
          </div>
        )}

        {/* 정책 benchmark */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs text-slate-300 flex-1">정책 비교</label>
            <input
              type="number" min={1} max={20} value={benchRuns}
              onChange={(e) => setBenchRuns(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-12 bg-slate-800 rounded px-1 py-0.5 text-xs text-right"
              disabled={benchmarking}
            />
            <span className="text-[10px] text-slate-500">회</span>
          </div>
          <button
            disabled={benchmarking}
            onClick={() => runBenchmark(benchRuns)}
            className="w-full px-2 py-1.5 rounded text-xs font-medium bg-fuchsia-500 text-black disabled:opacity-50"
          >
            ▶ 5개 정책 × {benchRuns}회
          </button>
        </div>

        {/* 특성 benchmark */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs text-slate-300 flex-1">특성 ON/OFF 영향</label>
            <input
              type="number" min={1} max={10} value={traitRuns}
              onChange={(e) => setTraitRuns(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-12 bg-slate-800 rounded px-1 py-0.5 text-xs text-right"
              disabled={benchmarking}
            />
            <span className="text-[10px] text-slate-500">회</span>
          </div>
          <button
            disabled={benchmarking}
            onClick={() => runTraitBenchmark(traitRuns)}
            className="w-full px-2 py-1.5 rounded text-xs font-medium bg-pink-500 text-black disabled:opacity-50"
          >
            ▶ 8개 시나리오 × {traitRuns}회
          </button>
        </div>

        <div className="flex gap-1 mt-2">
          <button disabled={benchmarking} onClick={clearHistory}
            className="flex-1 px-2 py-1 rounded text-[11px] bg-slate-700 text-slate-300 disabled:opacity-40">
            정책 초기화
          </button>
          <button disabled={benchmarking} onClick={clearTraitBench}
            className="flex-1 px-2 py-1 rounded text-[11px] bg-slate-700 text-slate-300 disabled:opacity-40">
            특성 초기화
          </button>
        </div>
      </div>

      <Slider label={`좌석 행: ${cfg.rows}`} min={2} max={40} value={cfg.rows}
        onChange={(v) => setCfg({ rows: v })} />
      <Slider label={`좌석 열: ${cfg.cols}`} min={2} max={40} value={cfg.cols}
        onChange={(v) => setCfg({ cols: v })} />
      <Slider label={`세로 통로 섹션: ${cfg.colSections}`}
        min={1} max={Math.min(6, cfg.cols)} value={cfg.colSections}
        onChange={(v) => setCfg({ colSections: v })} />
      <Slider label={`가로 통로 섹션: ${cfg.rowSections}`}
        min={1} max={Math.min(6, cfg.rows)} value={cfg.rowSections}
        onChange={(v) => setCfg({ rowSections: v })} />
      <Slider label={`출구 수: ${cfg.exitCount}`} min={1} max={6} value={cfg.exitCount}
        onChange={(v) => setCfg({ exitCount: v })} />

      <div>
        <div className="mb-1 text-slate-300">출구 위치</div>
        <div className="grid grid-cols-3 gap-1">
          {exitSides.map((e) => (
            <button key={e.v} onClick={() => setCfg({ exitSide: e.v })}
              className={`px-2 py-1.5 rounded text-xs ${
                cfg.exitSide === e.v ? "bg-sky-500 text-black" : "bg-slate-700 text-slate-200"
              }`}>{e.label}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-slate-300">퇴장 정책</div>
        <select value={cfg.policy}
          onChange={(e) => setCfg({ policy: e.target.value as Policy })}
          className="w-full bg-slate-800 text-white rounded px-2 py-1.5">
          {policies.map((p) => (
            <option key={p.v} value={p.v}>{p.label}</option>
          ))}
        </select>
      </div>

      <Slider label={`평균 보행 속도: ${cfg.meanSpeed.toFixed(2)} m/s`}
        min={0.4} max={1.6} step={0.05} value={cfg.meanSpeed}
        onChange={(v) => setCfg({ meanSpeed: v })} />

      {/* Traits */}
      <details open className="bg-slate-800/40 rounded p-2">
        <summary className="cursor-pointer text-slate-200 text-xs font-medium">👥 사람 특성 비율</summary>
        <div className="mt-2 flex flex-col gap-2">
          <Slider label={`⚡ 빠른 사람: ${pct(cfg.fastRate)}`}
            min={0} max={0.5} step={0.01} value={cfg.fastRate}
            onChange={(v) => setCfg({ fastRate: v })} />
          <Slider label={`🐢 느린 사람: ${pct(cfg.slowRate)}`}
            min={0} max={0.5} step={0.01} value={cfg.slowRate}
            onChange={(v) => setCfg({ slowRate: v })} />
          <Slider label={`🦨 냄새나는 사람: ${pct(cfg.smellyRate)}`}
            min={0} max={0.3} step={0.01} value={cfg.smellyRate}
            onChange={(v) => setCfg({ smellyRate: v })} />
          <Slider label={`💬 대화 짝 비율: ${pct(cfg.chatterPairRate * 2)} (인원 기준)`}
            min={0} max={0.5} step={0.01} value={cfg.chatterPairRate}
            onChange={(v) => setCfg({ chatterPairRate: v })} />
          <Slider label={`📦 물건 떨어뜨림: ${(cfg.dropRatePerSec * 100).toFixed(2)}%/초/인`}
            min={0} max={0.02} step={0.0005} value={cfg.dropRatePerSec}
            onChange={(v) => setCfg({ dropRatePerSec: v })} />
        </div>
      </details>

      {cfg.selectedSeat !== null && (
        <div className="text-xs text-amber-300 bg-amber-500/10 rounded px-2 py-1.5">
          선택된 좌석: {Math.floor(cfg.selectedSeat / cfg.cols) + 1}열 {cfg.selectedSeat % cfg.cols + 1}번
        </div>
      )}
    </div>
  );
}

function pct(v: number) { return `${Math.round(v * 100)}%`; }

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="font-mono text-base">{value}</div>
    </div>
  );
}

function Slider({ label, min, max, step = 1, value, onChange }: {
  label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-slate-300">{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full" />
    </label>
  );
}
