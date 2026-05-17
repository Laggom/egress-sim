import { useEffect, useRef } from "react";
import { useSim } from "../sim/store";

export function SimCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { cfg, grid, people, heat, tick, selectSeat } = useSim();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // cell size
      const padding = 12;
      const cellW = (W - padding * 2) / grid.W;
      const cellH = (H - padding * 2) / grid.H;
      const cell = Math.max(6, Math.min(cellW, cellH));
      const gridPxW = cell * grid.W;
      const gridPxH = cell * grid.H;
      const ox = (W - gridPxW) / 2;
      const oy = (H - gridPxH) / 2;

      const cellToPx = (x: number, y: number) => ({
        px: ox + x * cell + cell / 2,
        py: oy + y * cell + cell / 2,
      });

      // 배경 (room)
      ctx.fillStyle = "#11161d";
      ctx.fillRect(ox, oy, gridPxW, gridPxH);

      // heatmap (정체)
      let maxHeat = 0;
      for (let i = 0; i < heat.length; i++) if (heat[i] > maxHeat) maxHeat = heat[i];
      if (maxHeat > 0) {
        for (let y = 0; y < grid.H; y++) {
          for (let x = 0; x < grid.W; x++) {
            const h = heat[y * grid.W + x];
            if (h <= 0) continue;
            const a = Math.min(0.75, h / Math.max(1, maxHeat));
            ctx.fillStyle = `rgba(239,68,68,${a})`;
            ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
          }
        }
      }

      // 통로 + 출구
      for (let y = 0; y < grid.H; y++) {
        for (let x = 0; x < grid.W; x++) {
          const idx = y * grid.W + x;
          if (grid.isAisle[idx]) {
            ctx.fillStyle = "rgba(56,189,248,0.06)";
            ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
          }
        }
      }

      // 좌석 그리드
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const sc = grid.seatCells[r][c];
          const px = ox + sc.x * cell;
          const py = oy + sc.y * cell;
          const seatIdx = r * cfg.cols + c;
          const selected = cfg.selectedSeat === seatIdx;
          ctx.fillStyle = selected ? "#facc15" : "#1f2937";
          ctx.strokeStyle = selected ? "#fde047" : "#374151";
          ctx.lineWidth = selected ? 2 : 1;
          ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
          ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
        }
      }

      // 출구
      for (const e of grid.exits) {
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(ox + e.x * cell, oy + e.y * cell, cell, cell);
        ctx.fillStyle = "#052e16";
        ctx.font = `bold ${Math.max(8, cell * 0.5)}px ui-sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const { px, py } = cellToPx(e.x, e.y);
        ctx.fillText("EXIT", px, py);
      }

      // 선택 좌석의 경로 표시
      if (cfg.selectedSeat !== null) {
        const sr = Math.floor(cfg.selectedSeat / cfg.cols);
        const sc = cfg.selectedSeat % cfg.cols;
        const person = people.find((p) => p.seatRow === sr && p.seatCol === sc);
        if (person?.path) {
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < person.path.length; i++) {
            const { px, py } = cellToPx(person.path[i].x, person.path[i].y);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }

      // 사람 (점)
      for (const p of people) {
        if (p.state === "exited") continue;
        const { px, py } = cellToPx(p.x, p.y);
        const sr = Math.floor((cfg.selectedSeat ?? -1) / cfg.cols);
        const sc2 = (cfg.selectedSeat ?? -1) % cfg.cols;
        const isSelected = p.seatRow === sr && p.seatCol === sc2;
        let color = "#60a5fa";
        if (p.state === "seated") color = "#64748b";
        else if (p.state === "standing") color = "#a78bfa";
        else if (p.state === "walking") color = "#38bdf8";
        if (isSelected) color = "#facc15";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, cell * 0.28), 0, Math.PI * 2);
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    };

    draw();

    // 클릭 → 좌석 선택
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const padding = 12;
      const cellW = (rect.width - padding * 2) / grid.W;
      const cellH = (rect.height - padding * 2) / grid.H;
      const cell = Math.max(6, Math.min(cellW, cellH));
      const gridPxW = cell * grid.W;
      const gridPxH = cell * grid.H;
      const ox = (rect.width - gridPxW) / 2;
      const oy = (rect.height - gridPxH) / 2;
      const gx = Math.floor((mx - ox) / cell);
      const gy = Math.floor((my - oy) / cell);
      // 좌석 hit test
      for (let r = 0; r < cfg.rows; r++) {
        for (let c = 0; c < cfg.cols; c++) {
          const sc = grid.seatCells[r][c];
          if (sc.x === gx && sc.y === gy) {
            const idx = r * cfg.cols + c;
            selectSeat(cfg.selectedSeat === idx ? null : idx);
            return;
          }
        }
      }
      selectSeat(null);
    };
    canvas.addEventListener("click", onClick);

    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => {
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
    };
  }, [grid, people, heat, cfg, tick, selectSeat]);

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full cursor-pointer" />
    </div>
  );
}
