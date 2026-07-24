import { atom } from 'nanostores';
import type { Track } from '../../types/track';
import { TRACKS } from '../../data/tracks';

export type VisualizerMode = 'bars' | 'waveform' | 'radial';
export type RepeatMode = 'none' | 'all' | 'one';

export const $currentTrack = atom<Track | null>(TRACKS[0] || null);
export const $isPlaying = atom<boolean>(false);
export const $currentTime = atom<number>(0);
export const $duration = atom<number>(TRACKS[0]?.duration || 150);
export const $volume = atom<number>(0.8);
export const $isMuted = atom<boolean>(false);
export const $queue = atom<Track[]>(TRACKS);
export const $visualizerMode = atom<VisualizerMode>('bars');
export const $showLyrics = atom<boolean>(false);
export const $showVisualizer = atom<boolean>(true);
export const $isShuffle = atom<boolean>(false);
export const $repeatMode = atom<RepeatMode>('none');

export function setQueue(tracks: Track[]) {
  $queue.set(tracks);
}

export function playTrack(track: Track, autoPlay: boolean = true) {
  const current = $currentTrack.get();
  if (current?.id === track.id) {
    if (autoPlay && !$isPlaying.get()) {
      $isPlaying.set(true);
    }
    return;
  }

  $currentTrack.set(track);
  $isPlaying.set(autoPlay);
}

export function togglePlay() {
  $isPlaying.set(!$isPlaying.get());
}

export function toggleShuffle() {
  $isShuffle.set(!$isShuffle.get());
}

export function cycleRepeatMode() {
  const modes: RepeatMode[] = ['none', 'all', 'one'];
  const current = $repeatMode.get();
  const nextMode = modes[(modes.indexOf(current) + 1) % modes.length];
  if (nextMode) {
    $repeatMode.set(nextMode);
  }
}

export function playNext() {
  const queue = $queue.get();
  const current = $currentTrack.get();
  if (!current || queue.length === 0) return;

  if ($isShuffle.get()) {
    if (queue.length === 1) {
      if (queue[0]) playTrack(queue[0]);
      return;
    }
    const currentIndex = queue.findIndex(t => t.id === current.id);
    let randomIndex = Math.floor(Math.random() * queue.length);
    while (randomIndex === currentIndex && queue.length > 1) {
      randomIndex = Math.floor(Math.random() * queue.length);
    }
    const target = queue[randomIndex];
    if (target) playTrack(target);
    return;
  }

  const currentIndex = queue.findIndex(t => t.id === current.id);
  const nextIndex = (currentIndex + 1) % queue.length;
  const target = queue[nextIndex];
  if (target) playTrack(target);
}

export function playPrevious() {
  const queue = $queue.get();
  const current = $currentTrack.get();
  if (!current || queue.length === 0) return;

  if ($isShuffle.get()) {
    if (queue.length === 1) {
      if (queue[0]) playTrack(queue[0]);
      return;
    }
    const currentIndex = queue.findIndex(t => t.id === current.id);
    let randomIndex = Math.floor(Math.random() * queue.length);
    while (randomIndex === currentIndex && queue.length > 1) {
      randomIndex = Math.floor(Math.random() * queue.length);
    }
    const target = queue[randomIndex];
    if (target) playTrack(target);
    return;
  }

  const currentIndex = queue.findIndex(t => t.id === current.id);
  const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
  const target = queue[prevIndex];
  if (target) playTrack(target);
}

export function setVolume(vol: number) {
  $volume.set(Math.max(0, Math.min(1, vol)));
}

export function toggleMute() {
  $isMuted.set(!$isMuted.get());
}

export function toggleLyrics() {
  $showLyrics.set(!$showLyrics.get());
}

export function cycleVisualizerMode() {
  const modes: VisualizerMode[] = ['bars', 'waveform', 'radial'];
  const current = $visualizerMode.get();
  const nextMode = modes[(modes.indexOf(current) + 1) % modes.length];
  if (nextMode) {
    $visualizerMode.set(nextMode);
  }
}
