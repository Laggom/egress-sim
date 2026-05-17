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
  colSections: number;  // 세로 통로로 나뉘는 블록 수 (1~6)
  rowSections: number;  // 가로 통로로 나뉘는 블록 수 (1~6)
}

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
}
