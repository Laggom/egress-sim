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
  const fastRate = (cfg.fastRate ?? 0.15);
  const slowRate = (cfg.slowRate ?? 0.15);
  const smellyRate = (cfg.smellyRate ?? 0.05);
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      // trait 추첨
      const u = Math.random();
      let trait: "normal" | "fast" | "slow" | "smelly" = "normal";
      if (u < smellyRate) trait = "smelly";
      else if (u < smellyRate + fastRate) trait = "fast";
      else if (u < smellyRate + fastRate + slowRate) trait = "slow";
      const speedMul = trait === "fast" ? 1.45 : trait === "slow" ? 0.6 : 1.0;
      const standUpMul = trait === "slow" ? 1.6 : trait === "fast" ? 0.7 : 1.0;
      const speed = Math.max(0.2, (cfg.meanSpeed + randn() * cfg.meanSpeed * 0.25) * speedMul);
      const standUpDelay = Math.max(0.5, (2.5 + randn() * 1.2) * standUpMul);
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
        trait,
        dropUntil: -1,
        dropCount: 0,
        chatterWith: null,
        chatterLeader: false,
        lastProgressT: 0,
        chatterBroken: false,
      });
    }
  }
  // chatter 짝 매칭: 같은 row의 인접한 두 사람을 짝지음. 비율 만큼.
  const chatterPairRate = Math.max(0, Math.min(0.5, cfg.chatterPairRate ?? 0));
  const targetPairs = Math.floor((people.length * chatterPairRate) / 2);
  let made = 0;
  // row 단위로 셔플된 좌석 쌍 후보
  const candidatePairs: [number, number][] = [];
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols - 1; c++) {
      const aId = r * cfg.cols + c;
      const bId = r * cfg.cols + c + 1;
      candidatePairs.push([aId, bId]);
    }
  }
  // shuffle
  for (let i = candidatePairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatePairs[i], candidatePairs[j]] = [candidatePairs[j], candidatePairs[i]];
  }
  for (const [a, b] of candidatePairs) {
    if (made >= targetPairs) break;
    if (people[a].chatterWith !== null || people[b].chatterWith !== null) continue;
    people[a].chatterWith = b;
    people[b].chatterWith = a;
    // a를 leader (id가 작은 쪽). leader는 buddy를 기다리지 않음.
    people[a].chatterLeader = true;
    people[b].chatterLeader = false;
    // 같은 cue 시간으로 동기화 (둘 중 늦은 쪽)
    const c0 = Math.max(people[a].cueTime, people[b].cueTime);
    people[a].cueTime = c0;
    people[b].cueTime = c0;
    made++;
  }
  return people;
}

// 한 step 진행
export function stepSim(
  people: Person[],
  grid: Grid,
  t: number,
  dt: number,
  heat: Float32Array,
  cfg: SimConfig
): { allExited: boolean } {
  const dropPerSec = cfg.dropRatePerSec ?? 0;
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
          p.lastProgressT = t;
        } else {
          p.state = "exited";
          p.exitTime = t;
        }
      }
      continue;
    }
    if (p.state === "walking" && p.path && p.pathIdx !== undefined) {
      // 물건 떨어뜨림 진행 중이면 정지
      if (p.dropUntil > t) {
        const cx = Math.round(p.x);
        const cy = Math.round(p.y);
        heat[cy * W + cx] += dt * 0.5;
        continue;
      }
      // 새 drop 이벤트 추첨 (사람당, dt 비례)
      if (dropPerSec > 0 && Math.random() < dropPerSec * dt) {
        p.dropUntil = t + Math.max(1.0, 2.5 + randn() * 1.0);
        p.dropCount++;
        continue;
      }
      // chatter 동행: follower만 leader를 기다림. leader는 절대 안 기다림.
      // timeout(5s 동안 정체)면 동행 포기.
      if (p.chatterWith !== null && !p.chatterBroken) {
        const buddy = people[p.chatterWith];
        if (buddy && buddy.state !== "exited" && !buddy.chatterBroken) {
          if (!p.chatterLeader) {
            // follower
            if (buddy.state === "seated" || buddy.state === "standing") {
              // leader가 아직 출발 안 함 → 대기
              if (t - p.lastProgressT > 5) {
                p.chatterBroken = true;
                buddy.chatterBroken = true;
              } else {
                const cx = Math.round(p.x);
                const cy = Math.round(p.y);
                heat[cy * W + cx] += dt * 0.2;
                continue;
              }
            } else if (buddy.state === "walking") {
              // leader가 너무 멀리 가면 따라잡기 위해 leader를 잠시 멈추는 대신
              // follower는 그냥 계속 따라감 (leader가 기다리지 않으므로 deadlock 없음)
            }
          }
          // leader는 buddy를 신경쓰지 않음 — buddy가 알아서 따라옴
        }
      }
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
      // chatter면 짝과 속도 동기화 (더 느린 쪽으로)
      let effSpeed = p.speed;
      if (p.chatterWith !== null) {
        const buddy = people[p.chatterWith];
        if (buddy && buddy.state === "walking") effSpeed = Math.min(effSpeed, buddy.speed);
      }
      const cellPerSec = effSpeed / 0.5;
      const moveDist = cellPerSec * dt;

      const targetIdx = target.y * W + target.x;
      const occ = occupied.get(targetIdx);
      if (occ !== undefined && occ !== p.id) {
        // chatter 짝이 막고 있으면 통과 허용 (서로 자리 양보 가능)
        const isBuddyBlocking = p.chatterWith !== null && occ === p.chatterWith && !p.chatterBroken;
        if (!isBuddyBlocking) {
          const cx = Math.round(p.x);
          const cy = Math.round(p.y);
          heat[cy * W + cx] += dt;
          // deadlock 진단: 일정 시간 진전 없으면 broken
          if (t - p.lastProgressT > 5 && p.chatterWith !== null) {
            p.chatterBroken = true;
            const b2 = people[p.chatterWith];
            if (b2) b2.chatterBroken = true;
          }
          continue;
        }
      }
      // smelly 회피: 인접 4-cell에 smelly가 있으면 잠깐 망설이지만 영원히 막히지는 않음.
      // - 진전이 3초 넘게 없거나 chatter라면 무시하고 통과
      // - 그 외에는 dt당 일정 확률로만 멈춤 (양보 효과)
      if (p.trait !== "smelly") {
        let smellyAdj = false;
        const nbrs: [number, number][] = [
          [target.x + 1, target.y], [target.x - 1, target.y],
          [target.x, target.y + 1], [target.x, target.y - 1],
        ];
        for (const [nx, ny] of nbrs) {
          if (nx < 0 || ny < 0 || nx >= grid.W || ny >= grid.H) continue;
          const ni = ny * grid.W + nx;
          const oid = occupied.get(ni);
          if (oid !== undefined && oid !== p.id) {
            const other = people[oid];
            if (other && other.trait === "smelly" && other.state !== "exited") {
              smellyAdj = true;
              break;
            }
          }
        }
        if (smellyAdj) {
          const stalledFor = t - p.lastProgressT;
          // 3초 이상 정체되면 코 막고 통과
          if (stalledFor < 3) {
            // dt당 70% 확률로만 멈춤 (양보) → 평균 dt/0.3초 만에 통과
            if (Math.random() < 0.7) {
              const cx = Math.round(p.x);
              const cy = Math.round(p.y);
              heat[cy * W + cx] += dt * 0.4;
              continue;
            }
          }
          // 통과 시도 — heat은 그래도 약간 누적
          heat[Math.round(p.y) * W + Math.round(p.x)] += dt * 0.1;
        }
      }

      if (moveDist >= dist) {
        const oldIdx = Math.round(p.y) * W + Math.round(p.x);
        occupied.delete(oldIdx);
        p.x = target.x;
        p.y = target.y;
        p.pathIdx = wpIdx;
        occupied.set(targetIdx, p.id);
        p.lastProgressT = t;
      } else {
        p.x += (dx / dist) * moveDist;
        p.y += (dy / dist) * moveDist;
        p.lastProgressT = t;
      }
    }
  }

  const allExited = people.every((p) => p.state === "exited");
  return { allExited };
}
