import type { SimConfig, Person } from "./types";

export interface Grid {
  W: number;
  H: number;
  isAisle: Uint8Array;
  isExit: Uint8Array;
  exits: { x: number; y: number }[];
  seatCells: { x: number; y: number }[][];
  colAisleXs: number[]; // 세로 통로의 x 좌표들 (양 끝 + 섹션 사이)
  rowAisleYs: number[]; // 가로 통로의 y 좌표들 (양 끝 + 섹션 사이)
}

// cols을 colSections 개로 거의 균등 분할
function splitCounts(total: number, sections: number): number[] {
  const s = Math.max(1, Math.min(sections, total));
  const base = Math.floor(total / s);
  const rem = total - base * s;
  const out: number[] = [];
  for (let i = 0; i < s; i++) out.push(base + (i < rem ? 1 : 0));
  return out;
}

export function buildGrid(cfg: SimConfig): Grid {
  const { rows, cols, exitCount, exitSide } = cfg;
  const colSections = Math.max(1, Math.min(cfg.colSections, cols));
  const rowSections = Math.max(1, Math.min(cfg.rowSections, rows));

  const colChunks = splitCounts(cols, colSections); // 좌석 열 분포
  const rowChunks = splitCounts(rows, rowSections);

  // 가로 폭: 좌측통로 + (각 섹션 좌석 + 다음 섹션 사이 통로) + 우측통로
  // 통로 수 = colSections + 1 (양 끝 + 섹션 사이)
  const numColAisles = colSections + 1;
  const numRowAisles = rowSections + 1;
  const W = cols + numColAisles;
  const H = rows + numRowAisles;

  const isAisle = new Uint8Array(W * H);
  const isExit = new Uint8Array(W * H);

  // 세로 통로 x 좌표
  const colAisleXs: number[] = [];
  {
    let x = 0;
    colAisleXs.push(x); // 좌측 통로
    for (let i = 0; i < colSections; i++) {
      x += 1 + colChunks[i]; // 통로 1칸 + 좌석 chunk
      colAisleXs.push(x);
    }
  }
  // 가로 통로 y 좌표
  const rowAisleYs: number[] = [];
  {
    let y = 0;
    rowAisleYs.push(y);
    for (let i = 0; i < rowSections; i++) {
      y += 1 + rowChunks[i];
      rowAisleYs.push(y);
    }
  }

  const colAisleSet = new Set(colAisleXs);
  const rowAisleSet = new Set(rowAisleYs);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (colAisleSet.has(x) || rowAisleSet.has(y)) {
        isAisle[y * W + x] = 1;
      }
    }
  }

  // 좌석 cell 매핑: (r, c) -> {x, y}
  // c가 속한 colSection 인덱스 찾기, r도 마찬가지
  const seatCells: { x: number; y: number }[][] = [];
  // 각 column 인덱스에 대한 cell x 사전 계산
  const colToX: number[] = new Array(cols);
  {
    let cur = 0; // 좌석 column counter
    let x = 1;   // 첫 좌측통로 다음
    for (let s = 0; s < colSections; s++) {
      for (let k = 0; k < colChunks[s]; k++) {
        colToX[cur++] = x++;
      }
      x++; // 섹션 사이 통로 건너뛰기
    }
  }
  const rowToY: number[] = new Array(rows);
  {
    let cur = 0;
    let y = 1;
    for (let s = 0; s < rowSections; s++) {
      for (let k = 0; k < rowChunks[s]; k++) {
        rowToY[cur++] = y++;
      }
      y++;
    }
  }
  for (let r = 0; r < rows; r++) {
    const row: { x: number; y: number }[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ x: colToX[c], y: rowToY[r] });
    }
    seatCells.push(row);
  }

  const exits: { x: number; y: number }[] = [];
  const placeExits = (axis: "x" | "y", fixed: number, length: number) => {
    const n = Math.max(1, Math.min(exitCount, length - 1));
    for (let i = 1; i <= n; i++) {
      const pos = Math.max(1, Math.min(length - 1, Math.round((i * length) / (n + 1))));
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

  return { W, H, isAisle, isExit, exits, seatCells, colAisleXs, rowAisleYs };
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
