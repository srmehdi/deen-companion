import { Component, computed, signal, ViewChild } from '@angular/core';
import { PremiumCard } from '../../../shared/components/premium-card/premium-card';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api-service/api-service';
import { forkJoin, Subject } from 'rxjs';
import { AudioService } from '../../../core/services/audio-service/audio-service';
import { OverflowCheck } from '../../../shared/directives/overflow-check/overflow-check';
import { ThemeService } from '../../../core/services/theme-service/theme-service';
import { StatusModal } from '../../../shared/modals/status-modal/status-modal';

@Component({
  selector: 'app-dashboard-page',
  imports: [PremiumCard, CommonModule, OverflowCheck, StatusModal],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  @ViewChild('modal') modal!: StatusModal;
  isCardClicked = signal(false);
  constructor(
    private api: ApiService,
    public audioService: AudioService,
    public theme: ThemeService,
  ) {
    this.audioService.audio.onended = () => {
      this.isCardClicked.set(false);
      this.audioService.isPlaying.set(false);
    };
  }

  currentTime = signal(new Date());
  ngOnInit() {
    setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
    setInterval(() => {
      if (this.prayer_times_data()) {
        this.getPrayerTimes(0);
      }
    }, 60000);
  }
  ngAfterViewInit() {
    this.getPrayerTimes(1);
    this.apiCalls();
  }
  darkMode = signal(true);

  prayers: any = [
    { key: 'fajr', name: 'Fajr' },
    { key: 'dhuhr', name: 'Dhuhr' },
    { key: 'asr', name: 'Asr' },
    { key: 'maghrib', name: 'Maghrib' },
    { key: 'isha', name: 'Isha' },
  ];

  currentPrayer = computed(() => this.prayer_times_data()?.current_status.current_prayer);
  nextPrayer = computed(() => this.prayer_times_data()?.current_status.next_prayer);

  isPrayerTimeLoading = signal(false);
  prayer_times_data = signal<any>(null);
  getPrayerTimes(PrayerTimeLoading: number) {
    PrayerTimeLoading === 1
      ? this.isPrayerTimeLoading.set(true)
      : this.isPrayerTimeLoading.set(false);
    // this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    navigator.geolocation.getCurrentPosition((pos) => {
      this.api.getPrayerTimes<any>(pos.coords.latitude, pos.coords.longitude).subscribe({
        next: (res) => {
          this.isPrayerTimeLoading.set(false);
          this.prayer_times_data.set(res.data);
          this.theme.applyPrayerTheme(res);
          // this.modal.close();
        },
        error: (err) => {
          console.log(err);
          this.modal.showError({ message: 'Something went wrong.' });
        },
        complete: () => {
          $destroyed.next();
          $destroyed.complete();
        },
      });
    });
  }
  todayHijriDate = signal<any>(null);
  getTodayHijriDate() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    this.api.getTodayHijriDate<any>().subscribe({
      next: (res) => {
        this.todayHijriDate.set(res.data);
        this.modal.close();
      },
      error: (err) => {
        console.log(err);
        this.modal.showError({ message: 'Something went wrong.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  hadithOfTheDay = signal<any>(null);
  getHadithOfTheDay() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    this.api.getHadithOfTheDay<any>('bukhari').subscribe({
      next: (res) => {
        this.hadithOfTheDay.set(res.data);
        this.modal.close();
      },
      error: (err) => {
        console.log(err);
        this.modal.showError({ message: 'Something went wrong.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  duaOfTheDay = signal<any>(null);
  getDuaOfTheDay() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    this.api.getDuaOfTheDay<any>().subscribe({
      next: (res) => {
        this.duaOfTheDay.set(res.data);
        this.modal.close();
      },
      error: (err) => {
        console.log(err);
        this.modal.showError({ message: 'Something went wrong.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  verseOfTheDay = signal<any>(null);
  getVerseOfTheDay() {
    this.modal.showLoading();
    const $destroyed: Subject<void> = new Subject();
    this.api.getVerseOfTheDay<any>().subscribe({
      next: (res) => {
        this.verseOfTheDay.set(res.data);
        this.modal.close();
      },
      error: (err) => {
        console.log(err);
        this.modal.showError({ message: 'Something went wrong.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  apiCalls() {
    this.modal.showLoading();
    const getTodayHijriDate = this.api.getTodayHijriDate<any>();
    const getHadithOfTheDay = this.api.getHadithOfTheDay<any>('bukhari');
    const getDuaOfTheDay = this.api.getDuaOfTheDay<any>();
    const getVerseOfTheDay = this.api.getVerseOfTheDay<any>();
    const $destroyed: Subject<void> = new Subject();
    forkJoin([getTodayHijriDate, getHadithOfTheDay, getDuaOfTheDay, getVerseOfTheDay]).subscribe({
      next: (res) => {
        if (res[0].success && res[1].success && res[2].success && res[3].success) {
          this.todayHijriDate.set(res[0].data);
          this.hadithOfTheDay.set(res[1].data);
          this.duaOfTheDay.set(res[2].data);
          this.verseOfTheDay.set(res[3].data);
          this.modal.close();
        } else if (!res[0].success) {
          this.modal.showError({ message: 'Error in todayHijriDate api' });
        } else if (!res[1].success) {
          this.modal.showError({ message: 'Error in hadithOfTheDay api' });
        } else if (!res[2].success) {
          this.modal.showError({ message: 'Error in duaOfTheDay api' });
        } else if (!res[3].success) {
          this.modal.showError({ message: 'Error in verseOfTheDay api' });
        }
      },
      error: (err) => {
        console.log(err);
        this.modal.showError({ message: 'Something went wrong.' });
      },
      complete: () => {
        $destroyed.next();
        $destroyed.complete();
      },
    });
  }
  updateVolume(event: Event) {
    const input = event.target as HTMLInputElement;
    this.audioService.setVolume(parseFloat(input.value));
  }

  expandedItems = signal<Set<number>>(new Set());
  needsReadMore = signal<Set<number>>(new Set());
  handleOverflow(id: number, isOverflowing: boolean) {
    this.needsReadMore.update((prev) => {
      const next = new Set(prev);
      if (isOverflowing) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  toggleExpand(id: number) {
    this.expandedItems.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if ('vibrate' in navigator) navigator.vibrate(5);
  }

  isExpanded(id: number): boolean {
    return this.expandedItems().has(id);
  }
}
