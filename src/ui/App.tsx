import { useEffect } from 'react';
import { useGameStore } from '../app/store';
import { parseDeepLink } from '../matchmaking';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { OnlineScreen } from './screens/OnlineScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { InAppBanner } from './components/InAppBanner';
import { DayNightSky } from './components/DayNightSky';

export function App() {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);

  useEffect(() => {
    const dl = parseDeepLink(window.location.search);
    if (dl.room) useGameStore.getState().startOnline();
  }, []);

  const content =
    mode === 'online' ? (
      <OnlineScreen />
    ) : mode === 'leaderboard' ? (
      <LeaderboardScreen />
    ) : phase === 'home' ? (
      <HomeScreen />
    ) : (
      <GameScreen />
    );
  return (
    <div className="app">
      <DayNightSky />
      <InAppBanner />
      {content}
    </div>
  );
}
