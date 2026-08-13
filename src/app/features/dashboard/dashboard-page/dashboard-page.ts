import {
  Component,
  computed,
  DOCUMENT,
  inject,
  Inject,
  signal,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
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
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

// Ultimate Fallback Location: New Delhi, India
const DEFAULT_INDIA_LAT = 28.6139;
const DEFAULT_INDIA_LNG = 77.209;
const DEFAULT_INDIA_CITY = 'New Delhi, India';

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
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  private modal = inject(StatusModalService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private http = inject(HttpClient);
  globalAudio = inject(AudioPlayerService);

  isCardClicked = signal(false);
  private timeIntervalId?: any;
  private apiIntervalId?: any;

  fontSize = signal<number>(100);
  currentTime = signal(new Date());
  darkMode = signal(true);

  prayers: any = [
    { key: 'fajr', name: 'Fajr' },
    { key: 'dhuhr', name: 'Dhuhr' },
    { key: 'asr', name: 'Asr' },
    { key: 'maghrib', name: 'Maghrib' },
    { key: 'isha', name: 'Isha' },
  ];

  isPrayerTimeLoading = signal(false);
  prayer_times_data = signal<any>(null);
  todayHijriDate = signal<any>(null);
  hadithOfTheDay = signal<any>(null);
  duaOfTheDay = signal<any>(null);
  verseOfTheDay = signal<any>(null);
  currentTimeAtSelectedCity = signal<string | null>(null);

  results: any[] = [];
  searchQuery: string = '';
  private searchSubject = new Subject<string>();

  expandedItems = signal<Set<number>>(new Set());
  needsReadMore = signal<Set<number>>(new Set());

  currentPrayer = computed(() => this.prayer_times_data()?.current_status.current_prayer);
  nextPrayer = computed(() => this.prayer_times_data()?.current_status.next_prayer);

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
  }

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

    // Refresh prayer times every minute
    this.apiIntervalId = setInterval(() => {
      const { lat, lng } = this.getStoredCoordinates();
      if (this.prayer_times_data() && lat !== null && lng !== null) {
        this.prayerTimesApiCall(lat, lng);
      }
    }, 60000);
  }

  ngAfterViewInit() {
    this.initDefaultPrayerTimes();
    this.apiCalls();
  }

  /**
   * Helper to fetch active coordinates from LocalStorage
   */
  private getStoredCoordinates(): { lat: number | null; lng: number | null } {
    const lat = localStorage.getItem('user-lat');
    const lng = localStorage.getItem('user-lng');

    return {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
    };
  }

  /**
   * Initial load handler:
   * 1. Uses cached location if present.
   * 2. Resolves IP-based location automatically via HTTPS (ipwho.is) if no cached data.
   * 3. Falls back to default India location if IP lookup fails.
   */
  private initDefaultPrayerTimes() {
    const { lat, lng } = this.getStoredCoordinates();
    const storedCity = localStorage.getItem('user-city-name');

    // Scenario A: Cached location exists
    if (lat !== null && lng !== null) {
      this.searchQuery = storedCity || 'Saved Location';
      this.isPrayerTimeLoading.set(true);
      this.prayerTimesApiCall(lat, lng);
      return;
    }

    // Scenario B: Fetch location via IP Geolocation
    this.fetchIpLocation();
  }

  /**
   * Resolves location via IP Geolocation (ipwho.is)
   */
  private fetchIpLocation() {
    this.isPrayerTimeLoading.set(true);
    this.api.getIpLocation().subscribe({
      next: (res) => {
        if (res && res.success && res.latitude && res.longitude) {
          const ipLat = res.latitude;
          const ipLng = res.longitude;
          const ipCity = res.city
            ? `${res.city}, ${res.country}`
            : res.country || 'Detected Location';

          // Cache resolved location
          localStorage.setItem('user-lat', ipLat.toString());
          localStorage.setItem('user-lng', ipLng.toString());
          localStorage.setItem('user-city-name', ipCity);

          this.searchQuery = ipCity;
          this.prayerTimesApiCall(ipLat, ipLng);
        } else {
          this.fallbackToDefaultLocation();
        }
      },
      error: (err) => {
        console.warn('IP location retrieval failed, falling back to default:', err);
        this.fallbackToDefaultLocation();
      },
    });
  }

  private fallbackToDefaultLocation() {
    this.searchQuery = DEFAULT_INDIA_CITY;
    this.prayerTimesApiCall(DEFAULT_INDIA_LAT, DEFAULT_INDIA_LNG);
  }

  /**
   * Reverse geocodes coordinates to a human-readable city/location name using OpenStreetMap Nominatim.
   */
  private reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    return this.http.get<any>(url);
  }

  /**
   * Explicit user action to request high-accuracy GPS geolocation via Map Marker button.
   * Reverse-geocodes actual city name to store in LocalStorage instead of generic text.
   */
  detectLocation() {
    if (!navigator.geolocation) {
      this.messageService.add({
        severity: 'warn',
        summary: 'GPS Not Supported',
        detail: 'Geolocation is not supported by your browser. Falling back to network location.',
        life: 7000,
      });
      this.fetchIpLocation();
      return;
    }

    this.isPrayerTimeLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Perform reverse geocoding to retrieve actual city name from GPS coordinates
        this.reverseGeocode(lat, lng).subscribe({
          next: (geoRes) => {
            const address = geoRes?.address;
            const cityName =
              address?.city ||
              address?.town ||
              address?.village ||
              address?.suburb ||
              address?.county ||
              'Current Location';
            const stateOrCountry = address?.state || address?.country || '';
            const fullLocationName = stateOrCountry ? `${cityName}, ${stateOrCountry}` : cityName;

            localStorage.setItem('user-lat', lat.toString());
            localStorage.setItem('user-lng', lng.toString());
            localStorage.setItem('user-city-name', fullLocationName);

            this.searchQuery = fullLocationName;
            this.prayerTimesApiCall(lat, lng);
          },
          error: (err) => {
            console.warn('Reverse geocoding failed, storing fallback location string:', err);
            const fallbackName = 'Current Location';

            localStorage.setItem('user-lat', lat.toString());
            localStorage.setItem('user-lng', lng.toString());
            localStorage.setItem('user-city-name', fallbackName);

            this.searchQuery = fallbackName;
            this.prayerTimesApiCall(lat, lng);
          },
        });
      },
      (error) => {
        console.warn(
          'Error/permission denied for GPS location. Falling back to IP location:',
          error,
        );
        this.messageService.add({
          severity: 'info',
          summary: 'Device Location Disabled',
          detail: 'Could not access device GPS. Using network IP location instead.',
          life: 7000,
        });

        // Fallback to IP-based location on error or permission rejection
        this.fetchIpLocation();
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  }

  prayerTimesApiCall(lat: number, lng: number) {
    this.api.getPrayerTimes<any>(lat, lng).subscribe({
      next: (res) => {
        this.isPrayerTimeLoading.set(false);
        this.prayer_times_data.set(res.data);
        this.getCurrentTimeAtSelectedCity(res);
        this.theme.applyPrayerTheme(res);
      },
      error: (err) => {
        console.log(err);
        this.isPrayerTimeLoading.set(false);
        this.modal.showError({ message: 'Unable to fetch prayer times.' });
      },
    });
  }

  selectCity(city: any) {
    this.isPrayerTimeLoading.set(true);
    const lat = city.lat;
    const lng = city.lon;
    const cityName = city.display_name.split(',')[0];

    localStorage.setItem('user-lat', lat);
    localStorage.setItem('user-lng', lng);
    localStorage.setItem('user-city-name', cityName);

    this.results = [];
    this.searchQuery = city.display_name;

    this.prayerTimesApiCall(lat, lng);
  }

  onSearch(event: any) {
    this.searchSubject.next(event.target.value);
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
      hour12: false,
    }).format(new Date(res.timestamp));
    this.currentTimeAtSelectedCity.set(time);
  }

  apiCalls() {
    this.modal.showLoading();
    const getTodayHijriDate = this.api.getTodayHijriDate<any>();
    const getHadithOfTheDay = this.api.getHadithOfTheDay<any>('bukhari');
    const getDuaOfTheDay = this.api.getDuaOfTheDay<any>();
    const getVerseOfTheDay = this.api.getVerseOfTheDay<any>();

    forkJoin([getTodayHijriDate, getHadithOfTheDay, getDuaOfTheDay, getVerseOfTheDay]).subscribe({
      next: (res) => {
        if (res[0].success && res[1].success && res[2].success && res[3].success) {
          this.todayHijriDate.set(res[0].data);
          this.hadithOfTheDay.set(res[1].data);
          this.duaOfTheDay.set(res[2].data);
          this.verseOfTheDay.set(res[3].data);
          this.modal.close();
        } else {
          this.modal.showError({ message: 'Error loading dashboard components.' });
        }
      },
      error: (err) => {
        console.log(err);
        this.modal.showError({ message: 'Something went wrong.' });
      },
    });
  }

  updateVolume(event: Event) {
    const input = event.target as HTMLInputElement;
    this.audioService.setVolume(parseFloat(input.value));
  }

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

  confirmAudioPlayerClose() {
    this.confirmationService.confirm({
      key: 'closeAudioPromptDashboard',
      message: `Are you sure you want to close the audio player?`,
      header: 'Close Audio Player',
      icon: 'pi pi-headphones text-[#18181B]! dark:text-[#FFFFFF]!',
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
  private router = inject(Router);
  navigateToVerse(): void {
    const verse = this.verseOfTheDay();
    if (!verse) {
      this.router.navigate(['/quran']);
      return;
    }

    this.router.navigate(['/quran', verse.surah.number]);
  }

  navigateToHadith(): void {
    const hadith = this.hadithOfTheDay();
    if (!hadith) {
      this.router.navigate(['/hadees']);
      return;
    }

    this.router.navigate(['/hadees']);
  }

  navigateToDua(): void {
    const dua = this.duaOfTheDay();
    if (!dua) {
      this.router.navigate(['/dua']);
      return;
    }

    this.router.navigate(['/dua']);
  }

  goToNamazGuide(prayerKey: string): void {
    if (!prayerKey) return;
    this.router.navigate(['/namaz-guide', prayerKey.toLowerCase()]);
  }
  ngOnDestroy() {
    this.audioService.stopAudio();
    if (this.timeIntervalId) clearInterval(this.timeIntervalId);
    if (this.apiIntervalId) clearInterval(this.apiIntervalId);
  }
}
