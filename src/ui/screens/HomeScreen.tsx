import { useGameStore } from '../../app/store';

export function HomeScreen() {
  const best = useGameStore((s) => s.bestTotal);
  const startSolo = useGameStore((s) => s.startSolo);
  const startAugment = useGameStore((s) => s.startAugment);
  const startVersus = useGameStore((s) => s.startVersus);
  const startOnline = useGameStore((s) => s.startOnline);
  return (
    <div className="screen home">
      <div className="home-card">
        <div className="logo" aria-hidden>
          <svg viewBox="0 0 64 64" width="76" height="76">
            <path
              d="M32 18c-7-9-22-6-22 8 0 12 11 24 22 24s22-12 22-24c0-14-15-17-22-8z"
              fill="var(--apple)"
            />
            <path d="M34 9c4-3 9-2 11 1-3 3-8 3-11-1z" fill="var(--leaf)" />
            <text x="32" y="43" textAnchor="middle" className="logo-num">
              10
            </text>
          </svg>
        </div>
        <h1 className="title">증강 사과게임</h1>
        <p className="subtitle">
          합이 <b>10</b>이 되도록 사과를 드래그해 담으세요
        </p>
        <div className="home-actions">
          <button className="btn primary" onClick={() => startSolo()}>
            빠른 한 판 · 30초
          </button>
          <button className="btn gold" onClick={() => startAugment()}>
            5라운드 증강 모드
          </button>
          <button className="btn versus" onClick={() => startVersus(5, 30_000)}>
            AI와 대결 · 5라운드
          </button>
          <button className="btn online" onClick={() => startOnline()}>
            친구와 1:1 대결
          </button>
        </div>
        {best > 0 && <p className="best">최고 점수 {best}</p>}
        <p className="hint">데스크톱·모바일 모두 드래그로 플레이</p>
      </div>
    </div>
  );
}
