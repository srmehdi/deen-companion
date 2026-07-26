import { Injectable, OnDestroy, signal } from '@angular/core';
import { ApiService } from '../api-service/api-service';
import { of, Subject, takeUntil, concatMap } from 'rxjs';
import { getDeviceDetails } from '../../../shared/utils/helpers';

@Injectable({ providedIn: 'root' })
export class Activity implements OnDestroy {
  private pingIntervalId: any = null;
  private inactivityTimeoutId: any = null;

  private readonly PING_INTERVAL = 300 * 1000;
  private readonly INACTIVITY_LIMIT = 600 * 1000;

  constructor(private api: ApiService) {
    // this.handleVisibilityChange();
  }
  startTracking() {
    const resetTimers = () => {
      this.startPing();
      this.resetInactivityTimer();
    };

    ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach((event) => {
      window.addEventListener(event, resetTimers, { passive: true });
    });

    resetTimers();
  }

  private startPing() {
    if (this.pingIntervalId) return;
    const visitorId = this.getVisitorId();
    this.sendPing(visitorId);

    this.pingIntervalId = setInterval(() => {
      this.sendPing(visitorId);
    }, this.PING_INTERVAL);
  }
  resetInactivityTimer() {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
    }

    this.inactivityTimeoutId = setTimeout(() => {
      this.stopPing();
    }, this.INACTIVITY_LIMIT);
  }
  private stopPing() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  // private sendPing(visitorId: string) {
  //   const payload = { visitorId: visitorId };
  //   this.api.sendPing(payload).subscribe({
  //     next: (resp) => {
  //       // console.log('sendPing resp', resp);
  //     },
  //     error: (err) => {
  //       console.log('sendPing error', err);
  //     },
  //   });
  // }

  activityStats: any = signal(null);
  pingResponse: any = signal(null);
  private sendPing(visitorId: string) {
    const $destroyed: Subject<void> = new Subject();
    // const payload = { visitorId: visitorId };
    const deviceInfo = getDeviceDetails();
    const payload = {
      visitorId: visitorId,
      device: deviceInfo.device,
      userAgent: deviceInfo.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    this.api
      .sendPing(payload)
      .pipe(
        takeUntil($destroyed),
        concatMap((pingResp) => {
          this.pingResponse.set(pingResp);
          if (pingResp) {
            return this.api.getActivityStats();
          } else {
            return of(null);
          }
        }),
      )
      .subscribe({
        next: (activityStatsResp) => {
          this.activityStats.set(activityStatsResp);
        },
        error: (err) => {
          console.log('getActivityStats error', err);
        },
        complete: () => {
          $destroyed.next();
          $destroyed.complete();
        },
      });
  }
  private handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopPing();
      } else {
        this.startPing();
        this.resetInactivityTimer();
      }
    });
  }
  private readonly KEY = 'visitor_id';
  getVisitorId(): string {
    try {
      let id = localStorage.getItem(this.KEY);
      if (id) return id;
      id = crypto.randomUUID();

      try {
        localStorage.setItem(this.KEY, id);
        return id;
      } catch (err) {
        console.log('localStorage set item error', err);
        return crypto.randomUUID();
      }
    } catch (err) {
      console.log('localStorage get item error', err);
      return crypto.randomUUID();
    }
  }
  // ngOnDestroy() {
  //   clearInterval(this.pingIntervalId);
  // }
  ngOnDestroy() {
    this.stopPing();
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
    }
  }
}
