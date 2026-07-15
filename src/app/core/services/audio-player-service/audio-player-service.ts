import { Injectable, signal, computed, effect } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  private audioPlayer = new Audio();

  // Global Signals for any component to read
  currentPlayingAyah = signal<any | null>(null);
  playingSurahInfo = signal<any>(null);
  isAudioPlaying = signal<boolean>(false);
  isCardClicked = signal<boolean>(false);
  volume = signal<number>(0.7);
  private previousVolume = 0.7;

  private playingSurahAyahs: any[] = [];

  lastPlayedAudio = signal<any>(this.loadAudioProgressFromStorage());
  constructor() {
    this.audioPlayer.volume = this.volume();
    this.audioPlayer.onended = () => {
      this.playNextAyah();
    };
    effect(() => {
      const activeAyah = this.currentPlayingAyah();
      const currentSurahInfo = this.playingSurahInfo(); // Ensure your service exposes this or structural equal metadata

      if (activeAyah && currentSurahInfo) {
        const audioProgress = {
          surahNumber: currentSurahInfo.surahNumber,
          surahName: currentSurahInfo.englishName || currentSurahInfo.surahName, // Cross-check mapping properties
          ayahNumber: activeAyah.numberInSurah,
        };

        localStorage.setItem('quran_audio_progress', JSON.stringify(audioProgress));
        this.lastPlayedAudio.set(audioProgress);
      }
    });
  }
  private loadAudioProgressFromStorage() {
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
      this.audioPlayer.play().catch((err) => console.error(err));
    } else {
      this.audioPlayer.src = ayah.audio;
      this.currentPlayingAyah.set(ayah);
      this.audioPlayer.load();
      this.audioPlayer.play().catch((err) => console.error(err));
    }

    this.isAudioPlaying.set(true);
    this.isCardClicked.set(true);
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

  public playNextSurah$ = new Subject<number>();
  private playNextAyah(): void {
    const current = this.currentPlayingAyah()?.numberInSurah;
    if (current !== null && current !== undefined && this.playingSurahAyahs.length > 0) {
      if (current < this.playingSurahAyahs.length) {
        this.playAudio(this.playingSurahAyahs[current]); // array index matches next track
      } else {
        // We reached the end of the current Surah ayahs array
        const currentSurahNumber = this.playingSurahInfo()?.surahNumber;
        if (currentSurahNumber && currentSurahNumber < 114) {
          this.playNextSurah$.next(currentSurahNumber + 1);
        } else {
          this.stopAudio();
        }
      }
    }
  }
  // private playNextAyah(): void {
  //   const current = this.currentPlayingAyah()?.numberInSurah;
  //   if (current !== null && current !== undefined && this.playingSurahAyahs.length > 0) {
  //     if (current < this.playingSurahAyahs.length) {
  //       this.playAudio(this.playingSurahAyahs[current]); // array index matches next track
  //     } else {
  //       this.stopAudio();
  //     }
  //   }
  // }

  setVolume(value: number) {
    this.volume.set(value);
    this.audioPlayer.volume = value;
  }

  toggleMute() {
    if (this.volume() > 0) {
      this.previousVolume = this.volume();
      this.setVolume(0);
    } else {
      this.setVolume(this.previousVolume > 0 ? this.previousVolume : 0.7);
    }
  }
}
