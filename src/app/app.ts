import { Component, Inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './features/header/header';
import { Footer } from './features/footer/footer';
import { PremiumCard } from './shared/components/premium-card/premium-card';
import { DOCUMENT } from '@angular/common';
import { Activity } from './core/services/activity/activity';
import { AccessibilityControlComponent } from './shared/components/accessibility-control/accessibility-control';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, PremiumCard, Footer, AccessibilityControlComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('islamic-app');
  constructor() {}
  ngOnInit() {}
}
