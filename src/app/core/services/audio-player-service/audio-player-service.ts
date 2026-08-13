import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiService } from '../api-service/api-service';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  private api = inject(ApiService);
  private audioPlayer = new Audio();

  // Global Signals for any component to read
  currentPlayingAyah = signal<any | null>(null);
  playingSurahInfo = signal<any>(null);
  isAudioPlaying = signal<boolean>(false);
  isCardClicked = signal<boolean>(false);
  volume = signal<number>(0.8);
  private previousVolume = 0.8;

  // Time & Duration Tracking Signals
  currentTime = signal<number>(0);
  duration = signal<number>(0);

  // Formatted Time Helper Signal (e.g. "01:15 / 03:45")
  formattedTimeProgress = computed(() => {
    const current = this.formatTime(this.currentTime());
    const total = this.formatTime(this.duration());
    return `${current} / ${total}`;
  });

  private playingSurahAyahs: any[] = [];
  playUrduAudio = signal<boolean>(this.loadUrduAudioSetting());
  private isPlayingUrduTrack = false;
  lastPlayedAudio = signal<any>(this.loadAudioProgressFromStorage());

  // Tracks whether the audio element encountered a network loading fault
  private hasNetworkError = false;

  public playNextSurah$ = new Subject<number>();

  constructor() {
    this.audioPlayer.volume = this.volume();

    // Synchronize browser audio state with Angular signals
    this.audioPlayer.onplay = () => {
      this.isAudioPlaying.set(true);
      this.hasNetworkError = false;
    };
    this.audioPlayer.onpause = () => this.isAudioPlaying.set(false);

    // Audio time and metadata event listeners
    this.audioPlayer.ontimeupdate = () => {
      this.currentTime.set(this.audioPlayer.currentTime || 0);
    };

    this.audioPlayer.onloadedmetadata = () => {
      this.duration.set(this.audioPlayer.duration || 0);
    };

    // Silently pause and flag error when connection drops or media load fails
    this.audioPlayer.onerror = (event) => {
      console.warn('Audio stream interrupted or failed. Silently pausing player:', event);
      this.hasNetworkError = true;
      this.pauseAudio();
    };

    this.audioPlayer.onstalled = () => {
      console.warn('Audio stream stalled due to network slowdown. Silently pausing player.');
      this.hasNetworkError = true;
      this.pauseAudio();
    };

    // Auto-recovery listener when the browser detects internet connection is back
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Internet connection restored.');
        if (this.hasNetworkError && this.currentPlayingAyah()) {
          // Re-load current audio buffer in background so unpausing works immediately
          this.audioPlayer.load();
          this.hasNetworkError = false;
        }
      });
    }

    // Handle sequential track playback
    this.audioPlayer.onended = () => {
      const activeAyah = this.currentPlayingAyah();

      // If Arabic just finished and Urdu audio is available & enabled, play Urdu next
      if (!this.isPlayingUrduTrack && this.playUrduAudio() && activeAyah?.audioUrdu) {
        this.isPlayingUrduTrack = true;
        this.audioPlayer.src = activeAyah.audioUrdu;
        this.audioPlayer.load();
        this.audioPlayer.play().catch((err) => {
          console.warn('Urdu audio playback failed. Silently pausing:', err);
          this.hasNetworkError = true;
          this.pauseAudio();
        });
      } else {
        // Otherwise, move to the next Ayah in the Surah
        this.isPlayingUrduTrack = false;
        this.playNextAyah();
      }
    };

    // Save playback progress in local storage automatically
    effect(() => {
      const activeAyah = this.currentPlayingAyah();
      const currentSurahInfo = this.playingSurahInfo();

      if (activeAyah && currentSurahInfo) {
        const audioProgress = {
          surahNumber: currentSurahInfo.surahNumber,
          surahName: currentSurahInfo.englishName || currentSurahInfo.surahName,
          ayahNumber: activeAyah.numberInSurah,
        };

        localStorage.setItem('quran_audio_progress', JSON.stringify(audioProgress));
        this.lastPlayedAudio.set(audioProgress);
      }
    });
  }

  private loadAudioProgressFromStorage(): any {
    const saved = localStorage.getItem('quran_audio_progress');
    return saved ? JSON.parse(saved) : null;
  }

  playAudio(ayah: any, surahData?: any): void {
    if (!ayah) return;

    if (surahData) {
      this.playingSurahAyahs = surahData.ayahs || [];
      this.playingSurahInfo.set({
        surahNumber: surahData.info.number,
        englishName: surahData.info.englishName,
        audioEditionName: surahData.audio?.edition?.englishName || 'Reciter',
      });
    }

    const isSameTrack = this.currentPlayingAyah()?.numberInSurah === ayah.numberInSurah;

    // If unpausing same track after network recovery, force reload audio buffer
    if (isSameTrack && this.audioPlayer.src) {
      if (this.hasNetworkError || this.audioPlayer.readyState === 0) {
        this.audioPlayer.load();
      }

      this.audioPlayer
        .play()
        .then(() => {
          this.hasNetworkError = false;
          this.isAudioPlaying.set(true);
        })
        .catch((err) => {
          console.warn('Audio play failed. Network may still be offline:', err);
          this.hasNetworkError = true;
          this.pauseAudio();
        });
    } else {
      this.isPlayingUrduTrack = false;
      this.audioPlayer.src = ayah.audio;
      this.currentPlayingAyah.set(ayah);
      this.audioPlayer.load();
      this.audioPlayer
        .play()
        .then(() => {
          this.hasNetworkError = false;
          this.isAudioPlaying.set(true);
        })
        .catch((err) => {
          console.warn('Audio load/play failed. Network may still be offline:', err);
          this.hasNetworkError = true;
          this.pauseAudio();
        });
    }

    this.isCardClicked.set(true);
  }

  toggleUrduRecitation(enabled: boolean): void {
    this.playUrduAudio.set(enabled);
    localStorage.setItem('quran_play_urdu_audio', JSON.stringify(enabled));
  }

  pauseAudio(): void {
    this.audioPlayer.pause();
    this.isAudioPlaying.set(false);
  }

  toggleAyahAudio(ayah: any, surahData?: any): void {
    if (this.currentPlayingAyah()?.numberInSurah === ayah.numberInSurah && this.isAudioPlaying()) {
      this.pauseAudio();
    } else {
      this.playAudio(ayah, surahData);
    }
  }

  stopAudio(): void {
    this.audioPlayer.pause();
    this.audioPlayer.src = '';
    this.playingSurahAyahs = [];
    this.currentPlayingAyah.set(null);
    this.currentTime.set(0);
    this.duration.set(0);
    this.isAudioPlaying.set(false);
    this.isCardClicked.set(false);
    this.hasNetworkError = false;
  }

  seekTo(seconds: number): void {
    if (this.audioPlayer.duration) {
      this.audioPlayer.currentTime = seconds;
      this.currentTime.set(seconds);
    }
  }

  public formatTime(timeInSeconds: number): string {
    if (isNaN(timeInSeconds) || timeInSeconds === 0) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  private playNextAyah(): void {
    const current = this.currentPlayingAyah()?.numberInSurah;
    if (current !== null && current !== undefined && this.playingSurahAyahs.length > 0) {
      if (current < this.playingSurahAyahs.length) {
        this.playAudio(this.playingSurahAyahs[current]);
      } else {
        const currentSurahNumber = this.playingSurahInfo()?.surahNumber;
        if (currentSurahNumber && currentSurahNumber < 114) {
          const nextSurahNumber = currentSurahNumber + 1;
          this.loadAndPlayNextSurahGlobally(nextSurahNumber);
        } else {
          this.stopAudio();
        }
      }
    }
  }

  private loadAndPlayNextSurahGlobally(nextSurahNumber: number): void {
    this.api.getSurahDetails(nextSurahNumber).subscribe({
      next: (surahData) => {
        if (surahData && surahData.ayahs && surahData.ayahs.length > 0) {
          this.playAudio(surahData.ayahs[0], surahData);
          this.playNextSurah$.next(nextSurahNumber);
        } else {
          this.stopAudio();
        }
      },
      error: (err) => {
        console.warn('Failed to load next Surah globally. Silently pausing:', err);
        this.hasNetworkError = true;
        this.pauseAudio();
      },
    });
  }

  setVolume(value: number): void {
    this.volume.set(value);
    this.audioPlayer.volume = value;
  }

  toggleMute(): void {
    if (this.volume() > 0) {
      this.previousVolume = this.volume();
      this.setVolume(0);
    } else {
      this.setVolume(this.previousVolume > 0 ? this.previousVolume : 0.8);
    }
  }

  replayCurrentAyah(): void {
    const activeAyah = this.currentPlayingAyah();
    if (!activeAyah) return;

    this.isPlayingUrduTrack = false;
    this.audioPlayer.pause();
    this.audioPlayer.src = activeAyah.audio;
    this.audioPlayer.currentTime = 0;
    this.audioPlayer.load();
    this.audioPlayer
      .play()
      .then(() => {
        this.hasNetworkError = false;
        this.isAudioPlaying.set(true);
      })
      .catch((err) => {
        console.warn('Replay failed. Silently pausing:', err);
        this.hasNetworkError = true;
        this.pauseAudio();
      });
  }

  private loadUrduAudioSetting(): boolean {
    const saved = localStorage.getItem('quran_play_urdu_audio');
    return saved !== null ? JSON.parse(saved) : false;
  }
}
