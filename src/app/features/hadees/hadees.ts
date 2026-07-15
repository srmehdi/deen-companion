import { Component, computed, inject, signal, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api-service/api-service';
import { StatusModalService } from '../../core/services/status-modal-service/status-modal-service';

interface HadithCollection {
  key: string;
  name: string;
  arabic_name: string;
  author: string;
  reliability: string;
  total_hadiths: number;
}

interface HadithItem {
  id: string | number;
  hadithNumber: string | number;
  arabic: string;
  translation: string;
  reference: string;
  collectionName?: string;
}

@Component({
  selector: 'app-hadees',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, ConfirmDialogModule],
  templateUrl: './hadees.html',
  styleUrl: './hadees.css',
})
export class Hadees implements AfterViewInit {
  private modal = inject(StatusModalService);
  private messageService = inject(MessageService);
  apiService = inject(ApiService);

  collections = signal<HadithCollection[]>([]);
  selectedCollection = signal<any>(null);

  previousCollectionBeforeSearch = signal<any>(null);
  hadiths = signal<HadithItem[]>([]);
  allSearchHadiths = signal<HadithItem[]>([]);

  searchQuery = signal<string>('');
  numberSearchQuery = signal<string>('');
  isSearchingGlobally = signal<boolean>(false);
  isSearching = signal<boolean>(false);

  currentPage = signal<number>(1);
  pageSize = signal<number>(5);
  totalItems = signal<number>(0);
  totalPages = signal<number>(1);

  protected readonly Math = Math;
  currentBookmark = signal<any | null>(this.loadBookmark());
  constructor() {
    effect(() => {
      const query = this.searchQuery().trim();

      if (query.length >= 4) {
        if (!this.isSearchingGlobally()) {
          this.previousCollectionBeforeSearch.set(this.selectedCollection());
        }
        this.triggerGlobalSearch(query);
      } else if (query.length === 0 && this.isSearchingGlobally()) {
        this.restorePreviousState();
      }
    });

    effect(() => {
      const hadithNum = this.numberSearchQuery().trim();
      const activeCollection = this.selectedCollection();

      if (!activeCollection || activeCollection.info.key === 'search-results') return;

      if (hadithNum.length > 0) {
        this.isSearching.set(true);
        this.apiService.getHadithByNumber<any>(activeCollection.info.key, hadithNum).subscribe({
          next: (response) => {
            if (response && response.success && response.data) {
              const h = response.data;
              const info = activeCollection.info;

              this.currentPage.set(1);
              this.totalItems.set(1);
              this.totalPages.set(1);

              this.hadiths.set([
                {
                  id: h.id,
                  hadithNumber: h.hadithnumber,
                  arabic: h.arabic,
                  translation: h.english || '',
                  reference: h.grade
                    ? `Grade: ${h.grade}`
                    : `${info?.name || ''} Hadith ${h.hadithnumber}`,
                },
              ]);
            } else {
              this.hadiths.set([]);
              this.totalItems.set(0);
              this.totalPages.set(1);
            }
            this.isSearching.set(false);
          },
          error: (err) => {
            console.error('Numbered collection API request failed', err);
            this.hadiths.set([]);
            this.totalItems.set(0);
            this.totalPages.set(1);
            this.isSearching.set(false);
            this.messageService.add({
              severity: 'warn',
              summary: 'Not Found',
              detail: `Hadith No. ${hadithNum} could not be found in this collection.`,
              life: 3000,
            });
          },
        });
      } else {
        if (this.totalItems() === 0 || this.totalItems() === 1) {
          const activeCollectionKey = activeCollection.info.key;
          setTimeout(() => {
            if (this.selectedCollection() && this.numberSearchQuery().trim().length === 0) {
              this.loadCollectionDetails(activeCollectionKey, 1);
            }
          }, 0);
        }
      }
    });
  }

  ngAfterViewInit() {
    this.loadHadithCollections();
  }

  loadHadithCollections() {
    this.modal.showLoading();
    this.apiService.getHadithCollections<any>().subscribe({
      next: (response) => {
        this.collections.set(response?.data?.collections || []);
        this.modal.close();
      },
      error: (err) => {
        console.error('Failed loading collections mapping', err);
        this.modal.close();
      },
    });
  }

  loadCollectionDetails(
    collectionKey: string,
    targetPage: number = 1,
    targetHadithId?: string | number,
  ) {
    this.searchQuery.set('');
    this.numberSearchQuery.set('');
    this.isSearchingGlobally.set(false);
    this.isSearching.set(false);
    this.previousCollectionBeforeSearch.set(null);
    this.allSearchHadiths.set([]);

    this.modal.showLoading();
    this.apiService
      .getHadithsByCollection<any>(collectionKey, targetPage, this.pageSize())
      .subscribe({
        next: (response) => {
          const info = this.collections().find((c) => c.key === collectionKey);
          const dataWrapper = response?.data || {};
          const records = dataWrapper.hadiths || [];

          this.currentPage.set(dataWrapper.page || targetPage);
          this.totalItems.set(dataWrapper.total || 0);
          this.totalPages.set(dataWrapper.total_pages || 1);

          const mappedHadiths: HadithItem[] = records.map((h: any) => ({
            id: h.id,
            hadithNumber: h.hadithnumber,
            arabic: h.arabic,
            translation: h.english || '',
            reference: h.grade
              ? `Grade: ${h.grade}`
              : `${info?.name || ''} Hadith ${h.hadithnumber}`,
          }));

          this.hadiths.set(mappedHadiths);
          this.selectedCollection.set({
            info: info || {
              key: collectionKey,
              name: dataWrapper.collection_name || collectionKey,
            },
          });

          this.modal.close();

          if (targetHadithId) {
            this.scrollToHadith(targetHadithId);
          }
        },
        error: (err) => {
          console.error('Failed loading collection items', err);
          this.modal.close();
        },
      });
  }

  triggerGlobalSearch(queryText: string) {
    this.isSearching.set(true);
    this.apiService.searchHadiths<any>(queryText).subscribe({
      next: (response) => {
        const dataWrapper = response?.data || {};
        const records = dataWrapper.hadiths || [];

        this.isSearchingGlobally.set(true);
        this.currentPage.set(1);
        this.totalItems.set(records.length);
        this.totalPages.set(Math.ceil(records.length / this.pageSize()) || 1);

        const mappedHadiths: HadithItem[] = records.map((h: any) => ({
          id: h.id,
          hadithNumber: h.hadithnumber,
          arabic: h.arabic,
          translation: h.english || '',
          reference: h.grade
            ? `Grade: ${h.grade}`
            : `${h.collection_name} Hadith ${h.hadithnumber}`,
          collectionName: h.collection_name,
        }));

        this.allSearchHadiths.set(mappedHadiths);
        this.selectedCollection.set({
          info: { key: 'search-results', name: `Search Results`, arabic_name: 'نتائج البحث' },
        });
        this.isSearching.set(false);
      },
      error: (err) => {
        console.error('Global collection search failed', err);
        this.isSearching.set(false);
      },
    });
  }

  displayedHadiths = computed(() => {
    if (this.isSearchingGlobally()) {
      const startIndex = (this.currentPage() - 1) * this.pageSize();
      const endIndex = startIndex + this.pageSize();
      return this.allSearchHadiths().slice(startIndex, endIndex);
    }
    return this.hadiths();
  });

  restorePreviousState() {
    this.isSearchingGlobally.set(false);
    this.allSearchHadiths.set([]);
    const fallback = this.previousCollectionBeforeSearch();
    if (fallback && fallback.info && fallback.info.key !== 'search-results') {
      this.loadCollectionDetails(fallback.info.key, 1);
    } else {
      this.selectedCollection.set(null);
      this.hadiths.set([]);
    }
    this.previousCollectionBeforeSearch.set(null);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      if (this.isSearchingGlobally()) {
        this.currentPage.set(page);
      } else {
        const activeCollection = this.selectedCollection();
        if (activeCollection) {
          this.loadCollectionDetails(activeCollection.info.key, page);
        }
      }
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
  bookmarkHadith(hadith: HadithItem): void {
    if (this.isSearchingGlobally()) return;
    const current = this.selectedCollection();
    if (!current) return;

    const bookmark = {
      collectionKey: current.info.key,
      collectionName: current.info.name,
      hadithId: hadith.id,
      hadithNumber: hadith.hadithNumber,
      page: this.currentPage(),
    };

    localStorage.setItem('hadith_bookmark', JSON.stringify(bookmark));
    this.currentBookmark.set(bookmark);

    this.messageService.add({
      severity: 'success',
      summary: 'Bookmarked',
      detail: 'Hadith saved as last read.',
      life: 3000,
    });
  }

  resumeJourney(): void {
    const bookmark = this.currentBookmark();
    if (bookmark) {
      this.loadCollectionDetails(bookmark.collectionKey, bookmark.page || 1, bookmark.hadithId);
    }
  }

  private loadBookmark() {
    const saved = localStorage.getItem('hadith_bookmark');
    return saved ? JSON.parse(saved) : null;
  }

  scrollToHadith(hadithId: string | number): void {
    setTimeout(() => {
      const element = document.getElementById(`hadith-row-${hadithId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }

  copyToClipboard(hadith: HadithItem, event: MouseEvent): void {
    const current = this.selectedCollection();
    const titleText = hadith.collectionName || (current ? current.info.name : 'Hadith');
    const textToCopy = `[${titleText} - No. ${hadith.hadithNumber}]\n${hadith.arabic}\n${hadith.translation}\nReference: ${hadith.reference}`;

    const btn = event.currentTarget as HTMLElement;
    const icon = btn?.querySelector('.pi');

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Copied',
          detail: 'Hadith copied',
          life: 3000,
        });
        if (icon) {
          icon.classList.replace('pi-copy', 'pi-check');
          setTimeout(() => icon.classList.replace('pi-check', 'pi-copy'), 3000);
        }
      })
      .catch((err) => console.error(err));
  }

  closeReader(): void {
    this.searchQuery.set('');
    this.numberSearchQuery.set('');
    this.selectedCollection.set(null);
    this.hadiths.set([]);
    this.allSearchHadiths.set([]);
    this.isSearchingGlobally.set(false);
    this.isSearching.set(false);
    this.previousCollectionBeforeSearch.set(null);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  clearNumberSearch() {
    this.numberSearchQuery.set('');
  }
}
