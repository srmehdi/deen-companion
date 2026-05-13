import { Component, Inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './features/header/header';
import { Footer } from './features/footer/footer';
import { PremiumCard } from './shared/components/premium-card/premium-card';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, PremiumCard],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('islamic-app');
  fontSize: number = 100;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngOnInit() {
    const saved = localStorage.getItem('user-font-size');
    if (saved) {
      this.fontSize = parseInt(saved, 10);
      this.applyFontSize(this.fontSize);
    }
  }

  onSliderChange(event: any) {
    this.fontSize = event.target.value;
    this.applyFontSize(this.fontSize);
  }

  private applyFontSize(value: number) {
    document.documentElement.style.setProperty('--base-font-size', `${value}%`);
    localStorage.setItem('user-font-size', value.toString());
  }
  resetFontSize() {
    this.fontSize = 100;
    this.applyFontSize(this.fontSize);
  }
}
