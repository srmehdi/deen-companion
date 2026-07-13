import {
  Component,
  computed,
  inject,
  signal,
  ViewChild,
  AfterViewInit,
  effect,
  HostListener,
} from '@angular/core';
import { ApiService } from '../../core/services/api-service/api-service';
import { StatusModal } from '../../shared/modals/status-modal/status-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioPlayerService } from '../../core/services/audio-player-service/audio-player-service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Bookmark } from '../../shared/utils/interface';
import { ToastModule } from 'primeng/toast';
import { StatusModalService } from '../../core/services/status-modal-service/status-modal-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quran',
  imports: [CommonModule, FormsModule, ConfirmDialogModule, ToastModule],
  templateUrl: './quran.html',
  styleUrl: './quran.css',
})
export class Quran implements AfterViewInit {
  private modal = inject(StatusModalService);
  // Inject the global player service
  public globalAudio = inject(AudioPlayerService);
  private api = inject(ApiService);
  private confirmationService = inject(ConfirmationService);
  // Track subscription to prevent memory leaks
  private audioSubscription!: Subscription;

  surahs = signal<any[]>([]);
  selectedSurah = signal<any>(null);
  searchQuery = signal<string>('');
  constructor() {
    // Reactive effect that auto-scrolls to the active ayah row whenever it changes
    effect(() => {
      const activeAyah = this.globalAudio.currentPlayingAyah();
      const currentSurah = this.selectedSurah();

      // Ensure we only scroll if the active Ayah belongs to the currently displayed Surah
      if (
        activeAyah &&
        currentSurah &&
        this.globalAudio.playingSurahInfo()?.surahNumber === currentSurah.info.number
      ) {
        this.scrollToAyah(activeAyah.numberInSurah);
      }
    });
  }

  ngAfterViewInit() {
    this.loadSurahList();
    // Listen to next Surah actions triggered by the background audio service
    this.audioSubscription = this.globalAudio.playNextSurah$.subscribe((nextSurahNumber) => {
      this.loadSurahAndAutoPlay(nextSurahNumber);
    });
  }
  // A variant helper to fetch the next Surah and immediately begin the first track
  loadSurahAndAutoPlay(number: number): void {
    this.modal.showLoading();
    this.api.getSurahDetails(number).subscribe({
      next: (surahData) => {
        this.selectedSurah.set(surahData);
        this.modal.close();

        // Directly trigger the first Ayah audio stream rather than displaying the prompt modal
        if (surahData.ayahs && surahData.ayahs.length > 0) {
          this.scrollToAyah(1);
          this.globalAudio.playAudio(surahData.ayahs[0], surahData);
        }
      },
      error: (err) => console.error('Failed loading auto-advanced script', err),
    });
  }
  loadSurahList() {
    this.modal.showLoading();
    this.api.getSurahList().subscribe({
      next: (data) => {
        this.surahs.set(data);
        this.modal.close();
      },
      error: (err) => console.error('Failed to grab index mapping', err),
    });
  }
  loadSurah(number: number, targetAyahNumber?: number): void {
    this.modal.showLoading();
    this.api.getSurahDetails(number).subscribe({
      next: (surahData) => {
        this.selectedSurah.set(surahData);
        this.modal.close();
        if (targetAyahNumber) {
          this.scrollToAyah(targetAyahNumber);
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
          // this.confirmAudioRecitation();
        }
      },
      error: (err) => console.error('Failed loading individual script metadata', err),
    });
  }

  @HostListener('window:jumpToActiveAyah', ['$event'])
  onJumpToActiveAyahRequested(event: any) {
    const { surahNumber, ayahNumber } = event.detail;
    const currentSurah = this.selectedSurah();

    if (!currentSurah || currentSurah.info.number !== surahNumber) {
      this.modal.showLoading();
      this.api.getSurahDetails(surahNumber).subscribe({
        next: (surahData) => {
          this.selectedSurah.set(surahData);
          this.modal.close();
          // Force scroll target calculation update context smoothly
          this.scrollToAyah(ayahNumber);
        },
        error: (err) => this.modal.close(),
      });
    } else {
      this.scrollToAyah(ayahNumber);
    }
  }
  scrollToAyah(ayahNumber: number): void {
    setTimeout(() => {
      const element = document.getElementById(`ayah-row-${ayahNumber}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  bookmarkAyah(ayah: any): void {
    const surah = this.selectedSurah();
    if (surah) {
      this.saveBookmark(surah.info.number, surah.info.englishName, ayah.numberInSurah);
    }
  }

  resumeJourney(): void {
    const activeBookmark = this.currentBookmark();
    if (activeBookmark) {
      this.loadSurah(activeBookmark.surahNumber, activeBookmark.ayahNumber);
    }
  }

  private messageService = inject(MessageService);
  currentBookmark = signal<Bookmark | null>(this.loadBookmark());

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

  clearSearch() {
    this.searchQuery.set('');
  }

  confirmAudioRecitation() {
    this.confirmationService.confirm({
      key: 'quranAudioPrompt',
      message: `Would you like to turn on the audio recitation for Surah <strong>${this.selectedSurah().info.englishName}</strong>?`,
      header: 'Audio Recitation',
      icon: 'pi pi-headphones text-[#18181B]! dark:text-[#FFFFFF]!',
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',

      acceptButtonStyleClass:
        'px-4! py-2!  border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',

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
}
