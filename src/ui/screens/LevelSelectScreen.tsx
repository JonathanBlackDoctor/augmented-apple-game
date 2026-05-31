// ui/screens/LevelSelectScreen.tsx — the AI level campaign hub (replaces the flat
// "AI와 대결"). 10 named rivals, sequential unlock; clearing one opens the next and
// an emote reward. Doubles as the entry to the emote collection.
import { useState } from 'react';
import { useGameStore } from '../../app/store';
import { useProgressStore } from '../../app/progressStore';
import { AI_LEVELS, MAX_LEVEL } from '../../bot';
import { EMOTES } from '../../emotes';
import { EmoteCollection } from '../components/EmoteCollection';

export function LevelSelectScreen() {
  const startVersus = useGameStore((s) => s.startVersus);
  const selectLevel = useProgressStore((s) => s.selectLevel);
  const highestCleared = useProgressStore((s) => s.highestCleared);
  const unlockedEmotes = useProgressStore((s) => s.unlockedEmotes);
  const [showEmotes, setShowEmotes] = useState(false);

  const highestUnlocked = Math.min(MAX_LEVEL, highestCleared + 1);
  const goHome = (): void => useGameStore.setState({ mode: 'solo', phase: 'home' });
  const play = (level: number): void => {
    selectLevel(level);
    startVersus(5, 30_000);
  };

  return (
    <div className="screen levels">
      <div className="levels-card">
        <div className="levels-top">
          <button className="btn ghost small" onClick={goHome}>
            ← 홈
          </button>
          <h1 className="title sm">AI 레벨 도전</h1>
          <button className="btn ghost small" onClick={() => setShowEmotes(true)}>
            😀 {unlockedEmotes.length}/{EMOTES.length}
          </button>
        </div>
        <p className="levels-sub">
          이기면 다음 레벨과 <b>감정표현</b>이 열려요
        </p>
        <div className="level-grid">
          {AI_LEVELS.map((lv) => {
            const cleared = lv.level <= highestCleared;
            const unlocked = lv.level <= highestUnlocked;
            const current = unlocked && !cleared;
            const cls = cleared ? 'cleared' : current ? 'current' : 'locked';
            return (
              <button
                key={lv.level}
                className={`level-card ${cls}`}
                disabled={!unlocked}
                onClick={() => unlocked && play(lv.level)}
              >
                <span className="lv-badge">{cleared ? '⭐' : unlocked ? lv.level : '🔒'}</span>
                <span className="lv-avatar">{lv.avatar}</span>
                <span className="lv-name">
                  Lv.{lv.level} {lv.name}
                </span>
                <span className="lv-title">{lv.title}</span>
              </button>
            );
          })}
        </div>
      </div>
      {showEmotes && <EmoteCollection onClose={() => setShowEmotes(false)} />}
    </div>
  );
}
