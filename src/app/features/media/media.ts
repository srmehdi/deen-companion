import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { SafeUrlPipe } from '../../shared/pipes/safe-url/safe-url-pipe';
import { getYoutubeEmbedUrl } from '../../shared/utils/helpers';
import { VideoItem } from '../../shared/utils/interface';
import { StatusModalService } from '../../core/services/status-modal-service/status-modal-service';
import { ApiService } from '../../core/services/api-service/api-service';
import { AudioPlayerService } from '../../core/services/audio-player-service/audio-player-service';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [TitleCasePipe, SafeUrlPipe],
  templateUrl: './media.html',
  styleUrls: ['./media.css'],
})
export class MediaComponent implements OnInit {
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.activeEmbedUrl()) {
      this.closePlayer();
    }
  }
  categories = ['all'];

  // Signals Reactive State
  selectedCategory = signal<string>('all');
  selectedType = signal<'video' | 'short'>('short');
  videos = signal<VideoItem[]>([]);

  // Navigation State
  activeVideoIndex = signal<number | null>(null);
  activeEmbedUrl = signal<string | null>(null);
  loading = signal<boolean>(false);

  // Computed signal to filter videos by category from the fetched type dataset
  filteredVideos = computed(() => {
    const category = this.selectedCategory();
    const allVideos = this.videos();

    if (category === 'all') {
      return allVideos;
    }
    return allVideos.filter((item) => item.category === category);
  });

  // Computed helper for currently playing video item
  activeVideo = computed(() => {
    const index = this.activeVideoIndex();
    const list = this.filteredVideos();
    return index !== null && list[index] ? list[index] : null;
  });

  private modal = inject(StatusModalService);

  ngOnInit(): void {
    this.fetchData();
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.closePlayer();
  }

  selectType(type: 'video' | 'short'): void {
    if (this.selectedType() === type) return;

    this.selectedType.set(type);
    this.selectedCategory.set('all');
    this.closePlayer();
    this.fetchData();
  }

  // playVideoByIndex(index: number): void {
  //   const list = this.filteredVideos();
  //   if (index >= 0 && index < list.length) {
  //     this.activeVideoIndex.set(index);
  //     this.activeEmbedUrl.set(getYoutubeEmbedUrl(list[index].url));
  //   }
  // }
  globalAudio = inject(AudioPlayerService);
  playVideoByIndex(index: number): void {
    if (this.globalAudio.isAudioPlaying()) {
      this.globalAudio.pauseAudio();
    }
    const list = this.filteredVideos();
    if (index >= 0 && index < list.length) {
      this.activeVideoIndex.set(index);

      // Pass current URL, full active list, and index
      const embedUrl = getYoutubeEmbedUrl(list[index].url, list, index);
      this.activeEmbedUrl.set(embedUrl);
    }
  }

  playNext(): void {
    const currentIndex = this.activeVideoIndex();
    const totalCount = this.filteredVideos().length;
    if (currentIndex !== null && currentIndex < totalCount - 1) {
      this.playVideoByIndex(currentIndex + 1);
    }
  }

  playPrevious(): void {
    const currentIndex = this.activeVideoIndex();
    if (currentIndex !== null && currentIndex > 0) {
      this.playVideoByIndex(currentIndex - 1);
    }
  }

  closePlayer(): void {
    this.activeVideoIndex.set(null);
    this.activeEmbedUrl.set(null);
  }

  getThumbnailUrl(url: string): string {
    const videoId = this.extractVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : 'assets/logo.png';
  }

  onThumbnailError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/logo.png';
  }

  private extractVideoId(url: string): string {
    if (!url) return '';
    let videoId = '';

    if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1];
    } else {
      videoId = url;
    }

    if (videoId.includes('?')) {
      videoId = videoId.split('?')[0];
    }
    if (videoId.includes('&')) {
      videoId = videoId.split('&')[0];
    }

    return videoId;
  }

  apiService = inject(ApiService);
  fetchData(): void {
    this.loading.set(true);
    this.modal.close();

    const payload = {
      type: this.selectedType(),
    };

    // Live Service Call (Uncomment when connecting to Netlify Function)
    this.apiService.getVideos(payload).subscribe({
      next: (res) => {
        this.videos.set(res.data);
        const uniqueCategories: string[] = Array.from(
          new Set(res.data.map((v: { category: any }) => v.category)),
        );
        this.categories = ['all', ...uniqueCategories];
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching media:', err);
        this.loading.set(false);
      },
    });
  }
}
