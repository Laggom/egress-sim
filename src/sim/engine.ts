import type { SimConfig, Person } from "./types";

export interface Grid {
  W: number;
  H: number;
  isAisle: Uint8Array;
  isExit: Uint8Array;
  exits: { x: number; y: number }[];
  seatCells: { x: number; y: number }[][];
  hasCenterAisle: boolean;
}

export function buildGrid(cfg: SimConfig): Grid {
  const { rows, cols, exitCount, exitSide } = cfg;
  const hasCenterAisle = cols >= 6;
  const W = cols + (hasCenterAisle ? 3 : 2);
  const H = rows + 2;
  const isAisle = new Uint8Array(W * H);
  const isExit = new Uint8Array(W * H);

  const centerAisleX = hasCenterAisle ? 1 + Math.floor(cols / 2) : -1;
  const leftAisleX = 0;
  const rightAisleX = W - 1;
  const frontAisleY = 0;
  const backAisleY = H - 1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (
        x === leftAisleX ||
        x === rightAisleX ||
        x === centerAisleX ||
        y === frontAisleY ||
        y === backAisleY
      ) {
        isAisle[y * W + x] = 1;
      }
    }
  }

  const seatCells: { x: number; y: number }[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: { x: number; y: number }[] = [];
    for (let c = 0; c < cols; c++) {
      let x = 1 + c;
      if (hasCenterAisle && c >= Math.floor(cols / 2)) x += 1;
      const y = 1 + r;
      row.push({ x, y });
    }
    seatCells.push(row);
  }

  const exits: { x: number; y: number }[] = [];
  const placeExits = (axis: "x" | "y", fixed: number, length: number) => {
    for (let i = 1; i <= exitCount; i++) {
      const pos = Math.max(1, Math.min(length - 1, Math.round((i * length) / (exitCount + 1))));
      if (axis === "x") exits.push({ x: pos, y: fixed });
      else exits.push({ x: fixed, y: pos });
    }
  };
  if (exitSide === "front") placeExits("x", 0, W - 1);
  else if (exitSide === "back") placeExits("x", H - 1, W - 1);
  else placeExits("y", 0, H - 1);

  for (const e of exits) {
    isExit[e.y * W + e.x] = 1;
    isAisle[e.y * W + e.x] = 1;
  }

  return { W, H, isAisle, isExit, exits, seatCells, hasCenterAisle };
}

export function bfsPath(grid: Grid, sx: number, sy: number): { x: number; y: number }[] | null {
  const { W, H, isAisle, isExit } = grid;
  const dist = new Int32Array(W * H).fill(-1);
  const prev = new Int32Array(W * H).fill(-1);
  const startIdx = sy * W + sx;
  dist[startIdx] = 0;
  const q: number[] = [startIdx];
  let head = 0;
  let endIdx = -1;
  while (head < q.length) {
    const idx = q[head++];
    if (isExit[idx]) { endIdx = idx; break; }
    const x = idx % W;
    const y = (idx - x) / W;
    const nbrs: [number, number][] = [
      [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
    ];
    for (const [nx, ny] of nbrs) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (dist[ni] !== -1) continue;
      if (!isAisle[ni] && !isExit[ni]) continue;
      dist[ni] = dist[idx] + 1;
      prev[ni] = idx;
      q.push(ni);
    }
  }
  if (endIdx === -1) return null;
  const path: { x: number; y: number }[] = [];
  let cur = endIdx;
  while (cur !== -1) {
    const x = cur % W;
    const y = (cur - x) / W;
    path.push({ x, y });
    cur = prev[cur];
  }
  path.reverse();
  return path;
}

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function computeCueTimes(cfg: SimConfig): number[][] {
  const { rows, cols, policy } = cfg;
  const cue: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  switch (policy) {
    case "free":
      break;
    case "front-back":
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cue[r][c] = r * 1.5;
      break;
    case "back-front":
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cue[r][c] = (rows - 1 - r) * 1.5;
      break;
    case "row-by-row":
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cue[r][c] = r * 2.5;
      break;
    case "checkerboard":
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cue[r][c] = ((r + c) % 2) * 4;
      break;
  }
  return cue;
}

export function createPeople(cfg: SimConfig, grid: Grid): Person[] {
  const cue = computeCueTimes(cfg);
  const people: Person[] = [];
  let id = 0;
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      const speed = Math.max(0.2, cfg.meanSpeed + randn() * cfg.meanSpeed * 0.25);
      const standUpDelay = Math.max(0.5, 2.5 + randn() * 1.2);
      const seat = grid.seatCells[r][c];
      people.push({
        id: id++,
        x: seat.x,
        y: seat.y,
        seatRow: r,
        seatCol: c,
        seatX: seat.x,
        seatY: seat.y,
        speed,
        standUpDelay,
        cueTime: cue[r][c],
        standUpStart: -1,
        state: "seated",
      });
    }
  }
  return people;
}

// 한 step 진행
export function stepSim(
  people: Person[],
  grid: Grid,
  t: number,
  dt: number,
  heat: Float32Array
): { allExited: boolean } {
  const { W } = grid;
  const occupied = new Map<number, number>();
  for (const p of people) {
    if (p.state === "exited" || p.state === "seated") continue;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    occupied.set(cy * W + cx, p.id);
  }

  for (const p of people) {
    if (p.state === "exited") continue;

    if (p.state === "seated") {
      if (t >= p.cueTime) {
        p.state = "standing";
        p.standUpStart = t;
      }
      continue;
    }
    if (p.state === "standing") {
      if (t - p.standUpStart >= p.standUpDelay) {
        const path = bfsPath(grid, p.seatX, p.seatY);
        if (path) {
          p.path = path;
          p.pathIdx = 0;
          p.state = "walking";
        } else {
          p.state = "exited";
          p.exitTime = t;
        }
      }
      continue;
    }
    if (p.state === "walking" && p.path && p.pathIdx !== undefined) {
      const wpIdx = p.pathIdx + 1;
      if (wpIdx >= p.path.length) {
        p.state = "exited";
        p.exitTime = t;
        const oldIdx = Math.round(p.y) * W + Math.round(p.x);
        occupied.delete(oldIdx);
        continue;
      }
      const target = p.path[wpIdx];
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const cellPerSec = p.speed / 0.5; // 0.5m per cell
      const moveDist = cellPerSec * dt;

      const targetIdx = target.y * W + target.x;
      const occ = occupied.get(targetIdx);
      if (occ !== undefined && occ !== p.id) {
        const cx = Math.round(p.x);
        const cy = Math.round(p.y);
        heat[cy * W + cx] += dt;
        continue;
      }

      if (moveDist >= dist) {
        const oldIdx = Math.round(p.y) * W + Math.round(p.x);
        occupied.delete(oldIdx);
        p.x = target.x;
        p.y = target.y;
        p.pathIdx = wpIdx;
        occupied.set(targetIdx, p.id);
      } else {
        p.x += (dx / dist) * moveDist;
        p.y += (dy / dist) * moveDist;
      }
    }
  }

  const allExited = people.every((p) => p.state === "exited");
  return { allExited };
}
