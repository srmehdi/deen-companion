import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './features/header/header';
import { Footer } from './features/footer/footer';
import { PremiumCard } from './shared/components/premium-card/premium-card';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, PremiumCard],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('islamic-app');
}
