import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  darkMode = signal(true);
  autoMode = signal(false);

  constructor() {
    const savedTheme = localStorage.getItem('theme');
    const savedAuto = localStorage.getItem('autoTheme');

    if (savedTheme) this.darkMode.set(savedTheme === 'dark');
    if (savedAuto !== null) this.autoMode.set(savedAuto === 'true');

    effect(() => {
      document.documentElement.classList.toggle('dark', this.darkMode());
      localStorage.setItem('theme', this.darkMode() ? 'dark' : 'light');
      localStorage.setItem('autoTheme', this.autoMode().toString());
    });
  }

  toggleManual() {
    this.autoMode.set(false);
    this.darkMode.update((v) => !v);
  }

  setAutoMode(v: boolean) {
    this.autoMode.set(v);
  }

  applyPrayerTheme(prayer_times_data: any) {
    if (!this.autoMode()) return;

    const now = new Date();
    const fajr = this.parse(prayer_times_data.data.prayer_times.fajr);
    const maghrib = this.parse(prayer_times_data.data.prayer_times.maghrib);

    this.darkMode.set(!(now >= fajr && now < maghrib));
  }

  private parse(t: string): Date {
    const [time, mod] = t.split(' ');
    let [h, m] = time.split(':').map(Number);

    if (mod === 'PM' && h !== 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;

    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
}
