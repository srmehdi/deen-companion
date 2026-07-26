import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Endpoints } from '../../../shared/utils/endpoints';
import { VideoItem } from '../../../shared/utils/interface';

@Injectable({ providedIn: 'root' })
export class ApiService {
  http = inject(HttpClient);
  // base = environment.apiUrl;
  ummahBase = environment.ummahBaseUrl;
  // api_key = environment.apiKey;
  // api_key = process.env['API_KEY'];

  // get<T>(url: string) {
  //   return this.http.get<T>(this.base + url).pipe(catchError(() => throwError(() => 'API error')));
  // }
  getPrayerTimes<T>(lat: number, lng: number) {
    // return this.http
    //   .get<T>(
    //     this.ummahBase +
    //       Endpoints.PRAYER_TIMES +
    //       `?lat=${lat}&lng=${lng}&madhab=${'Hanafi'}&apikey=${this.api_key}`,
    //   )
    //   .pipe(catchError(() => throwError(() => 'API error')));
    // const payload = { lat: lat, lang: lng, madhab: 'Hanafi' };
    const payload = { lat: lat, lang: lng, madhab: 'Shafi' };
    return this.http.post<any>('/api/getPrayerTimes', payload);
    // return this.http.get<T>('./assets/jsons/prayer_times.json');
  }
  getTodayHijriDate<T>() {
    return this.http
      .get<T>(this.ummahBase + Endpoints.TODAY_HIJRI_DATE)
      .pipe(catchError(() => throwError(() => 'API error')));
    // return this.http.get<T>('./assets/jsons/today_hijri_date.json');
  }
  getHadithOfTheDay<T>(collection: string) {
    return this.http
      .get<T>(this.ummahBase + Endpoints.HADEES_OF_THE_DAY + `?collection=${collection}`)
      .pipe(catchError(() => throwError(() => 'API error')));
    // return this.http.get<T>('./assets/jsons/hadith_of_the_day.json');
  }
  getDuaOfTheDay<T>() {
    return this.http
      .get<T>(this.ummahBase + Endpoints.DUA_OF_THE_DAY)
      .pipe(catchError(() => throwError(() => 'API error')));
    // return this.http.get<T>('./assets/jsons/dua_of_the_day.json');
  }
  getAllDuas<T>() {
    return this.http
      .get<T>(this.ummahBase + Endpoints.ALL_DUAS)
      .pipe(catchError(() => throwError(() => 'API error')));
    // return this.http.get<T>('./assets/jsons/dua_of_the_day.json');
  }
  getVerseOfTheDay<T>() {
    return this.http
      .get<T>(this.ummahBase + Endpoints.VERSE_OF_THE_DAY)
      .pipe(catchError(() => throwError(() => 'API error')));
    // return this.http.get<T>('./assets/jsons/verse_of_the_day.json');
  }
  searchCity(query: string) {
    const nominatimUrl = Endpoints.NOMINATIM_SEARCH;
    const params = {
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
    };
    return this.http.get<any[]>(nominatimUrl, { params });
  }
  sendPing(visitorId: { visitorId: string }) {
    return this.http.post<any>(Endpoints.HEART_BEAT, visitorId);
  }
  getActivityStats() {
    return this.http.get<any>(Endpoints.ACTIVITY_STATS);
  }
  getListOfSurahs<T>() {
    return this.http.get<T>(this.ummahBase + Endpoints.SURAHS_METADATA);
  }
  getSurahByNumber<T>(surahNo: number) {
    return this.http.get<T>(
      this.ummahBase +
        Endpoints.SURAH_BY_NUMBER +
        surahNo +
        `?translation=sahih_international&reciter=1`,
    );
  }
  getSurahWordByWord<T>(surahNo: number) {
    // return this.http
    //   .get<T>(
    //     this.ummahBase +
    //       Endpoints.SURAH_BY_NUMBER +
    //       surahNo +
    //       `?translation=sahih_international&reciter=1`,
    //   )
    //   .pipe(catchError(() => throwError(() => 'API error')));
    return this.http.get<T>('./assets/jsons/surah_word_by_word.json');
  }
  getSurahList(): Observable<any[]> {
    return this.http.get<any>(Endpoints.quran.surahList).pipe(map((response) => response.data));
  }

  getSurahDetails(number: number): Observable<any> {
    return this.http.get<any>(Endpoints.quran.surahDetail(number)).pipe(
      map((response) => {
        const arabicAyahs = response.data[0].ayahs;
        const englishAyahs = response.data[1].ayahs;
        const translitAyahs = response.data[2].ayahs;
        const audioAyahs = response.data[3].ayahs;

        return {
          info: response.data[0],
          ayahs: arabicAyahs.map((ayah: any, index: number) => ({
            numberInSurah: ayah.numberInSurah,
            text: ayah.text,
            translation: englishAyahs[index].text,
            transliteration: translitAyahs[index].text,
            audio: audioAyahs[index].audio,
          })),
          audio: response.data[3],
        };
      }),
    );
  }
  saveDuaBookmarkIds(payload: any) {
    return this.http.post<any>(Endpoints.SAVE_DUA_BOOKMARK_IDS, payload);
  }
  getDuaBookmarkIds(payload: any) {
    return this.http.post<any>(Endpoints.GET_DUA_BOOKMARK_IDS, payload);
  }
  getHadithCollections<T>() {
    return this.http
      .get<T>(this.ummahBase + Endpoints.HADITHS_COLLECTIONS)
      .pipe(catchError(() => throwError(() => 'API error')));
  }
  getHadithsByCollection<T>(collectionKey: string, page: number = 1, limit: number = 5) {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http
      .get<T>(this.ummahBase + Endpoints.HADITHS_BY_COLLECTION + collectionKey, { params })
      .pipe(catchError(() => throwError(() => 'API error')));
  }
  searchHadiths<T>(query: string, limit: number = 100) {
    const params = new HttpParams().set('q', query).set('limit', limit.toString());
    return this.http
      .get<T>(this.ummahBase + Endpoints.HADITHS_SEARCH, { params })
      .pipe(catchError(() => throwError(() => 'API search error')));
  }
  getHadithByNumber<T>(collectionKey: string, hadithNumber: string | number) {
    return this.http.get<T>(
      this.ummahBase + Endpoints.HADITHS_BY_COLLECTION + `${collectionKey}/${hadithNumber}`,
    );
  }
  getVideos(payload: { type: string }) {
    return this.http.post<any>(Endpoints.GET_VIDEOS, payload);
  }
}
