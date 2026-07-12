import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PremiumCard } from '../../shared/components/premium-card/premium-card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../core/services/api-service/api-service';
import { forkJoin, Subject } from 'rxjs';
import { StatusModal } from '../../shared/modals/status-modal/status-modal';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

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
  imports: [CommonModule, FormsModule, ToastModule, StatusModal, ConfirmDialogModule],
  templateUrl: './dua.html',
  styleUrl: './dua.css',
})
export class Dua {
  @ViewChild('modal') modal!: StatusModal;
  // State-tracking reactive signals
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('All');
  // bookmarkedIds = signal<number[]>([]);
  private messageService = inject(MessageService);

  // Curated Islamic Supplications Repository Core
  duas = signal<DuaItem[]>([]);
  protected readonly Math = Math;
  ngAfterViewInit() {
    // this.getDuaBookmarks();
    // this.getAllDuas();
    this.getAllDuasAndBookmarkedIds();
  }

  bookmarkedIds = signal<any | null>(this.loadBookmarkedIds());
  apiService = inject(ApiService);

  getAllDuasAndBookmarkedIds() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    const duaBookmarkedPayload = {
      visitorId: localStorage.getItem('visitor_id'),
    };
    const allDuasService = this.apiService.getAllDuas<any>();
    // const duaBookmarksService = this.apiService.getDuaBookmarkIds(duaBookmarkedPayload);
    forkJoin([allDuasService]).subscribe({
      next: (response) => {
        const records = response[0].data.duas;
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
          // this.bookmarkedIds.set(response[1].data.length > 0 ? response[1].data : []);
          this.modal.close();
        }
      },
      error: (err) => {
        console.error('getAllDuas error', err);
        this.modal.showError({ message: 'Something went wrong. Please try again later.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  private loadBookmarkedIds(): any | null {
    const saved = localStorage.getItem('dua_bookmarkedIds');
    return saved ? JSON.parse(saved) : [];
  }
  getAllDuas() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    this.apiService.getAllDuas<any>().subscribe({
      next: (response) => {
        const records = response.data.duas;

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
          // this.getDuaBookmarks();
        }
      },
      error: (err) => {
        console.error('getAllDuas error', err);
        this.modal.showError({ message: 'Something went wrong. Please try again later.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  getDuaBookmarks(): void {
    // this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    const payload = {
      visitorId: localStorage.getItem('visitor_id'),
    };
    this.apiService.getDuaBookmarkIds(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.bookmarkedIds.set(response.data.length > 0 ? response.data : []);
          // this.modal.close();
        } else {
          this.modal.showError({ message: 'Something went wrong. Please try again later.' });
        }
      },
      error: (err) => {
        console.error('saveDuaBookmarkIds error', err);
        this.modal.showError({ message: 'Something went wrong. Please try again later.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  // Category extraction computed array
  categories = computed(() => {
    const list = this.duas().map((d) => d.category);
    return ['All', ...Array.from(new Set(list))];
  });
  // State holder tracking if user clicked the Saved badge link layout filter
  showOnlyBookmarks = signal<boolean>(false);

  // Updated compound filtration pipeline
  filteredDuas = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const onlySaved = this.showOnlyBookmarks();
    const savedIds = this.bookmarkedIds();

    return this.duas().filter((dua) => {
      // Intercept item row processing to match the active bookmark state
      const matchesSaved = !onlySaved || savedIds.includes(dua.id);
      const matchesCat = onlySaved || cat === 'All' || dua.category === cat;
      const matchesQuery =
        !query ||
        dua.title.toLowerCase().includes(query) ||
        dua.translation.toLowerCase().includes(query) ||
        dua.transliteration.toLowerCase().includes(query);

      return matchesSaved && matchesCat && matchesQuery;
    });
  });

  // Bookmark state management toggler
  toggleBookmark(id: number): void {
    if (this.bookmarkedIds()?.includes(id)) {
      this.confirmBookmarkRemove(id);
    } else {
      this.bookmarkedIds.update((current) =>
        current.includes(id) ? current.filter((i: any) => i !== id) : [...current, id],
      );
      // this.saveDuaBookmarks();
      localStorage.setItem('dua_bookmarkedIds', JSON.stringify(this.bookmarkedIds()));
      this.messageService.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Supplication saved successfully',
        life: 3000,
      });
    }
    // this.bookmarkedIds.update((current) =>
    //   current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
    // );
    // this.saveDuaBookmarks();
  }
  saveDuaBookmarks(): void {
    // this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    const payload = {
      visitorId: localStorage.getItem('visitor_id'),
      bookmarkIds: this.bookmarkedIds(),
    };
    this.apiService.saveDuaBookmarkIds(payload).subscribe({
      next: (response) => {
        if (response.success) {
          // this.modal.close();
        } else {
          this.modal.showError({ message: 'Something went wrong. Please try again later.' });
        }
      },
      error: (err) => {
        console.error('saveDuaBookmarkIds error', err);
        this.modal.showError({ message: 'Something went wrong. Please try again later.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }

  copyToClipboard(dua: DuaItem, event: MouseEvent): void {
    const textToCopy = `[${dua.title}]\n${dua.arabic}\n${dua.transliteration}\n${dua.translation}\nReference: ${dua.reference}`;

    const btn = event.currentTarget as HTMLElement;
    const icon = btn?.querySelector('.pi');

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        // Fire a premium, non-blocking toast overlay notification
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
      .catch((err) => {
        console.error('Could not copy text supplication to clipboard context: ', err);
      });
  }
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);
  // Slice results specifically targeted for the active view page boundary segment
  paginatedDuas = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    return this.filteredDuas().slice(startIndex, endIndex);
  });

  // Calculate total dynamic page capacities
  totalPages = computed(() => {
    const pages = Math.ceil(this.filteredDuas().length / this.pageSize());
    return pages > 0 ? pages : 1;
  });

  // Navigation triggers
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      // Premium smooth behavior scroll repositioning matching reader transitions
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  private confirmationService = inject(ConfirmationService);
  confirmBookmarkRemove(id: number) {
    this.confirmationService.confirm({
      key: 'bookmarkRemovePrompt',
      message: `Are you sure you want to unbookmark this supplication?`,
      header: 'Remove Bookmark',
      icon: 'pi pi-exclamation-triangle text-amber-500! dark:text-[#dfb76c]!',

      // Applied ! (important) to override PrimeNG's structural and skin properties
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',

      acceptButtonStyleClass:
        'px-4! py-2! bg-red-700! hover:bg-red-800! text-white! border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',

      accept: () => {
        this.bookmarkedIds.update((current) =>
          current.includes(id) ? current.filter((i: any) => i !== id) : [...current, id],
        );
        // this.saveDuaBookmarks();
        localStorage.setItem('dua_bookmarkedIds', JSON.stringify(this.bookmarkedIds()));
      },
      reject: () => {},
    });
  }
}
