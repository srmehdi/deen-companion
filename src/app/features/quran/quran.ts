import {
  Component,
  computed,
  inject,
  signal,
  AfterViewInit,
  OnDestroy,
  effect,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ApiService } from '../../core/services/api-service/api-service';
import { AudioPlayerService } from '../../core/services/audio-player-service/audio-player-service';
import { StatusModalService } from '../../core/services/status-modal-service/status-modal-service';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { Bookmark } from '../../shared/utils/interface';

@Component({
  selector: 'app-quran',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogModule, ToastModule],
  templateUrl: './quran.html',
  styleUrl: './quran.css',
})
export class Quran implements AfterViewInit, OnDestroy {
  private modal = inject(StatusModalService);
  public globalAudio = inject(AudioPlayerService);
  private api = inject(ApiService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  private audioSubscription!: Subscription;
  private interactionTimeout: ReturnType<typeof setTimeout> | null = null;

  surahs = signal<any[]>([]);
  selectedSurah = signal<any>(null);
  searchQuery = signal<string>('');

  /// Update language signal type to support 'en' | 'ur' | 'hi'
  selectedLanguage = signal<'en' | 'ur' | 'hi'>(this.loadLanguage());

  private isUserInteracting = false;

  currentBookmark = signal<Bookmark | null>(this.loadBookmark());

  constructor() {
    // Auto-scrolls to the active ayah row when playing
    effect(() => {
      const activeAyah = this.globalAudio.currentPlayingAyah();
      const currentSurah = this.selectedSurah();

      if (
        !this.isUserInteracting &&
        activeAyah &&
        currentSurah &&
        this.globalAudio.playingSurahInfo()?.surahNumber === currentSurah.info.number
      ) {
        this.scrollToAyah(activeAyah.numberInSurah);
      }
    });
  }

  ngAfterViewInit(): void {
    this.loadSurahList();
    this.audioSubscription = this.globalAudio.playNextSurah$.subscribe((nextSurahNumber) => {
      this.loadSurahAndAutoPlay(nextSurahNumber);
    });
  }

  ngOnDestroy(): void {
    if (this.audioSubscription) {
      this.audioSubscription.unsubscribe();
    }
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }
  }

  @HostListener('window:wheel')
  @HostListener('window:touchmove')
  @HostListener('window:scroll')
  onUserInteraction(): void {
    this.isUserInteracting = true;

    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }

    this.interactionTimeout = setTimeout(() => {
      this.isUserInteracting = false;
    }, 5000);
  }

  setLanguage(lang: 'en' | 'ur' | 'hi'): void {
    this.selectedLanguage.set(lang);
    localStorage.setItem('translation_language', JSON.stringify(lang));
  }
  private loadLanguage(): 'en' | 'ur' | 'hi' {
    const saved = localStorage.getItem('translation_language');
    return saved ? JSON.parse(saved) : 'en';
  }
  loadSurahList(): void {
    this.modal.showLoading();
    this.api.getSurahList().subscribe({
      next: (data) => {
        this.surahs.set(data);
        this.modal.close();
      },
      error: (err) => {
        console.error('Failed to grab index mapping', err);
        this.modal.close();
      },
    });
  }

  loadSurah(number: number, targetAyahNumber?: number, isManualBookmarkJump = false): void {
    this.modal.showLoading();
    this.api.getSurahDetails(number).subscribe({
      next: (surahData) => {
        this.selectedSurah.set(surahData);
        this.modal.close();

        if (targetAyahNumber) {
          if (isManualBookmarkJump) {
            this.isUserInteracting = true;
            this.scrollToAyah(targetAyahNumber);
            setTimeout(() => (this.isUserInteracting = false), 1500);
          } else {
            this.scrollToAyah(targetAyahNumber);
          }
        } else {
          const activeAyah = this.globalAudio.currentPlayingAyah();
          const currentSurah = this.selectedSurah();
          if (
            activeAyah &&
            currentSurah &&
            this.globalAudio.playingSurahInfo()?.surahNumber === currentSurah.info.number
          ) {
            this.scrollToAyah(activeAyah.numberInSurah);
          } else {
            this.confirmAudioRecitation();
          }
        }
      },
      error: (err) => {
        console.error('Failed loading individual script metadata', err);
        this.modal.close();
      },
    });
  }

  loadSurahAndAutoPlay(number: number): void {
    this.modal.showLoading();
    this.api.getSurahDetails(number).subscribe({
      next: (surahData) => {
        this.selectedSurah.set(surahData);
        this.modal.close();

        if (surahData.ayahs && surahData.ayahs.length > 0) {
          this.scrollToAyah(1);
          this.globalAudio.playAudio(surahData.ayahs[0], surahData);
        }
      },
      error: (err) => {
        console.error('Failed loading auto-advanced script', err);
        this.modal.close();
      },
    });
  }

  @HostListener('window:jumpToActiveAyah', ['$event'])
  onJumpToActiveAyahRequested(event: any): void {
    const { surahNumber, ayahNumber } = event.detail;
    const currentSurah = this.selectedSurah();

    if (!currentSurah || currentSurah.info.number !== surahNumber) {
      this.modal.showLoading();
      this.api.getSurahDetails(surahNumber).subscribe({
        next: (surahData) => {
          this.selectedSurah.set(surahData);
          this.modal.close();
          this.scrollToAyah(ayahNumber);
        },
        error: () => this.modal.close(),
      });
    } else {
      this.scrollToAyah(ayahNumber);
    }
  }

  scrollToAyah(ayahNumber: number): void {
    setTimeout(() => {
      const element = document.getElementById(`ayah-row-${ayahNumber}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  resumeJourney(): void {
    const activeBookmark = this.currentBookmark();
    if (activeBookmark) {
      this.loadSurah(activeBookmark.surahNumber, activeBookmark.ayahNumber, true);
    }
  }

  resumeAudioJourney(): void {
    const progress = this.globalAudio.lastPlayedAudio();
    if (progress) {
      this.loadSurah(progress.surahNumber, progress.ayahNumber);
      setTimeout(() => {
        const targetSurah = this.selectedSurah();
        if (targetSurah && targetSurah.ayahs) {
          const targetAyah = targetSurah.ayahs.find(
            (a: any) => a.numberInSurah === progress.ayahNumber,
          );
          if (targetAyah && !this.globalAudio.isAudioPlaying()) {
            this.globalAudio.playAudio(targetAyah, targetSurah);
          }
        }
      }, 800);
    }
  }

  bookmarkAyah(ayah: any): void {
    const surah = this.selectedSurah();
    if (surah) {
      this.saveBookmark(surah.info.number, surah.info.englishName, ayah.numberInSurah);
    }
  }

  saveBookmark(surahNumber: number, surahName: string, ayahNumber: number): void {
    const bookmark: Bookmark = { surahNumber, surahName, ayahNumber };
    if (
      !(
        this.currentBookmark()?.surahNumber === surahNumber &&
        this.currentBookmark()?.ayahNumber === ayahNumber
      )
    ) {
      localStorage.setItem('quran_bookmark', JSON.stringify(bookmark));
      this.currentBookmark.set(bookmark);
      this.messageService.add({
        severity: 'success',
        summary: 'Bookmarked',
        detail: 'Ayah saved to your bookmark.',
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Already Bookmarked',
        detail: 'This Ayah is already in your bookmark.',
        life: 3000,
      });
    }
  }

  private loadBookmark(): Bookmark | null {
    const saved = localStorage.getItem('quran_bookmark');
    return saved ? JSON.parse(saved) : { surahNumber: 1, surahName: 'Al-Faatiha', ayahNumber: 1 };
  }

  toggleAyahAudio(ayah: any): void {
    this.globalAudio.toggleAyahAudio(ayah, this.selectedSurah());
  }

  closeReader(): void {
    this.selectedSurah.set(null);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  confirmAudioRecitation(): void {
    this.confirmationService.confirm({
      key: 'quranAudioPrompt',
      message: `Would you like to turn on the audio recitation for Surah <strong>${this.selectedSurah().info.englishName}</strong>?`,
      header: 'Audio Recitation',
      icon: 'pi pi-headphones text-[#18181B]! dark:text-[#FFFFFF]!',
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',
      acceptButtonStyleClass:
        'px-4! py-2! border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',
      accept: () => {
        this.toggleAyahAudio(this.selectedSurah().ayahs[0]);
      },
      reject: () => {},
    });
  }

  filteredSurahs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    return this.surahs().filter((surah) => {
      return (
        !query ||
        surah.number.toString().includes(query) ||
        surah.englishName.toLowerCase().includes(query) ||
        surah.englishNameTranslation.toLowerCase().includes(query)
      );
    });
  });

  // Clean Bismillah prefix safely across varying Unicode encodings
  cleanBismillah(text: string): string {
    return text.replace(
      /^(بِسْمِ\s*ٱللَّهِ\s*ٱلرَّحْمَٰنِ\s*ٱلرَّحِيمِ|بِسْمِ\s*اللَّهِ\s*الرَّحْمَٰنِ\s*الرَّحِيمِ)\s*/,
      '',
    );
  }
}
