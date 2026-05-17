# 🚪 세미나실 퇴장 시뮬레이터

🔗 **Live**: https://egress-sim.vercel.app

좌석 배치, 출구 위치, 퇴장 정책에 따라 세미나실이 비워지는 데 얼마나 걸리는지 보여주는 인터랙티브 시뮬레이터.

## 모델 가정

- **셀 크기**: 0.5 m × 0.5 m (좌석 폭/통로 폭 기준)
- **보행 속도**: 사용자 평균 ± 약 25% (정규분포)
- **기립 시간**: 평균 2.5 s, 표준편차 1.2 s (실제 좌석 이탈 timing 반영)
- **충돌**: 1 cell = 1 person. 다음 칸이 점유되어 있으면 대기 → 정체 누적(heat)
- **경로**: BFS로 좌석 → 가장 가까운 출구
- **정책**: 앞→뒤 / 뒤→앞 / 줄별 / 격자(짝수→홀수) / 자유(동시)

## Stack
Vite + React 18 + TypeScript + Tailwind + Canvas 2D + zustand. 외부 API 0개.

## 개발
```bash
npm install
npm run dev
```
