import { useEffect } from 'react';
import { useVisualViewportVars } from './ui/hooks/useVisualViewport';
import { useRoute } from './ui/router';
import { GameScreen } from './ui/screens/GameScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen';

const TITLES = {
  home: 'Magic Words',
  play: 'Jogando · Magic Words',
  leaderboard: 'Leaderboard · Magic Words',
} as const;

export function App() {
  const route = useRoute();
  useVisualViewportVars();

  useEffect(() => {
    document.title = TITLES[route.name];
    if (route.name !== 'home') window.scrollTo(0, 0);
  }, [route.name]);

  switch (route.name) {
    case 'play':
      return <GameScreen key={route.mode} mode={route.mode} />;
    case 'leaderboard':
      return <LeaderboardScreen mode={route.mode} />;
    default:
      return <HomeScreen />;
  }
}
