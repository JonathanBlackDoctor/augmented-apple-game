import { useEffect } from 'react';
import { useGameStore } from '../app/store';
import { parseDeepLink } from '../matchmaking';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { OnlineScreen } from './screens/OnlineScreen';

export function App() {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);

  useEffect(() => {
    const dl = parseDeepLink(window.location.search);
    if (dl.room) useGameStore.getState().startOnline();
  }, []);

  if (mode === 'online') {
    return (
      <div className="app">
        <OnlineScreen />
      </div>
    );
  }
  return <div className="app">{phase === 'home' ? <HomeScreen /> : <GameScreen />}</div>;
}
