import { create } from "zustand";
import type { SimConfig, Person, Policy } from "./types";
import { buildGrid, createPeople, stepSim, type Grid } from "./engine";

interface SimState {
  cfg: SimConfig;
  grid: Grid;
  people: Person[];
  heat: Float32Array;
  t: number;
  running: boolean;
  finishedAt: number | null;
  history: Record<Policy, number[]>;
  tick: number; // re-render trigger

  setCfg: (patch: Partial<SimConfig>) => void;
  reset: () => void;
  toggleRun: () => void;
  step: (dt: number) => void;
  selectSeat: (idx: number | null) => void;
}

const defaultCfg: SimConfig = {
  rows: 8,
  cols: 8,
  exitCount: 1,
  exitSide: "front",
  policy: "front-back",
  meanSpeed: 1.0,
  selectedSeat: null,
  colSections: 2,
  rowSections: 1,
};

function makeInitial(cfg: SimConfig) {
  const grid = buildGrid(cfg);
  const people = createPeople(cfg, grid);
  const heat = new Float32Array(grid.W * grid.H);
  return { grid, people, heat };
}

export const useSim = create<SimState>((set, get) => ({
  cfg: defaultCfg,
  ...makeInitial(defaultCfg),
  t: 0,
  running: false,
  finishedAt: null,
  history: { "front-back": [], "back-front": [], "row-by-row": [], "checkerboard": [], "free": [] },
  tick: 0,

  setCfg: (patch) => {
    const cfg = { ...get().cfg, ...patch };
    // clamp sections to <= rows/cols
    cfg.colSections = Math.max(1, Math.min(cfg.colSections, cfg.cols));
    cfg.rowSections = Math.max(1, Math.min(cfg.rowSections, cfg.rows));
    cfg.exitCount = Math.max(1, Math.min(cfg.exitCount, 6));
    // 좌석 변경 시 선택 좌석 invalidate
    if ((patch.rows !== undefined || patch.cols !== undefined) && cfg.selectedSeat !== null) {
      if (cfg.selectedSeat >= cfg.rows * cfg.cols) cfg.selectedSeat = null;
    }
    // 좌석/출구 변경 → 시뮬 재구성
    const needRebuild =
      patch.rows !== undefined ||
      patch.cols !== undefined ||
      patch.exitCount !== undefined ||
      patch.exitSide !== undefined ||
      patch.policy !== undefined ||
      patch.meanSpeed !== undefined ||
      patch.colSections !== undefined ||
      patch.rowSections !== undefined;
    if (needRebuild) {
      const init = makeInitial(cfg);
      set({ cfg, ...init, t: 0, running: false, finishedAt: null, tick: get().tick + 1 });
    } else {
      set({ cfg, tick: get().tick + 1 });
    }
  },

  reset: () => {
    const cfg = get().cfg;
    const init = makeInitial(cfg);
    set({ ...init, t: 0, running: false, finishedAt: null, tick: get().tick + 1 });
  },

  toggleRun: () => set({ running: !get().running }),

  step: (dt) => {
    const s = get();
    if (!s.running) return;
    const newT = s.t + dt;
    const res = stepSim(s.people, s.grid, newT, dt, s.heat);
    let finishedAt = s.finishedAt;
    let history = s.history;
    let running: boolean = s.running;
    if (res.allExited && finishedAt === null) {
      finishedAt = newT;
      running = false;
      const policy = s.cfg.policy;
      history = { ...s.history, [policy]: [...s.history[policy], newT] };
    }
    set({ t: newT, finishedAt, running, history, tick: s.tick + 1 });
  },

  selectSeat: (idx) => set({ cfg: { ...get().cfg, selectedSeat: idx }, tick: get().tick + 1 }),
}));
