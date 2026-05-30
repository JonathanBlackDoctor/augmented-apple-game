import { useGameStore } from '../app/store';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';

export function App() {
  const phase = useGameStore((s) => s.phase);
  return <div className="app">{phase === 'home' ? <HomeScreen /> : <GameScreen />}</div>;
}
