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
  tick: number;
  // 벤치마크 상태
  benchmarking: boolean;
  benchProgress: { policy: Policy; run: number; total: number } | null;

  setCfg: (patch: Partial<SimConfig>) => void;
  reset: () => void;
  toggleRun: () => void;
  step: (dt: number) => void;
  selectSeat: (idx: number | null) => void;
  setTimeScale: (s: number) => void;
  runBenchmark: (runsPerPolicy: number) => Promise<void>;
  clearHistory: () => void;
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
  fastRate: 0.15,
  slowRate: 0.15,
  smellyRate: 0.05,
  dropRatePerSec: 0.003,
  chatterPairRate: 0.1,
  timeScale: 2,
};

function makeInitial(cfg: SimConfig) {
  const grid = buildGrid(cfg);
  const people = createPeople(cfg, grid);
  const heat = new Float32Array(grid.W * grid.H);
  return { grid, people, heat };
}

const ALL_POLICIES: Policy[] = ["front-back", "back-front", "row-by-row", "checkerboard", "free"];

// Headless로 한 번 시뮬 끝까지 돌리고 완료시간 반환
function simulateOnce(cfg: SimConfig): number {
  const grid = buildGrid(cfg);
  const people = createPeople(cfg, grid);
  const heat = new Float32Array(grid.W * grid.H);
  const dt = 0.1;
  let t = 0;
  const maxT = 1200; // 20분 cap
  while (t < maxT) {
    t += dt;
    const r = stepSim(people, grid, t, dt, heat, cfg);
    if (r.allExited) return t;
  }
  return t;
}

export const useSim = create<SimState>((set, get) => ({
  cfg: defaultCfg,
  ...makeInitial(defaultCfg),
  t: 0,
  running: false,
  finishedAt: null,
  history: { "front-back": [], "back-front": [], "row-by-row": [], "checkerboard": [], "free": [] },
  tick: 0,
  benchmarking: false,
  benchProgress: null,

  setCfg: (patch) => {
    const cfg = { ...get().cfg, ...patch };
    cfg.colSections = Math.max(1, Math.min(cfg.colSections, cfg.cols));
    cfg.rowSections = Math.max(1, Math.min(cfg.rowSections, cfg.rows));
    cfg.exitCount = Math.max(1, Math.min(cfg.exitCount, 6));
    cfg.fastRate = Math.max(0, Math.min(1, cfg.fastRate));
    cfg.slowRate = Math.max(0, Math.min(1, cfg.slowRate));
    cfg.smellyRate = Math.max(0, Math.min(1, cfg.smellyRate));
    cfg.chatterPairRate = Math.max(0, Math.min(0.5, cfg.chatterPairRate));
    cfg.dropRatePerSec = Math.max(0, Math.min(0.05, cfg.dropRatePerSec));
    if ((patch.rows !== undefined || patch.cols !== undefined) && cfg.selectedSeat !== null) {
      if (cfg.selectedSeat >= cfg.rows * cfg.cols) cfg.selectedSeat = null;
    }
    const needRebuild =
      patch.rows !== undefined ||
      patch.cols !== undefined ||
      patch.exitCount !== undefined ||
      patch.exitSide !== undefined ||
      patch.policy !== undefined ||
      patch.meanSpeed !== undefined ||
      patch.colSections !== undefined ||
      patch.rowSections !== undefined ||
      patch.fastRate !== undefined ||
      patch.slowRate !== undefined ||
      patch.smellyRate !== undefined ||
      patch.dropRatePerSec !== undefined ||
      patch.chatterPairRate !== undefined;
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
    const res = stepSim(s.people, s.grid, newT, dt, s.heat, s.cfg);
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

  setTimeScale: (s) => set({ cfg: { ...get().cfg, timeScale: s }, tick: get().tick + 1 }),

  clearHistory: () =>
    set({
      history: { "front-back": [], "back-front": [], "row-by-row": [], "checkerboard": [], "free": [] },
      tick: get().tick + 1,
    }),

  runBenchmark: async (runsPerPolicy) => {
    const baseCfg = get().cfg;
    set({ benchmarking: true, running: false, tick: get().tick + 1 });
    const fresh: Record<Policy, number[]> = {
      "front-back": [], "back-front": [], "row-by-row": [], "checkerboard": [], "free": [],
    };
    for (const policy of ALL_POLICIES) {
      for (let i = 0; i < runsPerPolicy; i++) {
        set({ benchProgress: { policy, run: i + 1, total: runsPerPolicy }, tick: get().tick + 1 });
        // UI 업데이트 양보
        await new Promise((r) => setTimeout(r, 0));
        const result = simulateOnce({ ...baseCfg, policy });
        fresh[policy].push(result);
        set({ history: { ...fresh }, tick: get().tick + 1 });
      }
    }
    set({ benchmarking: false, benchProgress: null, tick: get().tick + 1 });
  },
}));
