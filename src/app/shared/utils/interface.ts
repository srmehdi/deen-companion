export interface Bookmark {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
}
export type MediaCategory = 'namaz' | 'hadees' | 'dua' | 'quran' | 'motivational';
export type MediaType = 'video' | 'short';

export interface YoutubeMediaItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  type: MediaType;
}
export interface VideoItem {
  id: number;
  title: string;
  url: string;
  category: string;
  type: 'video' | 'short';
  duration?: string;
}
