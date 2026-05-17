export type Policy = "front-back" | "back-front" | "row-by-row" | "checkerboard" | "free";
export type ExitSide = "front" | "back" | "side";

export interface SimConfig {
  rows: number;
  cols: number;
  exitCount: number;
  exitSide: ExitSide;
  policy: Policy;
  meanSpeed: number;
  selectedSeat: number | null;
  // 좌석 덩어리(섹션) 수
  colSections: number;
  rowSections: number;
  // 인구 traits 비율 (0~1)
  fastRate: number;
  slowRate: number;
  smellyRate: number;
  // 물건 떨어뜨릴 확률/초당 (사람당)
  dropRatePerSec: number;
  // 대화하는 쌍의 비율 (전체 인원 대비, 0~0.5)
  chatterPairRate: number;
  // 시뮬 배속 (1, 2, 4, 8)
  timeScale: number;
}

export type Trait = "normal" | "fast" | "slow" | "smelly";

export interface Person {
  id: number;
  x: number;
  y: number;
  seatRow: number;
  seatCol: number;
  seatX: number;
  seatY: number;
  speed: number;
  standUpDelay: number;
  cueTime: number;
  standUpStart: number;
  state: "seated" | "standing" | "walking" | "exited";
  exitTime?: number;
  path?: { x: number; y: number }[];
  pathIdx?: number;
  trait: Trait;
  dropUntil: number;
  dropCount: number;
  // 대화 짝 (서로 ID 참조). null이면 솔로
  chatterWith: number | null;
  // chatter 한 쌍에서 한 명은 leader(true), 다른 한 명은 follower(false)
  chatterLeader: boolean;
  // 마지막으로 진전이 있었던 시간 (deadlock 감지용)
  lastProgressT: number;
  // chatter 동행 포기 여부 (timeout 시 true)
  chatterBroken: boolean;
}
