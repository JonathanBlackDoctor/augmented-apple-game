import { useEffect, useState } from 'react';
import { useGameStore } from '../../app/store';
import { SettingsOverlay } from '../components/SettingsOverlay';
import { HelpOverlay } from '../components/HelpOverlay';
import { LandscapeFullscreenButton } from '../components/LandscapeFullscreenButton';
import { loadMyProfile } from '../../profile/current';
import type { Tier } from '../../contracts';

const TIER_KO: Record<Tier, string> = {
  Iron: '아이언',
  Bronze: '브론즈',
  Silver: '실버',
  Gold: '골드',
  Platinum: '플래티넘',
  Diamond: '다이아',
  Master: '마스터',
};

export function HomeScreen() {
  const best = useGameStore((s) => s.bestTotal);
  const startLevels = useGameStore((s) => s.startLevels);
  const startOnline = useGameStore((s) => s.startOnline);
  const startLeaderboard = useGameStore((s) => s.startLeaderboard);
  const [overlay, setOverlay] = useState<'settings' | 'help' | null>(null);
  const [me, setMe] = useState<{ mmr: number; tier: Tier } | null>(null);

  useEffect(() => {
    let alive = true;
    void loadMyProfile()
      .then((p) => {
        if (alive) setMe({ mmr: p.mmr, tier: p.tier });
      })
      .catch(() => {
        /* anonymous / unavailable — hide the rank badge */
      });
    return () => {
      alive = false;
    };
  }, []);

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
          <button className="modecard primary" onClick={() => startLevels()}>
            <span className="mc-ic versus" aria-hidden>
              ⚔️
            </span>
            <span className="mc-body">
              <span className="mc-title">AI 레벨 도전 · 1~10</span>
              <span className="mc-sub">증강을 쌓아 라운드마다 겨루기</span>
            </span>
            {me && (
              <span className="mc-meta">
                <span className="mc-tier">{TIER_KO[me.tier]}</span>
                <span className="mc-mmr">MMR {me.mmr}</span>
              </span>
            )}
          </button>
          <button className="modecard" onClick={() => startOnline()}>
            <span className="mc-ic online" aria-hidden>
              🤝
            </span>
            <span className="mc-body">
              <span className="mc-title">친구와 1:1 대결</span>
              <span className="mc-sub">코드로 초대해 실시간 랭크전</span>
            </span>
          </button>
          <button className="modecard" onClick={() => startLeaderboard()}>
            <span className="mc-ic rank" aria-hidden>
              🏆
            </span>
            <span className="mc-body">
              <span className="mc-title">랭킹 보기</span>
              <span className="mc-sub">상위 20위 표</span>
            </span>
          </button>
        </div>
        {best > 0 && <p className="best">최고 점수 {best}</p>}
        <p className="hint">데스크톱·모바일 모두 드래그로 플레이</p>
        <LandscapeFullscreenButton />
        <div className="home-tools">
          <button className="btn ghost small" onClick={() => setOverlay('settings')}>
            ⚙ 설정
          </button>
          <button className="btn ghost small" onClick={() => setOverlay('help')}>
            ? 도움말
          </button>
        </div>
      </div>
      {overlay === 'settings' && <SettingsOverlay onClose={() => setOverlay(null)} />}
      {overlay === 'help' && <HelpOverlay onClose={() => setOverlay(null)} />}
    </div>
  );
}
