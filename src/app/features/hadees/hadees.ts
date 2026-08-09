import { Component, computed, inject, signal, effect, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, asapScheduler } from 'rxjs';
import { auditTime, map } from 'rxjs/operators';
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
export class Hadees implements OnInit {
  private modal = inject(StatusModalService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
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

  private lastFetchKey = '';

  constructor() {
    // auditTime(0, asapScheduler) collapse split micro-tick emissions from paramMap & queryParamMap during route transitions
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        auditTime(0, asapScheduler),
        map(([params, queryParams]) => {
          const collectionKey = params.get('collectionKey');
          const targetPage = Number(queryParams.get('page')) || 1;
          const targetHadithId = queryParams.get('hadithId') || undefined;
          return { collectionKey, targetPage, targetHadithId };
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ collectionKey, targetPage, targetHadithId }) => {
        if (collectionKey) {
          const fetchKey = `${collectionKey}_${targetPage}_${targetHadithId || ''}`;
          if (this.lastFetchKey !== fetchKey) {
            this.loadCollectionDetails(collectionKey, targetPage, targetHadithId);
          }
        } else if (!this.isSearchingGlobally()) {
          this.lastFetchKey = '';
          this.selectedCollection.set(null);
          this.hadiths.set([]);
        }
      });

    // Global text search effect
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

    // Precise number search effect
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
      }
    });
  }

  ngOnInit() {
    const cachedCollections = localStorage.getItem('collections');
    if (!cachedCollections || cachedCollections.length === 0) {
      this.loadHadithCollections();
    } else {
      this.collections.set(JSON.parse(cachedCollections));
    }
  }

  loadHadithCollections() {
    this.modal.showLoading();
    this.apiService.getHadithCollections<any>().subscribe({
      next: (response) => {
        const collectionsList = response?.data?.collections || [];
        this.collections.set(collectionsList);
        localStorage.setItem('collections', JSON.stringify(collectionsList));
        this.modal.close();
      },
      error: (err) => {
        console.error('Failed loading collections mapping', err);
        this.modal.close();
      },
    });
  }

  navigateToCollection(collectionKey: string, page: number = 1, hadithId?: string | number) {
    const queryParams: Record<string, any> = {};
    if (page > 1) queryParams['page'] = page;
    if (hadithId) queryParams['hadithId'] = hadithId;

    // this.router.navigate(['/hadees', collectionKey], { queryParams });
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/hadees', collectionKey], { queryParams });
    });
  }

  loadCollectionDetails(
    collectionKey: string,
    targetPage: number = 1,
    targetHadithId?: string | number,
  ) {
    this.lastFetchKey = `${collectionKey}_${targetPage}_${targetHadithId || ''}`;
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
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
      this.navigateToCollection(fallback.info.key);
    } else {
      this.closeReader();
    }
    this.previousCollectionBeforeSearch.set(null);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      if (this.isSearchingGlobally()) {
        this.currentPage.set(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const activeCollection = this.selectedCollection();
        if (activeCollection) {
          this.navigateToCollection(activeCollection.info.key, page);
        }
      }
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
      this.navigateToCollection(bookmark.collectionKey, bookmark.page || 1, bookmark.hadithId);
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
        this.scrollToActiveHadithPageButton();
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  scrollToActiveHadithPageButton(): void {
    const activeBtn = document.querySelector('.page-btn-active');
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
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
    this.lastFetchKey = '';
    this.searchQuery.set('');
    this.numberSearchQuery.set('');
    this.selectedCollection.set(null);
    this.hadiths.set([]);
    this.allSearchHadiths.set([]);
    this.isSearchingGlobally.set(false);
    this.isSearching.set(false);
    this.previousCollectionBeforeSearch.set(null);

    this.router.navigate(['/hadees']);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  clearNumberSearch() {
    const activeCollection = this.selectedCollection();
    this.numberSearchQuery.set('');
    if (activeCollection) {
      this.loadCollectionDetails(activeCollection.info.key, this.currentPage());
    }
  }
}
