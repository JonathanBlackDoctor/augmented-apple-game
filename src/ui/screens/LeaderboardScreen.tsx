import { useEffect, useState } from 'react';
import { useGameStore } from '../../app/store';
import { StandardRankingService, InMemoryRankingStore, type RankingStore } from '../../ranking';
import { FIREBASE_CONFIGURED } from '../../net/firebaseConfig';
import type { PublicProfile } from '../../contracts';

export function LeaderboardScreen() {
  const [rows, setRows] = useState<PublicProfile[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      let store: RankingStore = new InMemoryRankingStore();
      if (FIREBASE_CONFIGURED) {
        const { FirebaseRankingStore } = await import('../../ranking/firebaseStore');
        store = new FirebaseRankingStore();
      }
      try {
        const lb = await new StandardRankingService(store).leaderboard(20);
        if (alive) setRows(lb);
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const goHome = (): void => {
    useGameStore.setState({ mode: 'solo' });
    useGameStore.getState().goHome();
  };

  return (
    <div className="screen home">
      <div className="home-card lb-card">
        <h2 className="title sm">랭킹 · 상위 20</h2>
        {rows === null && <div className="spinner" />}
        {rows && rows.length === 0 && (
          <p className="aug-sub">아직 기록이 없어요. 친구와 랭크 대결을 해보세요!</p>
        )}
        {rows && rows.length > 0 && (
          <ol className="lb-list">
            {rows.map((r, i) => (
              <li key={r.uid} className="lb-row">
                <span className="lb-rank">{i + 1}</span>
                <span className="lb-av">{r.avatar}</span>
                <span className="lb-nick">{r.nickname}</span>
                <span className="lb-tier">{r.tier}</span>
                <span className="lb-mmr">{r.mmr}</span>
              </li>
            ))}
          </ol>
        )}
        <button className="btn ghost" onClick={goHome}>
          홈으로
        </button>
      </div>
    </div>
  );
}
