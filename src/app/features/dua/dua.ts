import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PremiumCard } from '../../shared/components/premium-card/premium-card';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../core/services/api-service/api-service';
import { Subject } from 'rxjs';
import { StatusModal } from '../../shared/modals/status-modal/status-modal';

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
  imports: [CommonModule, FormsModule, ToastModule, StatusModal],
  templateUrl: './dua.html',
  styleUrl: './dua.css',
})
export class Dua {
  @ViewChild('modal') modal!: StatusModal;
  // State-tracking reactive signals
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('All');
  bookmarkedIds = signal<number[]>([]);
  private messageService = inject(MessageService);

  // Curated Islamic Supplications Repository Core
  duas = signal<DuaItem[]>([]);
  protected readonly Math = Math;
  ngAfterViewInit() {
    this.getDuaBookmarks();
    this.getAllDuas();
  }
  apiService = inject(ApiService);
  getAllDuas() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    this.apiService.getAllDuas<any>().subscribe({
      next: (response) => {
        console.log('dua response', response);

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
        console.log('getDuaBookmarkIds response', response);
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
    this.bookmarkedIds.update((current) =>
      current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
    );
    this.saveDuaBookmarks();
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
        console.log('saveDuaBookmarkIds response', response);
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
}
