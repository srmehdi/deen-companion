import { Component, signal, ViewChild } from '@angular/core';
import { ApiService } from '../../core/services/api-service/api-service';
import { StatusModal } from '../../shared/modals/status-modal/status-modal';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioService } from '../../core/services/audio-service/audio-service';

export interface QuranWord {
  position: number;
  arabic: string;
  transliteration: {
    text: string;
    language_name: string;
  };
  translation: string;
  type: string;
  startTime?: number;
  endTime?: number;
}

export interface QuranVerse {
  surah: number;
  ayah: number;
  verse_key: string;
  word_count: number;
  words: QuranWord[];
  audioUrl?: string;
}

export interface SurahWordsResponse {
  success: boolean;
  service: string;
  data: {
    surah: number;
    total_verses: number;
    verses: QuranVerse[];
  };
  timestamp: string;
}

// Minimal listing interface for the initial grid list view
export interface SurahListItem {
  id: number;
  name: string;
  englishName: string;
  versesCount: number;
}
export interface AyahAudioMapping {
  verse_key: string;
  ayah: number;
  audio_url: string;
}
@Component({
  selector: 'app-quran',
  imports: [CommonModule, FormsModule],
  templateUrl: './quran.html',
  styleUrl: './quran.css',
})
export class Quran {
  @ViewChild('modal') modal!: StatusModal;
  surahList: SurahListItem[] = [];
  filteredSurahList: SurahListItem[] = [];
  searchQuery: string = '';
  loadingList: boolean = true;

  selectedSurah: SurahListItem | null = null;
  verses: any;
  loadingDetails: boolean = false;
  activeVerseKey = signal<string | null>(null);
  activeWordPosition = signal<number | null>(null);
  private timeUpdateListener!: () => void;
  constructor(
    private api: ApiService,
    public audioService: AudioService,
  ) {}
  ngOnInit(): void {
    // this.api.getSurahList().subscribe({
    //   next: (data) => {
    //     this.surahList = data;
    //     this.filteredSurahList = data;
    //     this.loadingList = false;
    //   },
    //   error: () => {
    //     this.loadingList = false;
    //   }
    // });
    this.selectSurah({ id: 1 });
    // this.loadSurahData();
    this.setupAudioSync();
  }
  loadSurahData(): void {
    // 💡 Mocking enriched data injection combining your Word-By-Word text payload
    // with the segment tracking points matching verse audio file durations:
    this.verses = [
      {
        surah: 1,
        ayah: 1,
        verse_key: '1:1',
        word_count: 4,
        audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
        words: [
          {
            position: 1,
            arabic: 'بِسْمِ',
            transliteration: { text: "bis'mi", language_name: 'english' },
            translation: 'In (the) name',
            type: 'word',
            startTime: 0.0,
            endTime: 1.2,
          },
          {
            position: 2,
            arabic: 'ٱللَّهِ',
            transliteration: { text: 'l-lahi', language_name: 'english' },
            translation: '(of) Allah',
            type: 'word',
            startTime: 1.2,
            endTime: 2.5,
          },
          {
            position: 3,
            arabic: 'ٱلرَّحْمَـٰنِ',
            transliteration: { text: 'l-raḥmāni', language_name: 'english' },
            translation: 'the Most Gracious',
            type: 'word',
            startTime: 2.5,
            endTime: 4.1,
          },
          {
            position: 4,
            arabic: 'ٱلرَّحِيمِ',
            transliteration: { text: 'l-raḥīmi', language_name: 'english' },
            translation: 'the Most Merciful',
            type: 'word',
            startTime: 4.1,
            endTime: 6.0,
          },
        ],
      },
    ];
  }

  setupAudioSync(): void {
    // Reference the underlying Audio element from your custom AudioService
    const nativeAudio = this.audioService.audio;

    this.timeUpdateListener = () => {
      const currentTime = nativeAudio.currentTime;
      this.highlightWordAtTime(currentTime);
    };

    nativeAudio.addEventListener('timeupdate', this.timeUpdateListener);

    // Reset markers when the track completes playback cycles safely
    nativeAudio.addEventListener('ended', () => this.clearHighlights());
  }

  playVerseAudio(verse: QuranVerse): void {
    if (!verse.audioUrl) return;

    // Direct interface hook into your toggle engine
    this.activeVerseKey.set(verse.verse_key);
    this.audioService.toggleAudio(verse.audioUrl);
  }

  highlightWordAtTime(seconds: number): void {
    const currentKey = this.activeVerseKey();
    if (!currentKey) return;

    const activeVerse = this.verses.find((v: any) => v.verse_key === currentKey);
    if (!activeVerse) return;

    // Scan words array for active match matching audio timestamp intervals
    const matchingWord = activeVerse.words.find(
      (word: any) =>
        word.startTime !== undefined &&
        word.endTime !== undefined &&
        seconds >= word.startTime &&
        seconds <= word.endTime,
    );

    if (matchingWord) {
      this.activeWordPosition.set(matchingWord.position);
    } else {
      this.activeWordPosition.set(null);
    }
  }

  clearHighlights(): void {
    this.activeVerseKey.set(null);
    this.activeWordPosition.set(null);
  }

  ngOnDestroy(): void {
    // Prevent memory leaks by cleaning up core audio event listeners
    this.audioService.audio.removeEventListener('timeupdate', this.timeUpdateListener);
  }
  filterSurahs(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredSurahList = this.surahList;
      return;
    }

    this.filteredSurahList = this.surahList.filter(
      (s) => s.englishName.toLowerCase().includes(query) || s.id.toString() === query,
    );
  }

  selectSurah(surah: any): void {
    // this.selectedSurah = surah;
    this.loadingDetails = true;
    this.verses = [];

    this.api.getSurahWordByWord(surah.id).subscribe({
      next: (versesData: any) => {
        this.verses = versesData?.data?.verses;
        console.log('this.verses', this.verses);

        this.loadingDetails = false;
      },
      error: () => {
        this.loadingDetails = false;
      },
    });
  }

  closeDetails(): void {
    this.selectedSurah = null;
    this.verses = [];
  }
}
