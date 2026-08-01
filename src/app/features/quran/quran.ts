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
import { UserInteractionService } from '../../core/services/user-interaction-service/user-interaction.service';

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
  // private interactionTimeout: ReturnType<typeof setTimeout> | null = null;
  public userInteraction = inject(UserInteractionService);

  surahs = signal<any[]>([]);
  selectedSurah = signal<any>(null);
  searchQuery = signal<string>('');

  /// Update language signal type to support 'en' | 'ur' | 'hi'
  selectedLanguage = signal<'en' | 'ur' | 'hi'>(this.loadLanguage());

  // private isUserInteracting = false;

  currentBookmark = signal<Bookmark | null>(this.loadBookmark());

  constructor() {
    effect(() => {
      const activeAyah = this.globalAudio.currentPlayingAyah();
      const currentSurah = this.selectedSurah();

      if (
        activeAyah &&
        currentSurah &&
        this.globalAudio.playingSurahInfo()?.surahNumber === currentSurah.info.number
      ) {
        // Ensure the page containing the active ayah is visible
        // this.setPageForAyah(activeAyah.numberInSurah);

        const targetAyahNumber = activeAyah.numberInSurah;
        const targetPage = Math.ceil(targetAyahNumber / this.ayahPageSize());
        // if (this.currentAyahPage() !== targetPage) {
        // this.currentAyahPage.set(targetPage);
        // }
        if (!this.userInteraction.isInteracting()) {
          this.currentAyahPage.set(targetPage);
          this.scrollToAyah(activeAyah.numberInSurah);
        }
      }
    });
  }
  ngAfterViewInit(): void {
    this.loadSurahList();

    this.audioSubscription = this.globalAudio.playNextSurah$.subscribe((nextSurahNumber) => {
      // Sync the UI view with the newly active Surah playing in the background
      const currentPlayingSurahInfo = this.globalAudio.playingSurahInfo();

      if (currentPlayingSurahInfo?.surahNumber === nextSurahNumber) {
        // Load details for view synchronization without triggering re-play
        this.loadSurahForViewOnly(nextSurahNumber);
      }
    });
  }
  private loadSurahForViewOnly(surahNumber: number): void {
    this.api.getSurahDetails(surahNumber).subscribe({
      next: (surahData) => {
        // this.selectedSurah.set(surahData);
        if (!this.userInteraction.isInteracting()) {
          this.selectedSurah.set(surahData);
          this.currentAyahPage.set(1);
          this.scrollToAyah(1);
        }
      },
      error: (err) => {
        console.error('Failed updating view state for next Surah:', err);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.audioSubscription) {
      this.audioSubscription.unsubscribe();
    }
    // if (this.interactionTimeout) {
    //   clearTimeout(this.interactionTimeout);
    // }
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
          this.setPageForAyah(targetAyahNumber);
          if (isManualBookmarkJump) {
            this.userInteraction.isInteracting.set(true);
            this.scrollToAyah(targetAyahNumber);
            // setTimeout(() => this.userInteraction.isInteracting.set(false), 1500);
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
            this.setPageForAyah(activeAyah.numberInSurah);
            this.scrollToAyah(activeAyah.numberInSurah);
          } else {
            this.currentAyahPage.set(1);
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
        this.currentAyahPage.set(1);
        this.modal.close();

        if (surahData.ayahs && surahData.ayahs.length > 0) {
          this.scrollToAyah(1);
          // Pass complete surahData object to initialize global sequence
          this.globalAudio.playAudio(surahData.ayahs[0], surahData);
        }
      },
      error: (err) => {
        console.error('Failed loading auto-advanced script:', err);
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
          this.setPageForAyah(ayahNumber);
          this.modal.close();
          this.scrollToAyah(ayahNumber);
        },
        error: () => this.modal.close(),
      });
    } else {
      this.setPageForAyah(ayahNumber);
      this.scrollToAyah(ayahNumber);
    }
  }

  closeReader(): void {
    this.selectedSurah.set(null);
    this.currentAyahPage.set(1);
  }

  scrollToAyah(ayahNumber: number): void {
    setTimeout(() => {
      const element = document.getElementById(`ayah-row-${ayahNumber}`);
      if (element) {
        this.scrollToActiveAyahPageButton();
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
    return saved ? JSON.parse(saved) : null;
  }

  toggleAyahAudio(ayah: any): void {
    this.globalAudio.toggleAyahAudio(ayah, this.selectedSurah());
  }
  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
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
  confirmUrduRecitation(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const isEnabling = checkbox.checked;

    // Temporarily revert the checkbox visual state until the user confirms
    checkbox.checked = !isEnabling;

    const header = isEnabling ? 'Enable Urdu Recitation' : 'Disable Urdu Recitation';

    const message = isEnabling
      ? `The Urdu recitation will play after the Arabic recitation for each Ayah.<br> Are you sure you want to proceed?`
      : `Urdu recitation will be turned off. Only Arabic recitation will play.<br> Are you sure you want to proceed?`;

    this.confirmationService.confirm({
      key: 'quranAudioPrompt',
      header: header,
      message: message,
      icon: 'pi pi-volume-up text-[#18181B]! dark:text-[#FFFFFF]!',
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',
      acceptButtonStyleClass:
        'px-4! py-2! border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',
      accept: () => {
        // Set the intended state on accept
        checkbox.checked = isEnabling;
        this.globalAudio.playUrduAudio.set(isEnabling);
        localStorage.setItem(
          'quran_play_urdu_audio',
          JSON.stringify(this.globalAudio.playUrduAudio()),
        );
        if (this.globalAudio.currentPlayingAyah()) {
          this.globalAudio.replayCurrentAyah();
        }
        // else if (this.selectedSurah()?.ayahs?.length > 0) {
        //   this.globalAudio.playAudio(this.selectedSurah().ayahs[0], this.selectedSurah());
        // }
      },
      reject: () => {
        // Revert back to the original state on reject
        checkbox.checked = !isEnabling;
      },
    });
  }

  // Add Math reference for template usage
  protected readonly Math = Math;

  // Pagination state signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(9);

  // Sliced Surah list for active page boundary
  paginatedSurahs = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredSurahs().slice(startIndex, endIndex);
  });

  // Calculate total dynamic page count
  totalPages = computed(() => {
    const pages = Math.ceil(this.filteredSurahs().length / this.pageSize());
    return pages > 0 ? pages : 1;
  });

  // Navigation trigger
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.scrollToActivePageButton();
    }
  }

  scrollToActivePageButton(): void {
    setTimeout(() => {
      const activeBtn = document.querySelector('.page-btn-active');
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }, 150);
  }
  // Ayah Pagination State Signals
  currentAyahPage = signal<number>(1);
  ayahPageSize = signal<number>(10);

  // Dynamic slice for current Surah ayahs
  paginatedAyahs = computed(() => {
    const surah = this.selectedSurah();
    if (!surah || !surah.ayahs) return [];
    const startIndex = (this.currentAyahPage() - 1) * this.ayahPageSize();
    const endIndex = startIndex + this.ayahPageSize();
    return surah.ayahs.slice(startIndex, endIndex);
  });

  // Calculate total Ayah pages
  totalAyahPages = computed(() => {
    const surah = this.selectedSurah();
    if (!surah || !surah.ayahs) return 1;
    const pages = Math.ceil(surah.ayahs.length / this.ayahPageSize());
    return pages > 0 ? pages : 1;
  });

  // Navigate Ayah pages manually
  changeAyahPage(page: number): void {
    if (page >= 1 && page <= this.totalAyahPages()) {
      this.currentAyahPage.set(page);
      this.userInteraction.isInteracting.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.scrollToActiveAyahPageButton();
      // setTimeout(() => {
      //   this.userInteraction.isInteracting.set(false);
      // }, 1500);
    }
  }

  scrollToActiveAyahPageButton(): void {
    // setTimeout(() => {
    const activeBtn = document.querySelector('.ayah-page-btn-active');
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
    // }, 150);
  }

  // Helper to resolve & switch to the page containing a given Ayah number
  private setPageForAyah(ayahNumber: number): void {
    const targetPage = Math.ceil(ayahNumber / this.ayahPageSize());
    this.currentAyahPage.set(targetPage);
  }
}
