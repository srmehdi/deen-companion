import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Header } from './features/header/header';
import { Footer } from './features/footer/footer';
import { PremiumCard } from './shared/components/premium-card/premium-card';
import { CommonModule } from '@angular/common';
import { AccessibilityControlComponent } from './shared/components/accessibility-control/accessibility-control';
import { AudioPlayer } from './shared/components/audio-player/audio-player';
import { ScrollTopModule } from 'primeng/scrolltop';
import { StatusModal } from './shared/modals/status-modal/status-modal';
import { StatusModalService } from './core/services/status-modal-service/status-modal-service';
import { HeaderStateService } from './core/services/header-state-service/header-state-service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Header,
    PremiumCard,
    Footer,
    AccessibilityControlComponent,
    AudioPlayer,
    ScrollTopModule,
    StatusModal,
    CommonModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('islamic-app');
  public modalService = inject(StatusModalService);
  private router = inject(Router);
  public headerState = inject(HeaderStateService);

  constructor() {
    // Reset header state on ANY route navigation
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd))
      .subscribe(() => {
        this.resetHeader();
      });
  }

  private resetHeader(): void {
    this.headerState.isHeaderHidden.set(false);
  }

  onMainScroll(event: Event): void {
    const target = event.target as HTMLElement;

    // Safety check: Restore header if user scrolls back to the very top (≤ 10px)
    if (target.scrollTop <= 10 && this.headerState.isHeaderHidden()) {
      this.headerState.isHeaderHidden.set(false);
    }
  }
}
