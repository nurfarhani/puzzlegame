import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import RouteMap from '../components/monument/RouteMap';
import LevelPlay, { type LevelOutcome } from '../components/monument/LevelPlay';
import { palette } from '../components/monument/palette';
import {
  type Progress,
  loadProgress,
  saveProgress,
  withResult,
} from '../lib/progress';
import { recordPlay } from '../lib/scores';
import { useBackHandler } from '../lib/useBackHandler';

// Monument Valley: opens on the route map; tapping a level plays it.
// Progress is loaded from the phone on start and saved after every win.
const MonumentValleyGame = () => {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [playing, setPlaying] = useState<number | null>(null); // level number, or null for the map

  useEffect(() => {
    let active = true;
    loadProgress().then((loaded) => {
      if (active) setProgress(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Phone back button: from a level, go back to the map.
  useBackHandler(() => setPlaying(null), playing !== null);

  if (!progress) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={palette.spinPath} />
      </View>
    );
  }

  const handleComplete = (level: number) => (outcome: LevelOutcome) => {
    const next = withResult(progress, level, {
      stars: outcome.stars,
      bestTurns: outcome.turns,
      bestPar: outcome.par,
    });
    setProgress(next);
    saveProgress(next);
    recordPlay({
      game: 'monumentvalley',
      won: true,
      level,
      stars: outcome.stars,
      turns: outcome.turns,
    });
  };

  if (playing !== null) {
    return (
      <LevelPlay
        key={playing}
        levelNumber={playing}
        onComplete={handleComplete(playing)}
        onOpenMap={() => setPlaying(null)}
        onPlayLevel={setPlaying}
      />
    );
  }

  return <RouteMap progress={progress} onPlay={setPlaying} />;
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sky,
  },
});

export default MonumentValleyGame;
