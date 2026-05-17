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

export function Controls() {
  const { cfg, setCfg, running, toggleRun, reset, t, finishedAt } = useSim();

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex gap-2">
        <button
          onClick={toggleRun}
          className={`flex-1 px-3 py-2 rounded font-medium ${
            running ? "bg-amber-500 text-black" : "bg-emerald-500 text-black"
          }`}
        >
          {running ? "⏸ Pause" : "▶ Run"}
        </button>
        <button onClick={reset} className="flex-1 px-3 py-2 rounded font-medium bg-slate-600 text-white">
          ↺ Reset
        </button>
      </div>

      <div className="bg-slate-800/60 rounded p-2 grid grid-cols-2 gap-2">
        <Stat label="경과" value={`${t.toFixed(1)}s`} />
        <Stat label="완료" value={finishedAt !== null ? `${finishedAt.toFixed(1)}s` : "—"} />
      </div>

      <Slider
        label={`좌석 행: ${cfg.rows}`}
        min={2}
        max={40}
        value={cfg.rows}
        onChange={(v) => setCfg({ rows: v })}
      />
      <Slider
        label={`좌석 열: ${cfg.cols}`}
        min={2}
        max={40}
        value={cfg.cols}
        onChange={(v) => setCfg({ cols: v })}
      />
      <Slider
        label={`세로 통로 섹션: ${cfg.colSections} (열 ÷ ${cfg.colSections}덩어리)`}
        min={1}
        max={Math.min(6, cfg.cols)}
        value={cfg.colSections}
        onChange={(v) => setCfg({ colSections: v })}
      />
      <Slider
        label={`가로 통로 섹션: ${cfg.rowSections} (행 ÷ ${cfg.rowSections}덩어리)`}
        min={1}
        max={Math.min(6, cfg.rows)}
        value={cfg.rowSections}
        onChange={(v) => setCfg({ rowSections: v })}
      />
      <Slider
        label={`출구 수: ${cfg.exitCount}`}
        min={1}
        max={6}
        value={cfg.exitCount}
        onChange={(v) => setCfg({ exitCount: v })}
      />

      <div>
        <div className="mb-1 text-slate-300">출구 위치</div>
        <div className="grid grid-cols-3 gap-1">
          {exitSides.map((e) => (
            <button
              key={e.v}
              onClick={() => setCfg({ exitSide: e.v })}
              className={`px-2 py-1.5 rounded text-xs ${
                cfg.exitSide === e.v ? "bg-sky-500 text-black" : "bg-slate-700 text-slate-200"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-slate-300">퇴장 정책</div>
        <select
          value={cfg.policy}
          onChange={(e) => setCfg({ policy: e.target.value as Policy })}
          className="w-full bg-slate-800 text-white rounded px-2 py-1.5"
        >
          {policies.map((p) => (
            <option key={p.v} value={p.v}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <Slider
        label={`평균 보행 속도: ${cfg.meanSpeed.toFixed(2)} m/s`}
        min={0.4}
        max={1.6}
        step={0.05}
        value={cfg.meanSpeed}
        onChange={(v) => setCfg({ meanSpeed: v })}
      />

      {cfg.selectedSeat !== null && (
        <div className="text-xs text-amber-300 bg-amber-500/10 rounded px-2 py-1.5">
          선택된 좌석: {Math.floor(cfg.selectedSeat / cfg.cols) + 1}열 {cfg.selectedSeat % cfg.cols + 1}번
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="font-mono text-base">{value}</div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-slate-300">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
