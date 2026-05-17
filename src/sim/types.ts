export type Policy = "front-back" | "back-front" | "row-by-row" | "checkerboard" | "free";
export type ExitSide = "front" | "back" | "side";

export interface SimConfig {
  rows: number;
  cols: number;
  exitCount: 1 | 2 | 3;
  exitSide: ExitSide;
  policy: Policy;
  meanSpeed: number;
  selectedSeat: number | null;
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
