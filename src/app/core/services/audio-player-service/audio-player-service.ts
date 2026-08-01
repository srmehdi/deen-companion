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
  volume = signal<number>(0.7);
  private previousVolume = 0.7;

  private playingSurahAyahs: any[] = [];
  playUrduAudio = signal<boolean>(this.loadUrduAudioSetting());
  private isPlayingUrduTrack = false;
  lastPlayedAudio = signal<any>(this.loadAudioProgressFromStorage());

  public playNextSurah$ = new Subject<number>();

  constructor() {
    this.audioPlayer.volume = this.volume();

    // Event Listeners to synchronize browser audio state with Angular signals
    this.audioPlayer.onplay = () => this.isAudioPlaying.set(true);
    this.audioPlayer.onpause = () => this.isAudioPlaying.set(false);

    // Handle sequential track playback
    this.audioPlayer.onended = () => {
      const activeAyah = this.currentPlayingAyah();

      // If Arabic just finished and Urdu audio is available & enabled, play Urdu next
      if (!this.isPlayingUrduTrack && this.playUrduAudio() && activeAyah?.audioUrdu) {
        this.isPlayingUrduTrack = true;
        this.audioPlayer.src = activeAyah.audioUrdu;
        this.audioPlayer.load();
        this.audioPlayer.play().catch((err) => console.error('Urdu playback error:', err));
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

    if (this.currentPlayingAyah()?.numberInSurah === ayah.numberInSurah && this.audioPlayer.src) {
      this.audioPlayer.play().catch((err) => console.error('Audio play error:', err));
    } else {
      this.isPlayingUrduTrack = false;
      this.audioPlayer.src = ayah.audio;
      this.currentPlayingAyah.set(ayah);
      this.audioPlayer.load();
      this.audioPlayer.play().catch((err) => console.error('Audio load/play error:', err));
    }

    this.isAudioPlaying.set(true);
    this.isCardClicked.set(true);
  }

  toggleUrduRecitation(enabled: boolean): void {
    this.playUrduAudio.set(enabled);
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
    this.isAudioPlaying.set(false);
    this.isCardClicked.set(false);
  }

  private playNextAyah(): void {
    const current = this.currentPlayingAyah()?.numberInSurah;

    if (current !== null && current !== undefined && this.playingSurahAyahs.length > 0) {
      if (current < this.playingSurahAyahs.length) {
        this.playAudio(this.playingSurahAyahs[current]); // Next track index matches current numberInSurah
      } else {
        // End of the current Surah reached -> Auto-fetch and play next Surah globally
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
          // Continuous playback start
          this.playAudio(surahData.ayahs[0], surahData);

          // Emit event for UI components to sync their local state if currently mounted
          this.playNextSurah$.next(nextSurahNumber);
        } else {
          this.stopAudio();
        }
      },
      error: (err) => {
        console.error('Failed to load next Surah globally:', err);
        this.stopAudio();
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
      this.setVolume(this.previousVolume > 0 ? this.previousVolume : 0.7);
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
    this.audioPlayer.play().catch((err) => console.error('Replay error:', err));
    this.isAudioPlaying.set(true);
  }

  private loadUrduAudioSetting(): boolean {
    const saved = localStorage.getItem('quran_play_urdu_audio');
    return saved !== null ? JSON.parse(saved) : false;
  }
}
