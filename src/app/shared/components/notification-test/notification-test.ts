import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { ApiService } from '../../../core/services/api-service/api-service';
import { StatusModalService } from '../../../core/services/status-modal-service/status-modal-service';

@Component({
  selector: 'app-notification-test',
  imports: [CommonModule],
  templateUrl: './notification-test.html',
  styleUrl: './notification-test.css',
})
export class NotificationTest {
  private swPush = inject(SwPush);
  private http = inject(ApiService);

  readonly VAPID_PUBLIC_KEY =
    'BKHNPrhIp3-xXlBNCEFzTmlZP4oYpqfWTaydkQPJTBTA445vhxZ-phzOwLgb86_h0mVPw4i0v0PYWjYdksVwdbE';

  isLoading = false;
  statusMessage = '';

  modal = inject(StatusModalService);
  async subscribeAndSendTest() {
    if (!this.swPush.isEnabled) {
      this.statusMessage = 'Service Worker / Push is not enabled in this browser.';
      this.modal.showError({ message: this.statusMessage });
      return;
    }

    try {
      this.isLoading = true;
      this.statusMessage = 'Requesting permission...';
      this.modal.showLoading(this.statusMessage);
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY,
      });
      this.statusMessage = 'Subscribed! Triggering notification...';
      this.modal.showLoading(this.statusMessage);
      this.http
        .sendPush({
          subscription: subscription,
          title: 'Test Notification!',
          body: 'This is a test notification.',
        })
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.statusMessage = 'Notification sent successfully! Check your screen/tray.';
            this.modal.showSuccess({ message: this.statusMessage });
          },
          error: (err) => {
            this.isLoading = false;
            this.statusMessage =
              'Failed to send notification: ' + (err.error?.error || err.message);
            this.modal.showError({ message: this.statusMessage });
          },
        });
    } catch (err: any) {
      this.isLoading = false;
      this.statusMessage = 'Subscription rejected: ' + err.message;
      this.modal.showError({ message: this.statusMessage });
    }
  }

  // Unsubscribe from notifications
  unsubscribeFromNotifications() {
    this.swPush
      .unsubscribe()
      .then(() => {
        console.log('Unsubscribed from notifications');
      })
      .catch((error) => {
        console.error('Error unsubscribing', error);
      });
  }
}
