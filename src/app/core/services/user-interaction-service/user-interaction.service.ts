import { Injectable, signal, NgZone, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserInteractionService {
  private ngZone = inject(NgZone);

  // Dynamic signal tracking active interaction status
  public isInteracting = signal<boolean>(false);
  private interactionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly inactivityDelay = 5000;

  constructor() {
    this.initGlobalListeners();
  }

  private initGlobalListeners(): void {
    // Run outside Angular zone to avoid triggering unnecessary Change Detection on every mousemove/scroll event
    this.ngZone.runOutsideAngular(() => {
      const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'wheel', 'click'];

      events.forEach((eventName) => {
        window.addEventListener(
          eventName,
          () => {
            // console.log('isInteracting', this.isInteracting(), eventName);

            this.handleUserActivity();
          },
          { passive: true },
        );
      });
    });
  }

  private handleUserActivity(): void {
    if (!this.isInteracting()) {
      this.ngZone.run(() => this.isInteracting.set(true));
    }

    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }

    this.interactionTimeout = setTimeout(() => {
      this.ngZone.run(() => this.isInteracting.set(false));
    }, this.inactivityDelay);
  }
}
