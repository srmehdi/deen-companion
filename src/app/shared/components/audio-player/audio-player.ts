import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlayerService } from '../../../core/services/audio-player-service/audio-player-service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule],
  templateUrl: './audio-player.html',
  styleUrl: './audio-player.css',
})
export class AudioPlayer {
  public globalAudio = inject(AudioPlayerService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);

  navigateToCurrentAudio(): void {
    const playingSurah = this.globalAudio.playingSurahInfo();
    const activeAyah = this.globalAudio.currentPlayingAyah();

    if (!playingSurah || !activeAyah) return;

    this.router.navigate(['/quran']).then(() => {
      const scrollEvent = new CustomEvent('jumpToActiveAyah', {
        detail: {
          surahNumber: playingSurah.surahNumber,
          ayahNumber: activeAyah.numberInSurah,
        },
      });
      window.dispatchEvent(scrollEvent);
    });
  }

  updateVolume(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.globalAudio.setVolume(parseFloat(input.value));
  }

  seekTo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.globalAudio.seekTo(parseFloat(input.value));
  }

  confirmAudioPlayerClose(): void {
    this.confirmationService.confirm({
      key: 'closeAudioPrompt',
      message: `Are you sure you want to close the audio player?`,
      header: 'Close Audio Player',
      icon: 'pi pi-headphones text-[#18181B]! dark:text-[#FFFFFF]!',
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',
      acceptButtonStyleClass:
        'px-4! py-2! bg-red-700! hover:bg-red-800! text-white! border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',
      accept: () => {
        this.globalAudio.stopAudio();
      },
      reject: () => {},
    });
  }
  confirmUrduRecitation(event: Event): void {
    // Prevent parent click handlers from firing
    event.stopPropagation();

    // Determine current and intended target state using signal value
    const currentSignalState = this.globalAudio.playUrduAudio();
    const isEnabling = !currentSignalState;

    const header = isEnabling ? 'Enable Urdu Recitation' : 'Disable Urdu Recitation';
    const message = isEnabling
      ? `Urdu audio will play right after the Arabic recitation for each Ayah.<br>Are you sure you want to proceed?`
      : `Urdu audio will be turned off. Only Arabic recitation will play.<br>Are you sure you want to proceed?`;

    this.confirmationService.confirm({
      key: 'quranAudioPromptGlobal', // Make sure your p-confirmdialog key matches this or use closeAudioPrompt
      header: header,
      message: message,
      icon: 'pi pi-volume-up text-[#18181B]! dark:text-[#FFFFFF]!',
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',
      acceptButtonStyleClass:
        'px-4! py-2! bg-amber-600! hover:bg-amber-700! text-white! border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',
      accept: () => {
        // Toggle Urdu Audio signal & persist choice
        this.globalAudio.toggleUrduRecitation(isEnabling);

        // Replay current track with new audio setting if active
        if (this.globalAudio.currentPlayingAyah()) {
          this.globalAudio.replayCurrentAyah();
        }
      },
      reject: () => {
        // User cancelled; signals remain untouched
      },
    });
  }
  isAudioPlayerMinimized = signal(false);

  toggleMinimize() {
    this.isAudioPlayerMinimized.update((v) => !v);
  }
}
