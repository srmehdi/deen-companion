import { Component, signal, ViewChild } from '@angular/core';
import { ApiService } from '../../core/services/api-service/api-service';
import { StatusModal } from '../../shared/modals/status-modal/status-modal';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../../core/services/audio-service/audio-service';

@Component({
  selector: 'app-quran',
  imports: [CommonModule, FormsModule, StatusModal],
  templateUrl: './quran.html',
  styleUrl: './quran.css',
})
export class Quran {
  @ViewChild('modal') modal!: StatusModal;

  constructor(
    private api: ApiService,
    public audioService: AudioService,
  ) {
    this.audioService.audio.onended = () => {
      this.isCardClicked.set(false);
      this.audioService.isPlaying.set(false);
    };
  }
  surahs = signal<any[]>([]);
  selectedSurah = signal<any>(null);
  currentPlayingAyah = signal<any | null>(null);
  isAudioPlaying = signal<boolean>(false);
  private audioPlayer = new Audio();

  ngOnInit(): void {
    // this.loadSurahList();
  }
  ngAfterViewInit() {
    this.loadSurahList();
  }
  loadSurahList() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    this.api.getSurahList().subscribe({
      next: (data) => {
        // Mutate via the signal setter API
        this.surahs.set(data);
        this.modal.close();
      },
      error: (err) => console.error('Failed to grab index mapping', err),
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
    this.audioPlayer.onended = () => {
      this.playNextAyah();
    };
  }
  loadSurah(number: number): void {
    this.modal.showLoading();
    this.stopAudio();
    const $destroyed: Subject<void> = new Subject();
    this.api.getSurahDetails(number).subscribe({
      next: (surahData) => {
        this.selectedSurah.set(surahData);
        this.modal.close();
      },
      error: (err) => console.error('Failed loading individual script metadata', err),
    });
  }

  toggleAyahAudio(ayah: any): void {
    if (this.currentPlayingAyah()?.numberInSurah === ayah.numberInSurah && this.isAudioPlaying()) {
      this.pauseAudio();
    } else {
      this.playAudio(ayah);
    }
  }

  playAudio(ayah: any): void {
    if (this.currentPlayingAyah()?.numberInSurah === ayah.numberInSurah) {
      this.audioPlayer.play();
    } else {
      this.audioPlayer.src = ayah.audio;
      this.currentPlayingAyah.set(ayah);
      this.audioPlayer.load();
      this.audioPlayer.play();
    }
    this.isAudioPlaying.set(true);
  }

  pauseAudio(): void {
    this.audioPlayer.pause();
    this.isAudioPlaying.set(false);
  }

  stopAudio(): void {
    this.audioPlayer.pause();
    this.currentPlayingAyah.set(null);
    this.isAudioPlaying.set(false);
  }

  playNextAyah(): void {
    const current = this.currentPlayingAyah()?.numberInSurah;
    const surah = this.selectedSurah();
    if (current !== null && surah) {
      const nextIndex = current; // numberInSurah is 1-indexed, meaning index is equal to current value
      if (nextIndex < surah.ayahs.length) {
        this.playAudio(surah.ayahs[nextIndex]);
      } else {
        this.stopAudio(); // Surah completed!
      }
    }
  }

  closeReader(): void {
    this.stopAudio();
    this.isCardClicked.set(false);
    this.selectedSurah.set(null);
  }

  ngOnDestroy(): void {
    this.closeReader();
  }
  isCardClicked = signal(false);

  volume = signal<number>(0.7);
  private previousVolume = 0.7;
  setVolume(value: number) {
    this.volume.set(value);
    this.audioPlayer.volume = value;
  }
  toggleMute() {
    if (this.volume() > 0) {
      this.previousVolume = this.volume();
      this.setVolume(0);
    } else {
      const restoreValue = this.previousVolume > 0 ? this.previousVolume : 0.7;
      this.setVolume(restoreValue);
    }
  }
  updateVolume(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setVolume(parseFloat(input.value));
  }
}
