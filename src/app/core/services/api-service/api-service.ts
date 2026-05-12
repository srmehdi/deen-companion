import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, throwError } from 'rxjs';
import { Endpoints } from '../../../shared/utils/endpoints';

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
    const payload = { lat: lat, lang: lng, madhab: 'Hanafi' };
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
  getVerseOfTheDay<T>() {
    return this.http
      .get<T>(this.ummahBase + Endpoints.VERSE_OF_THE_DAY)
      .pipe(catchError(() => throwError(() => 'API error')));
    // return this.http.get<T>('./assets/jsons/verse_of_the_day.json');
  }
}
