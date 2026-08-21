import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwPush } from '@angular/service-worker';
import { StatusModalService } from '../status-modal-service/status-modal-service';
import { Activity } from '../activity/activity';
import { ApiService } from '../api-service/api-service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private swPush = inject(SwPush);
  private modal = inject(StatusModalService);
  private activity = inject(Activity);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  readonly VAPID_PUBLIC_KEY =
    'BKHNPrhIp3-xXlBNCEFzTmlZP4oYpqfWTaydkQPJTBTA445vhxZ-phzOwLgb86_h0mVPw4i0v0PYWjYdksVwdbE';

  isSubscribed = signal(false);
  isLoading = signal(false);
  permissionStatus = signal<NotificationPermission>('default');

  constructor() {
    // Automatically runs once when the service is first injected
    // this.checkSubscriptionState();
  }
  get isPushEnabled(): boolean {
    return this.swPush.isEnabled;
  }

  async checkSubscriptionState(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push/ServiceWorker is not supported in this environment');
      this.isSubscribed.set(false);
      return;
    }

    // Listen for live permission changes (granted/denied/default)
    await this.initPermissionListener();

    try {
      // Direct browser check via PushManager
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      const hasValidSub = !!existingSub && Notification.permission === 'granted';

      this.isSubscribed.set(hasValidSub);

      // Keep listening for runtime Angular SwPush stream updates
      if (this.swPush.isEnabled) {
        this.swPush.subscription.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((sub) => {
          this.isSubscribed.set(!!sub && Notification.permission === 'granted');
        });
      }
    } catch (err) {
      console.error('Error checking push subscription state:', err);
      this.isSubscribed.set(false);
    }
  }

  private async initPermissionListener(): Promise<void> {
    if (!('permissions' in navigator) || !('Notification' in window)) {
      return;
    }

    this.permissionStatus.set(Notification.permission);

    try {
      const status = await navigator.permissions.query({ name: 'notifications' as PermissionName });

      status.onchange = () => {
        // Map PermissionState ('prompt' | 'granted' | 'denied') to NotificationPermission ('default' | 'granted' | 'denied')
        const normalizedPermission: NotificationPermission =
          status.state === 'prompt' ? 'default' : (status.state as NotificationPermission);

        this.permissionStatus.set(normalizedPermission);

        // Clear subscription state if permission is not granted
        if (normalizedPermission === 'denied' || normalizedPermission === 'default') {
          if (this.isSubscribed()) {
            this.isSubscribed.set(false);
            this.syncRevocationWithBackend();
          }
        } else if (normalizedPermission === 'granted') {
          this.checkSubscriptionState();
        }
      };
    } catch (err) {
      console.warn('Permissions API query failed:', err);
    }
  }
  private syncRevocationWithBackend(): void {
    const visitorId = this.activity.getVisitorId();

    try {
      if (this.swPush.isEnabled) {
        this.swPush.unsubscribe().catch(() => {});
      }
    } catch (e) {
      console.warn('Browser unsubscribe warning on permission revocation:', e);
    }

    this.api
      .saveSubscription({
        visitorId,
        subscription: null,
        notifyDailyContent: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err: any) =>
          console.error('Failed to sync permission revocation with backend:', err),
      });
  }

  // Helper to convert base64 VAPID key to Uint8Array for PushManager
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async enableReminders(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      this.modal.showError({ message: 'Push notifications are not supported by this browser.' });
      return;
    }

    try {
      this.isLoading.set(true);
      this.modal.showLoading('Enabling reminders...');

      // Request native notification permission first
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.isLoading.set(false);
        this.modal.showError({ message: 'Notification permission was denied.' });
        return;
      } else if (permission === 'granted') {
        this.modal.showLoading('Notification permission granted. Please wait...');
      }

      // Wait for Service Worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription or create a new one
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const convertedVapidKey = this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
        });
      }
      this.modal.showLoading('Subscribing push notifications...');
      const visitorId = this.activity.getVisitorId();

      // Send subscription JSON payload to backend
      this.api
        .saveSubscription({
          visitorId,
          subscription: subscription.toJSON(),
          notifyDailyContent: true,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubscribed.set(true);
            this.isLoading.set(false);
            this.modal.showSuccess({
              message: 'Daily Hadith & Dua reminders enabled! 🔔',
            });
          },
          error: (err: any) => {
            this.isLoading.set(false);
            this.modal.showError({
              message: 'Failed to save subscription: ' + (err.error?.error || err.message),
            });
          },
        });
    } catch (err: any) {
      this.isLoading.set(false);
      this.modal.showError({
        message: 'Subscription failed: ' + (err.message || 'Unknown error'),
      });
    }
  }

  async disableReminders(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.modal.showLoading('Disabling reminders...');
      const visitorId = this.activity.getVisitorId();

      this.api
        .saveSubscription({
          visitorId,
          subscription: null,
          notifyDailyContent: false,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: async () => {
            // Safe browser-level unsubscription
            await this.safelyUnsubscribeBrowser();

            this.isSubscribed.set(false);
            this.isLoading.set(false);
            this.modal.showSuccess({ message: 'Daily reminders have been disabled.' });
          },
          error: (err: any) => {
            this.isLoading.set(false);
            this.modal.showError({
              message: 'Failed to update preferences: ' + (err.error?.error || err.message),
            });
          },
        });
    } catch (err: any) {
      this.isLoading.set(false);
      this.modal.showError({ message: 'Error disabling reminders: ' + err.message });
    }
  }

  // Safely unsubscribes via native PushManager without blocking execution
  private async safelyUnsubscribeBrowser(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const unsubscribeTask = (async () => {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          this.modal.showLoading('Unsubscribing from push notifications...');
          await sub.unsubscribe();
        }
      })();

      // Safety timeout: Never let unsubscription hang UI for more than 1 second
      const timeoutTask = new Promise<void>((resolve) => setTimeout(resolve, 1000));
      await Promise.race([unsubscribeTask, timeoutTask]);
    } catch (err) {
      console.warn('Native unsubscribe failed:', err);
    }
  }
}
