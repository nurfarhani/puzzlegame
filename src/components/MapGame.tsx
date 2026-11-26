import React, { useEffect, useState, type ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import LevelMap, { type MapWorld } from './LevelMap';
import { colors } from '../theme';
import {
  type PuzzleProgress,
  loadPuzzleProgress,
  savePuzzleProgress,
  withPuzzleResult,
} from '../lib/puzzleProgress';
import { useBackHandler } from '../lib/useBackHandler';

const MAP = 1; // LevelMap keeps its results under level 1

/** What a game's play screen gets for one level. */
export type MapPlayProps = {
  levelNumber: number;
  hasNext: boolean;
  /** Save a win: stars 1-3 and the seconds it took. */
  onSolved: (stars: number, time: number) => void;
  onNext: () => void;
  onRetry: () => void;
  onMap: () => void;
};

type MapGameProps = {
  storageKey: string;
  accent: string;
  count: number;
  perWorld: number;
  worlds: MapWorld[];
  /** The goal shown when a level on the map is tapped. */
  renderInfo: (level: number) => ReactNode;
  /** The screen for playing one level. */
  renderPlay: (props: MapPlayProps) => ReactNode;
};

/**
 * A game with a level map: loads the player's progress, shows the map, plays
 * a level and saves the result. The phone's back button returns to the map.
 */
const MapGame = ({ storageKey, accent, count, perWorld, worlds, renderInfo, renderPlay }: MapGameProps) => {
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0); // bumps to restart the same level

  useEffect(() => {
    let active = true;
    loadPuzzleProgress(storageKey).then((loaded) => {
      if (active) setProgress(loaded);
    });
    return () => {
      active = false;
    };
  }, [storageKey]);

  useBackHandler(() => setPlaying(null), playing !== null);

  if (!progress) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  if (playing !== null) {
    return (
      <React.Fragment key={`${playing}-${attempt}`}>
        {renderPlay({
          levelNumber: playing,
          hasNext: playing < count,
          onSolved: (stars, time) => {
            const next = withPuzzleResult(progress, MAP, playing, { stars, bestTime: time });
            setProgress(next);
            savePuzzleProgress(storageKey, next);
          },
          onNext: () => setPlaying(Math.min(playing + 1, count)),
          onRetry: () => setAttempt((a) => a + 1),
          onMap: () => setPlaying(null),
        })}
      </React.Fragment>
    );
  }

  return (
    <LevelMap
      count={count}
      perWorld={perWorld}
      worlds={worlds}
      progress={progress}
      accent={accent}
      renderInfo={renderInfo}
      onPlay={setPlaying}
    />
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default MapGame;
