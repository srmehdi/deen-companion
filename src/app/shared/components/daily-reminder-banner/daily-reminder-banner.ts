import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { DialogModule } from 'primeng/dialog';
import { ApiService } from '../../../core/services/api-service/api-service';
import { StatusModalService } from '../../../core/services/status-modal-service/status-modal-service';
import { Activity } from '../../../core/services/activity/activity';
import { NotificationService } from '../../../core/services/notification-service/notification-service';

@Component({
  selector: 'app-daily-reminder-banner',
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: './daily-reminder-banner.html',
  styleUrl: './daily-reminder-banner.css',
})
export class DailyReminderBannerComponent implements OnInit {
  private swPush = inject(SwPush);
  private api = inject(ApiService);
  private modal = inject(StatusModalService);

  readonly VAPID_PUBLIC_KEY =
    'BKHNPrhIp3-xXlBNCEFzTmlZP4oYpqfWTaydkQPJTBTA445vhxZ-phzOwLgb86_h0mVPw4i0v0PYWjYdksVwdbE';
  readonly STORAGE_KEY = 'daily_reminder_dialog_dismissed';

  isVisible = false;
  isLoading = false;

  ngOnInit(): void {
    this.checkVisibility();
  }

  notificationService = inject(NotificationService);
  private checkVisibility(): void {
    if (!this.swPush.isEnabled) {
      this.isVisible = false;
      return;
    }

    const isDismissed = localStorage.getItem(this.STORAGE_KEY) === 'true';
    // const isGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';

    // if (isDismissed || isGranted) {
    //   this.isVisible = false;
    //   return;
    // }
    if (isDismissed || this.notificationService.isSubscribed()) {
      this.isVisible = false;
      return;
    }

    // Small delay for smooth entry after page load
    setTimeout(() => {
      this.isVisible = true;
    }, 800);
  }

  activity = inject(Activity);

  dismiss(): void {
    localStorage.setItem(this.STORAGE_KEY, 'true');
    this.isVisible = false;
  }
}
