import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiService } from '../../core/services/api-service/api-service';
import { StatusModalService } from '../../core/services/status-modal-service/status-modal-service';
import { HeaderStateService } from '../../core/services/header-state-service/header-state-service';
import { StickyHeaderWrapper } from '../../shared/components/sticky-header-wrapper/sticky-header-wrapper';

interface DuaItem {
  id: number;
  title: string;
  category: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
}

@Component({
  selector: 'app-dua',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, ConfirmDialogModule, StickyHeaderWrapper],
  templateUrl: './dua.html',
  styleUrl: './dua.css',
})
export class Dua {
  private modal = inject(StatusModalService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private headerState = inject(HeaderStateService);
  private confirmationService = inject(ConfirmationService);
  apiService = inject(ApiService);

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('All');
  showOnlyBookmarks = signal<boolean>(false);
  duas = signal<DuaItem[]>([]);
  bookmarkedIds = signal<number[]>(this.loadBookmarkedIds());

  currentPage = signal<number>(1);
  pageSize = signal<number>(5);
  highlightedDuaId = signal<number | null>(null);

  protected readonly Math = Math;

  ngAfterViewInit() {
    this.headerState.isHeaderHidden.set(false);
    this.headerState.enableAutoHide();
    this.getAllDuasAndBookmarkedIds();
  }

  getAllDuasAndBookmarkedIds() {
    this.modal.showLoading();
    this.apiService.getAllDuas<any>().subscribe({
      next: (response) => {
        const records = response?.data?.duas;
        if (records && records.length > 0) {
          const mappedList: DuaItem[] = records.map((apiDua: any) => ({
            id: apiDua.id,
            title: apiDua.title,
            category: apiDua.category_info?.name || apiDua.category || 'General',
            arabic: apiDua.arabic,
            transliteration: apiDua.transliteration,
            translation: apiDua.translation,
            reference: apiDua.source || 'Fortress of the Believer',
          }));
          this.duas.set(mappedList);
          this.modal.close();

          this.listenToDeepLink();
        }
      },
      error: (err) => {
        console.error('getAllDuas error', err);
        this.modal.showError({ message: 'Something went wrong. Please try again later.' });
      },
    });
  }

  private listenToDeepLink() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const targetDuaId = Number(params.get('duaId'));
      if (targetDuaId) {
        this.highlightedDuaId.set(targetDuaId);
        this.navigateToDua(targetDuaId);
      }
    });
  }

  private navigateToDua(duaId: number): void {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
    this.showOnlyBookmarks.set(false);

    const index = this.duas().findIndex((d) => d.id === duaId);
    if (index !== -1) {
      const targetPage = Math.floor(index / this.pageSize()) + 1;
      this.currentPage.set(targetPage);
      this.scrollToDua(duaId);
    }
  }

  scrollToDua(duaId: number): void {
    // Wait for DOM to finish rendering the target page
    setTimeout(() => {
      const element = document.getElementById(`dua-row-${duaId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => {
          if (this.highlightedDuaId() === duaId) {
            this.highlightedDuaId.set(null);
          }
        }, 6000);
      }
    }, 200);
  }

  private loadBookmarkedIds(): number[] {
    const saved = localStorage.getItem('dua_bookmarkedIds');
    return saved ? JSON.parse(saved) : [];
  }

  categories = computed(() => {
    const list = this.duas().map((d) => d.category);
    return ['All', ...Array.from(new Set(list))];
  });

  filteredDuas = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const onlySaved = this.showOnlyBookmarks();
    const savedIds = this.bookmarkedIds();

    return this.duas().filter((dua) => {
      const matchesSaved = !onlySaved || savedIds.includes(dua.id);
      const matchesCat = onlySaved || cat === 'All' || dua.category === cat;
      const matchesQuery =
        !query ||
        query.length < 3 ||
        (query.length >= 3 &&
          (dua.title.toLowerCase().includes(query) ||
            dua.translation.toLowerCase().includes(query) ||
            dua.transliteration.toLowerCase().includes(query)));

      return matchesSaved && matchesCat && matchesQuery;
    });
  });

  paginatedDuas = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredDuas().slice(startIndex, endIndex);
  });

  totalPages = computed(() => {
    const pages = Math.ceil(this.filteredDuas().length / this.pageSize());
    return pages > 0 ? pages : 1;
  });

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
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
    }, 100);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  toggleBookmark(id: number): void {
    if (this.bookmarkedIds().includes(id)) {
      this.confirmBookmarkRemove(id);
    } else {
      this.bookmarkedIds.update((current) =>
        current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
      );
      localStorage.setItem('dua_bookmarkedIds', JSON.stringify(this.bookmarkedIds()));
      this.messageService.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Supplication saved successfully',
        life: 3000,
      });
    }
  }

  copyToClipboard(dua: DuaItem, event: MouseEvent): void {
    const textToCopy = `[${dua.title}]\n${dua.arabic}\n${dua.transliteration}\n${dua.translation}\nReference: ${dua.reference}`;
    const btn = event.currentTarget as HTMLElement;
    const icon = btn?.querySelector('.pi');

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Copied',
          detail: 'Supplication copied to clipboard',
          life: 3000,
        });

        if (icon) {
          icon.classList.remove('pi-copy');
          icon.classList.add('pi-check');
          setTimeout(() => {
            icon.classList.remove('pi-check');
            icon.classList.add('pi-copy');
          }, 3000);
        }
      })
      .catch((err) => console.error('Could not copy text: ', err));
  }

  confirmBookmarkRemove(id: number) {
    this.confirmationService.confirm({
      key: 'bookmarkRemovePrompt',
      message: `Are you sure you want to unbookmark this supplication?`,
      header: 'Remove Bookmark',
      icon: 'pi pi-exclamation-triangle text-amber-500! dark:text-[#dfb76c]!',
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',
      acceptButtonStyleClass:
        'px-4! py-2! bg-red-700! hover:bg-red-800! text-white! border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',
      accept: () => {
        this.bookmarkedIds.update((current) =>
          current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
        );
        localStorage.setItem('dua_bookmarkedIds', JSON.stringify(this.bookmarkedIds()));
      },
      reject: () => {},
    });
  }

  ngOnDestroy(): void {
    this.headerState.disableAutoHide();
  }
}
