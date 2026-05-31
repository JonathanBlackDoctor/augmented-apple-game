import { useEffect, useState } from 'react';
import { useGameStore } from '../../app/store';
import { StandardRankingService, InMemoryRankingStore, type RankingStore } from '../../ranking';
import { FIREBASE_CONFIGURED } from '../../net/firebaseConfig';
import { loadMyProfile } from '../../profile/current';
import type { PublicProfile } from '../../contracts';

function LbRow({ r, rank, me }: { r: PublicProfile; rank: number; me: boolean }) {
  return (
    <li className={`lb-row${me ? ' me' : ''}${rank <= 3 ? ' podium' : ''}`}>
      <span className={`lb-rank${rank <= 3 ? ` top top-${rank}` : ''}`}>{rank}</span>
      <span className="lb-av">{r.avatar}</span>
      <span className="lb-nick">
        {r.nickname}
        {me && <span className="lb-you">나</span>}
      </span>
      <span className="lb-tier">{r.tier}</span>
      <span className="lb-mmr">{r.mmr}</span>
    </li>
  );
}

export function LeaderboardScreen() {
  const [rows, setRows] = useState<PublicProfile[] | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);

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
      try {
        const me = await loadMyProfile();
        if (alive) setMyUid(me.uid);
      } catch {
        /* anonymous / unavailable — no self-highlight */
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

  const myIndex = rows && myUid ? rows.findIndex((r) => r.uid === myUid) : -1;
  const showSticky = myIndex >= 8; // my row scrolled out of easy view

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
              <LbRow key={r.uid} r={r} rank={i + 1} me={r.uid === myUid} />
            ))}
          </ol>
        )}
        {showSticky && rows && myIndex >= 0 && (
          <ol className="lb-list lb-sticky">
            <LbRow r={rows[myIndex]} rank={myIndex + 1} me />
          </ol>
        )}
        <button className="btn ghost" onClick={goHome}>
          홈으로
        </button>
      </div>
    </div>
  );
}
