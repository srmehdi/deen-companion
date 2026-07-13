import { Component, computed, DOCUMENT, inject, Inject, signal, ViewChild } from '@angular/core';
import { PremiumCard } from '../../../shared/components/premium-card/premium-card';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api-service/api-service';
import { debounceTime, distinctUntilChanged, forkJoin, Subject, switchMap } from 'rxjs';
import { AudioService } from '../../../core/services/audio-service/audio-service';
import { OverflowCheck } from '../../../shared/directives/overflow-check/overflow-check';
import { ThemeService } from '../../../core/services/theme-service/theme-service';
import { StatusModal } from '../../../shared/modals/status-modal/status-modal';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../../core/services/activity/activity';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AudioPlayerService } from '../../../core/services/audio-player-service/audio-player-service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { StatusModalService } from '../../../core/services/status-modal-service/status-modal-service';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    PremiumCard,
    CommonModule,
    OverflowCheck,
    FormsModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css',
})
export class DashboardPage {
  private modal = inject(StatusModalService);
  isCardClicked = signal(false);
  constructor(
    private api: ApiService,
    public audioService: AudioService,
    public theme: ThemeService,
    @Inject(DOCUMENT) private document: Document,
    private activity: Activity,
  ) {
    this.audioService.audio.onended = () => {
      this.isCardClicked.set(false);
      this.audioService.isPlaying.set(false);
    };

    // setInterval(() => {
    //   this.currentTime.set(new Date());
    // }, 1000);
    // setInterval(() => {
    //   if (this.prayer_times_data()) {
    //     if (localStorage.getItem('user-lat') && localStorage.getItem('user-lng')) {
    //       this.prayerTimesApiCall(
    //         parseFloat(localStorage.getItem('user-lat')!),
    //         parseFloat(localStorage.getItem('user-lng')!),
    //       );
    //     } else {
    //       this.getPrayerTimes(0);
    //     }
    //     // this.getPrayerTimes(0);
    //   }
    // }, 60000);
  }

  private timeIntervalId?: any;
  private apiIntervalId?: any;
  fontSize = signal<number>(100);
  currentTime = signal(new Date());
  ngOnInit() {
    if (this.modal.state() !== 'initializing') {
      this.modal.showLoading('Syncing dashboard components...');
    }
    this.searchSubject
      .pipe(
        debounceTime(100),
        distinctUntilChanged(),
        switchMap((query) => (query.length > 2 ? this.api.searchCity(query) : [])),
      )
      .subscribe((data) => (this.results = data));

    this.timeIntervalId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    // Optimized API polling: Only runs if data exists, avoiding geolocation methods entirely
    this.apiIntervalId = setInterval(() => {
      const lat = localStorage.getItem('user-lat');
      const lng = localStorage.getItem('user-lng');

      if (this.prayer_times_data() && lat && lng) {
        this.prayerTimesApiCall(parseFloat(lat), parseFloat(lng));
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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.setItem('user-lat', pos.coords.latitude.toString());
        localStorage.setItem('user-lng', pos.coords.longitude.toString());
        this.prayerTimesApiCall(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        if (localStorage.getItem('user-lat') && localStorage.getItem('user-lng')) {
          this.prayerTimesApiCall(
            parseFloat(localStorage.getItem('user-lat')!),
            parseFloat(localStorage.getItem('user-lng')!),
          );
        } else {
          console.log('Error detecting location', error);
          // alert('Unable to retrieve your location. Please search manually.');
          this.messageService.add({
            severity: 'warn',
            summary: 'Location Access Needed',
            detail: 'Please enable location services or search manually for accurate prayer times.',
            life: 10000,
          });
        }
      },
    );
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
          // this.getPrayerTimes(1);
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

  results: any[] = [];
  searchQuery: string = '';
  private searchSubject = new Subject<string>();

  onSearch(event: any) {
    this.searchSubject.next(event.target.value);
  }

  selectCity(city: any) {
    this.isPrayerTimeLoading.set(true);
    const lat = city.lat;
    const lng = city.lon;

    localStorage.setItem('user-lat', lat);
    localStorage.setItem('user-lng', lng);
    localStorage.setItem('user-city-name', city.display_name.split(',')[0]);

    this.results = [];
    this.searchQuery = city.display_name;

    this.prayerTimesApiCall(lat, lng);
  }
  private messageService = inject(MessageService);
  detectLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    this.isPrayerTimeLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        localStorage.setItem('user-lat', lat.toString());
        localStorage.setItem('user-lng', lng.toString());

        this.prayerTimesApiCall(lat, lng);

        this.searchQuery = 'Current Location';
      },
      (error) => {
        console.log('Error detecting location', error);
        // alert(
        //   'Unable to retrieve your location. Please enable it in your browser/phone settings or search manually. We need your location to show the prayer times.',
        // );
        this.messageService.add({
          severity: 'warn',
          summary: 'Location Access Needed',
          detail: 'Please enable location services or search manually for accurate prayer times.',
          life: 10000,
        });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  }
  currentTimeAtSelectedCity = signal<string | null>(null);
  prayerTimesApiCall(lat: number, lng: number) {
    const $destroyed: Subject<void> = new Subject();
    this.api.getPrayerTimes<any>(lat, lng).subscribe({
      next: (res) => {
        this.isPrayerTimeLoading.set(false);
        this.prayer_times_data.set(res.data);
        this.getCurrentTimeAtSelectedCity(res);
        this.theme.applyPrayerTheme(res);
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
  clearSearch() {
    this.searchQuery = '';
    this.results = [];
  }

  getCurrentTimeAtSelectedCity(res: any) {
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: res.data.timezone,
      hour: '2-digit',
      minute: '2-digit',
      // second: '2-digit',
      hour12: false,
    }).format(new Date(res.timestamp));
    this.currentTimeAtSelectedCity.set(time);
  }

  globalAudio = inject(AudioPlayerService);
  private confirmationService = inject(ConfirmationService);
  confirmAudioPlayerClose() {
    this.confirmationService.confirm({
      key: 'closeAudioPromptDashboard',
      message: `Are you sure you want to close the audio player?`,
      header: 'Close Audio Player',
      icon: 'pi pi-headphones text-[#18181B]! dark:text-[#FFFFFF]!',

      // Applied ! (important) to override PrimeNG's structural and skin properties
      rejectButtonStyleClass:
        'px-4! py-2! bg-transparent! border! border-gray-300! dark:border-white/10! hover:bg-gray-100! dark:hover:bg-white/5! text-gray-700! dark:text-gray-300! rounded-lg! text-xs! font-semibold! font-sans! mr-2! transition-all! duration-200! cursor-pointer!',

      acceptButtonStyleClass:
        'px-4! py-2! bg-red-700! hover:bg-red-800! text-white! border-none! rounded-lg! text-xs! font-semibold! font-sans! transition-all! duration-200! cursor-pointer! shadow-sm!',

      accept: () => {
        this.audioService.stopAudio();
        this.audioService.currentUrl.set('');
        this.isCardClicked.set(false);
      },
      reject: () => {},
    });
  }
  ngOnDestroy() {
    this.audioService.stopAudio();
    if (this.timeIntervalId) clearInterval(this.timeIntervalId);
    if (this.apiIntervalId) clearInterval(this.apiIntervalId);
  }
}
