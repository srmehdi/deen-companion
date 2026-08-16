import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PremiumCard } from '../../shared/components/premium-card/premium-card';
import { StatusModalService } from '../../core/services/status-modal-service/status-modal-service';
import { HeaderStateService } from '../../core/services/header-state-service/header-state-service';
import { StickyHeaderWrapper } from '../../shared/components/sticky-header-wrapper/sticky-header-wrapper';

export type SupportedLanguage = 'en' | 'ur' | 'hi';
export type PrayerSectionType = 'sunnah' | 'fard' | 'nafl' | 'witr';

export interface LocalizedText {
  en: string;
  ur: string;
  hi: string;
}

export interface NamazStep {
  stepNumber: number;
  title: LocalizedText;
  description: LocalizedText;
  arabic?: string;
  transliteration?: string;
  translation?: LocalizedText;
  isPremium?: boolean;
}

export interface PrayerSection {
  rakats: number;
  title: LocalizedText;
  steps: NamazStep[];
}

export interface Prayer {
  id: string;
  name: LocalizedText;
  totalRakats: number;
  breakdown: { sunnah?: number; fard?: number; nafl?: number; witr?: number };
  sections: { [key in PrayerSectionType]?: PrayerSection };
}

@Component({
  selector: 'app-namaz-guide',
  standalone: true,
  imports: [CommonModule, PremiumCard, StickyHeaderWrapper],
  templateUrl: './namaz-guide.html',
  styleUrl: './namaz-guide.css',
})
export class NamazGuideComponent implements OnInit {
  // currentLang = signal<SupportedLanguage>('en');
  currentLang = signal<'en' | 'ur' | 'hi'>(this.loadLanguage());
  isPremiumUser = signal<boolean>(false);
  prayers = signal<Prayer[]>([]);
  selectedPrayer = signal<Prayer | null>(null);
  selectedSectionType = signal<PrayerSectionType>('sunnah');

  isRtl = computed(() => this.currentLang() === 'ur');

  availableSections = computed(() => {
    const prayer = this.selectedPrayer();
    if (!prayer || !prayer.sections) return [];
    return Object.keys(prayer.sections) as PrayerSectionType[];
  });

  activeSection = computed(() => {
    const prayer = this.selectedPrayer();
    const sectionType = this.selectedSectionType();
    if (!prayer || !prayer.sections) return null;
    return prayer.sections[sectionType] || null;
  });

  private http = inject(HttpClient);
  private modal = inject(StatusModalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private headerState = inject(HeaderStateService);

  ngOnInit(): void {
    this.headerState.isHeaderHidden.set(false);
    this.headerState.enableAutoHide();
    // this.checkSubscriptionStatus();
    this.loadPrayers();
  }

  private loadLanguage(): 'en' | 'ur' | 'hi' {
    const saved = localStorage.getItem('translation_language');
    return saved ? JSON.parse(saved) : 'en';
  }
  setLanguage(lang: SupportedLanguage): void {
    this.currentLang.set(lang);
    localStorage.setItem('translation_language', JSON.stringify(lang));
  }

  // Navigate to prayer URL route
  onPrayerTabClick(prayerId: string): void {
    this.router.navigate(['/namaz-guide', prayerId]);
  }

  selectPrayer(prayer: Prayer): void {
    this.selectedPrayer.set(prayer);
    const sections = Object.keys(prayer.sections || {}) as PrayerSectionType[];
    if (sections.length > 0) {
      this.selectedSectionType.set(sections[0]);
    }
  }

  selectSection(type: PrayerSectionType): void {
    this.selectedSectionType.set(type);
  }

  private loadPrayers(): void {
    this.modal.showLoading();
    this.http.get<{ prayers: Prayer[] }>('assets/jsons/prayers.json').subscribe({
      next: (data) => {
        const loadedPrayers = data.prayers || [];
        this.prayers.set(loadedPrayers);

        // Listen for route param changes (e.g. /namaz-guide/fajr)
        this.route.paramMap.subscribe((params) => {
          const prayerId = params.get('prayerId') || 'fajr';
          const foundPrayer = loadedPrayers.find((p) => p.id === prayerId) || loadedPrayers[0];

          if (foundPrayer) {
            this.loadNamazData(foundPrayer);
          }
        });

        this.modal.close();
      },
      error: (err) => {
        console.error('Failed to load prayer list:', err);
        this.modal.close();
      },
    });
  }

  loadNamazData(prayer: Prayer): void {
    this.modal.showLoading();
    // HTTP GET to retrieve static json files per prayer (e.g., assets/jsons/namaz_fajr.json)
    this.http.get<{ prayers: Prayer[] }>(`assets/jsons/namaz_${prayer.id}.json`).subscribe({
      next: (data) => {
        if (data.prayers && data.prayers.length > 0) {
          this.selectPrayer(data.prayers[0]);
        } else {
          this.selectPrayer(prayer);
        }
        this.modal.close();
      },
      error: (err) => {
        console.error(`Failed to load data for ${prayer.id}:`, err);
        this.selectPrayer(prayer);
        this.modal.close();
      },
    });
  }

  private checkSubscriptionStatus(): void {
    this.isPremiumUser.set(true);
  }
  ngOnDestroy(): void {
    this.headerState.disableAutoHide();
  }
}
