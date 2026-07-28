import { 
  $currentTrack, 
  $isPlaying, 
  $currentTime, 
  $duration, 
  $volume, 
  $isMuted,
  $repeatMode,
  $queue,
  playNext,
  playPrevious,
  togglePlay
} from './PlayerStore';

class AudioEngineSingleton {
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private isInitialized = false;
  private playPromise: Promise<void> | null = null;
  private isChangingTrack = false;
  private preloader: HTMLAudioElement | null = null;

  public init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    const initialTrack = $currentTrack.get();
    if (initialTrack) {
      this.audio.src = initialTrack.audioUrl;
    }

    // Native audio state sync listeners
    this.audio.addEventListener('play', () => {
      if (!$isPlaying.get()) {
        $isPlaying.set(true);
      }
      this.updatePositionState();
    });

    this.audio.addEventListener('pause', () => {
      // Do not sync $isPlaying during track change or when play promise is active
      if (this.isChangingTrack || this.playPromise !== null) return;
      if ($isPlaying.get()) {
        $isPlaying.set(false);
      }
      this.updatePositionState();
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        $currentTime.set(this.audio.currentTime);
        // Periodically sync position state for lockscreen timeline
        if (Math.floor(this.audio.currentTime) % 2 === 0) {
          this.updatePositionState();
        }
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio) {
        $duration.set(this.audio.duration || 0);
        this.updatePositionState();
      }
    });

    this.audio.addEventListener('ended', () => {
      const repeat = $repeatMode.get();
      if (repeat === 'one') {
        if (this.audio) {
          this.audio.currentTime = 0;
          this.play();
        }
      } else {
        playNext();
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[AudioEngine] Audio element encountered error, attempting recovery:', e);
      if (this.audio && this.audio.src) {
        const currentSrc = this.audio.src;
        // Simple retry mechanism if audio stalls/fails
        setTimeout(() => {
          if (this.audio && $isPlaying.get()) {
            this.audio.src = currentSrc;
            this.audio.play().catch(() => {});
          }
        }, 1000);
      }
    });

    // Subscribe to Nanostores track changes
    $currentTrack.subscribe(async (track) => {
      if (track && this.audio) {
        const fullAudioUrl = new URL(track.audioUrl, window.location.href).href;

        // Only load if URL actually changed
        if (this.audio.src !== fullAudioUrl) {
          this.isChangingTrack = true;
          const wasPlaying = $isPlaying.get();
          this.audio.src = track.audioUrl;
          this.audio.currentTime = 0;
          $currentTime.set(0);

          if (wasPlaying) {
            await this.play();
          }
          this.isChangingTrack = false;
        }

        // Dynamically extract ID3 cover art
        try {
          const { extractAudioMetadata } = await import('./MetadataExtractor');
          const meta = await extractAudioMetadata(track.audioUrl);
          if (meta.coverUrl) {
            const updatedTrack = { ...track, cover: meta.coverUrl };
            this.updateMediaSession(updatedTrack);
            const playerCover = document.getElementById('player-cover') as HTMLImageElement;
            if (playerCover) playerCover.src = meta.coverUrl;
          }
        } catch (e) {
          // Ignore metadata extraction errors silently
        }

        this.updateMediaSession(track);
        this.preloadNextTrack();
      }
    });

    // Subscribe to Nanostores play state changes
    $isPlaying.subscribe(async (playing) => {
      if (!this.audio) return;
      if (playing) {
        if (this.audio.paused) {
          await this.play();
        }
      } else {
        await this.pause();
      }
    });

    $volume.subscribe((vol) => {
      if (this.audio) {
        this.audio.volume = $isMuted.get() ? 0 : vol;
      }
    });

    $isMuted.subscribe((muted) => {
      if (this.audio) {
        this.audio.volume = muted ? 0 : $volume.get();
      }
    });

    this.setupMediaSessionHandlers();
  }

  private setupWebAudio() {
    if (this.audioCtx || !this.audio) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      // Fast, ultra-responsive FFT analysis without heavy lag
      this.analyser.smoothingTimeConstant = 0.35;

      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio API initialization deferred:', e);
    }
  }

  public async play() {
    if (!this.isInitialized) {
      this.init();
    }
    if (!this.audio) return;

    if (!this.audioCtx) {
      this.setupWebAudio();
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        // AudioContext resume handled
      }
    }

    try {
      if (this.playPromise) {
        await this.playPromise;
        if (!this.audio.paused) return;
      }

      this.playPromise = this.audio.play();
      await this.playPromise;
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Audio play prevented by browser policy:', e);
        if ($isPlaying.get()) {
          $isPlaying.set(false);
        }
      }
    } finally {
      this.playPromise = null;
    }
  }

  public async pause() {
    if (!this.audio) return;

    if (this.playPromise) {
      try {
        await this.playPromise;
      } catch (e) {
        // Ignore play promise abort errors
      }
      this.playPromise = null;
    }

    if (!this.audio.paused) {
      this.audio.pause();
    }
  }

  public seek(seconds: number) {
    if (this.audio) {
      this.audio.currentTime = seconds;
      $currentTime.set(seconds);
      this.updatePositionState();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  private updatePositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (this.audio && !isNaN(this.audio.duration) && isFinite(this.audio.duration) && this.audio.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: this.audio.duration,
            playbackRate: this.audio.playbackRate || 1.0,
            position: Math.min(Math.max(0, this.audio.currentTime || 0), this.audio.duration)
          });
        } catch (e) {
          // Ignore state sync exceptions
        }
      }
    }
  }

  private preloadNextTrack() {
    if (typeof window === 'undefined') return;
    const queue = $queue.get();
    const current = $currentTrack.get();
    if (!current || queue.length <= 1) return;

    const currentIndex = queue.findIndex(t => t.id === current.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    const nextTrack = queue[nextIndex];

    if (nextTrack && nextTrack.audioUrl) {
      try {
        if (!this.preloader) {
          this.preloader = new Audio();
          this.preloader.preload = 'auto';
        }
        this.preloader.src = nextTrack.audioUrl;
      } catch (e) {
        // Preload failure non-critical
      }
    }
  }

  private updateMediaSession(track: any) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
          { src: track.cover, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      this.updatePositionState();
    }
  }

  private setupMediaSessionHandlers() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    }
  }
}

export const AudioEngine = new AudioEngineSingleton();
