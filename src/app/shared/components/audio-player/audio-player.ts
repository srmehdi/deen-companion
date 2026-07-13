import { Component, inject } from '@angular/core';
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

  navigateToCurrentAudio(): void {
    const playingSurah = this.globalAudio.playingSurahInfo();
    const activeAyah = this.globalAudio.currentPlayingAyah();

    if (!playingSurah || !activeAyah) return;

    // Direct user to the Quran workspace context view layout route
    this.router.navigate(['/quran']).then(() => {
      // Dispatch custom window targeting dispatch hook to perform element scrolling adjustments
      const scrollEvent = new CustomEvent('jumpToActiveAyah', {
        detail: {
          surahNumber: playingSurah.surahNumber,
          ayahNumber: activeAyah.numberInSurah,
        },
      });
      window.dispatchEvent(scrollEvent);
    });
  }
  updateVolume(event: Event) {
    const input = event.target as HTMLInputElement;
    this.globalAudio.setVolume(parseFloat(input.value));
  }
  private confirmationService = inject(ConfirmationService);
  confirmAudioPlayerClose() {
    this.confirmationService.confirm({
      key: 'closeAudioPrompt',
      message: `Are you sure you want to close the audio player?`,
      header: 'Close Audio Player',
      icon: 'pi pi-headphones text-[#18181B]! dark:text-[#FFFFFF]!',

      // Applied ! (important) to override PrimeNG's structural and skin properties
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
}
