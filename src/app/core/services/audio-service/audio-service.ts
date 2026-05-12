import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  audio = new Audio();
  isPlaying = signal(false);
  currentUrl = signal<string | null>(null);
  volume = signal<number>(0.7);
  private previousVolume = 0.7;
  constructor() {
    this.audio.volume = this.volume();
    this.audio.onended = () => this.isPlaying.set(false);
  }

  toggleAudio(url: string) {
    if (this.currentUrl() === url) {
      if (this.isPlaying()) {
        this.audio.pause();
        this.isPlaying.set(false);
      } else {
        this.audio.play();
        this.isPlaying.set(true);
      }
    } else {
      this.audio.src = url;
      this.audio.play();
      this.currentUrl.set(url);
      this.isPlaying.set(true);
    }

    if ('vibrate' in navigator) navigator.vibrate(10);
  }

  setVolume(value: number) {
    this.volume.set(value);
    this.audio.volume = value;
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
}
