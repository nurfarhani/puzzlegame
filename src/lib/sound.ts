// Sound effects + haptics for the games.
// Audio assets are bundled WAV files; playback and vibration are best-effort
// — every call is wrapped so a missing audio stack can never break a game.

import * as Haptics from 'expo-haptics';
import { createAudioPlayer, preload, type AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

import popSound from '../../assets/sounds/pop.wav';
import snapSound from '../../assets/sounds/snap.wav';
import tapSound from '../../assets/sounds/tap.wav';
import winSound from '../../assets/sounds/win.wav';

const STORAGE_KEY = 'sound.enabled.v1';

let soundOn = true;
let warm = false;

type EffectName = 'pop' | 'snap' | 'tap' | 'win';

const SOURCES: Record<EffectName, number> = {
  pop: popSound,
  snap: snapSound,
  tap: tapSound,
  win: winSound,
};

const players = new Map<EffectName, AudioPlayer>();

// Preload every player once so the first tap has no startup delay.
const warmUp = () => {
  if (warm) return;
  warm = true;
  try {
    for (const name of Object.keys(SOURCES) as EffectName[]) {
      players.set(name, createAudioPlayer(SOURCES[name]));
      void preload(SOURCES[name]);
    }
  } catch {
    players.clear();
  }
};

const play = (name: EffectName) => {
  if (!soundOn) return;
  warmUp();
  const player = players.get(name);
  if (!player) return;
  try {
    void player.seekTo(0).then(() => player.play());
  } catch {
    // ignore: sound is a nice-to-have
  }
};

export const playPop = () => play('pop');
export const playSnap = () => play('snap');
export const playTap = () => play('tap');
export const playWin = () => play('win');

export const buzzLight = () => {
  if (!soundOn) return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // no haptics hardware (e.g. emulators): fine
  }
};

export const buzzSuccess = () => {
  if (!soundOn) return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
};

/** Celebrate a win: fanfare + a strong buzz. */
export const celebrateWin = () => {
  playWin();
  buzzSuccess();
};

export const loadSoundSetting = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    soundOn = raw === null ? true : raw === 'true';
  } catch {
    soundOn = true;
  }
  if (soundOn) warmUp();
};

export const isSoundOn = (): boolean => soundOn;

export const setSoundOn = async (on: boolean): Promise<void> => {
  soundOn = on;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(on));
  } catch {
    // keep the in-memory setting even if storage fails
  }
  if (on) {
    warmUp();
    playTap();
  }
};
