import { Component, inject, Inject, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Header } from './features/header/header';
import { Footer } from './features/footer/footer';
import { PremiumCard } from './shared/components/premium-card/premium-card';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Activity } from './core/services/activity/activity';
import { AccessibilityControlComponent } from './shared/components/accessibility-control/accessibility-control';
import { AudioPlayer } from './shared/components/audio-player/audio-player';
import { ScrollTopModule } from 'primeng/scrolltop';
import { StatusModal } from './shared/modals/status-modal/status-modal';
import { StatusModalService } from './core/services/status-modal-service/status-modal-service';
import { HeaderStateService } from './core/services/header-state-service/header-state-service';
import { FormsModule } from '@angular/forms';
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
  headerState = inject(HeaderStateService);

  isHeaderHidden = signal<boolean>(false);
  private lastScrollTop = 0;

  constructor() {
    // Reset header state on ANY navigation (including Back/Forward buttons)
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd))
      .subscribe(() => {
        this.resetHeader();
      });
  }

  private resetHeader(): void {
    this.isHeaderHidden.set(false);
    if (this.headerState) {
      this.headerState.isHeaderHidden.set(false);
    }
    this.lastScrollTop = 0;
  }

  onMainScroll(event: Event): void {
    if (!this.headerState.autoHideEnabled()) {
      if (this.isHeaderHidden()) {
        this.resetHeader();
      }
      return;
    }

    const target = event.target as HTMLElement;
    const currentScrollTop = target.scrollTop;

    // Force show header when near top of page
    if (currentScrollTop <= 50) {
      this.isHeaderHidden.set(false);
      this.headerState.isHeaderHidden.set(false);
      this.lastScrollTop = currentScrollTop;
      return;
    }

    // Scroll down -> Hide, Scroll up -> Show
    const shouldHide = currentScrollTop > this.lastScrollTop;
    this.isHeaderHidden.set(shouldHide);
    this.headerState.isHeaderHidden.set(shouldHide);

    this.lastScrollTop = currentScrollTop;
  }
}
