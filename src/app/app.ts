import {
  ApplicationRef,
  Component,
  inject,
  NgZone,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
import { filter, first } from 'rxjs';
import { SwPush, SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { DailyReminderBannerComponent } from './shared/components/daily-reminder-banner/daily-reminder-banner';
import { MobileBottomNav } from './shared/components/mobile-bottom-nav/mobile-bottom-nav';
import { NotificationService } from './core/services/notification-service/notification-service';
import { ApiService } from './core/services/api-service/api-service';

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
    DailyReminderBannerComponent,
    MobileBottomNav,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  @ViewChild('appHeader') appHeader!: Header;
  protected readonly title = signal('islamic-app');
  public modalService = inject(StatusModalService);
  private router = inject(Router);
  private api = inject(ApiService);
  private ngZone = inject(NgZone);
  public headerState = inject(HeaderStateService);

  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);
  private swPush = inject(SwPush);
  public notificationService = inject(NotificationService);

  dismiss = output<void>();
  hasUpdate = signal(false);

  constructor() {
    // Reset header state on ANY route navigation
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd))
      .subscribe(() => {
        this.resetHeader();
      });

    if (this.swUpdate.isEnabled) {
      // Check for update once app is stable
      const isStable$ = this.appRef.isStable.pipe(first((isStable) => isStable === true));
      isStable$.subscribe(() => {
        this.swUpdate.checkForUpdate();
      });

      // Listen for when the new version finishes downloading
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.hasUpdate.set(true);
        });
    }

    // Handle Web Push Notification Clicks
    if (this.swPush.isEnabled) {
      this.swPush.notificationClicks.subscribe(({ action, notification }) => {
        const data = notification?.data || {};
        console.log('Push Action Clicked:', action, notification);

        // 1. Acknowledge prayer notification to halt further minute cron reminders
        if (data.visitorId && data.prayerKey) {
          this.api
            .ackPrayer({
              visitorId: data.visitorId,
              prayerKey: data.prayerKey,
              date: data.date,
            })
            .subscribe({
              next: () => console.log(`Prayer ${data.prayerKey} successfully acknowledged.`),
              error: (err) => console.warn('Failed to ack prayer reminder:', err),
            });
        }

        // 2. If user tapped "Dismiss", do not navigate anywhere
        if (action === 'dismiss') {
          return;
        }

        // 3. Determine target URL
        let targetUrl = '/';

        if (action === 'open-content-page') {
          targetUrl = data.openContentPageUrl || '/dua';
        } else if (action === 'go-to-content') {
          targetUrl = data.goToContentUrl || '/dua';
        } else if (action === 'open-guide') {
          targetUrl = data.url || `/namaz-guide/${(data.prayerKey || '').toLowerCase()}`;
        } else {
          targetUrl = data.url || '/';
        }

        // 4. Force navigation inside Angular NgZone
        if (targetUrl) {
          console.log('Navigating to targetUrl:', targetUrl);
          this.ngZone.run(() => {
            this.router.navigateByUrl(targetUrl);
          });
        }
      });
    }
  }

  private resetHeader(): void {
    this.headerState.isHeaderHidden.set(false);
  }

  onMainScroll(event: Event): void {
    this.appHeader?.closeMenu();
    const target = event.target as HTMLElement;

    // Safety check: Restore header if user scrolls back to the very top (<= 10px)
    if (target.scrollTop <= 10 && this.headerState.isHeaderHidden()) {
      this.headerState.isHeaderHidden.set(false);
    }
  }

  reloadApp() {
    window.location.reload();
  }
}
