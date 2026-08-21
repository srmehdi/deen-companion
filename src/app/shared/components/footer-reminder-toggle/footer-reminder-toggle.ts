import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification-service/notification-service';

@Component({
  selector: 'app-footer-reminder-toggle',
  imports: [CommonModule, FormsModule],
  templateUrl: './footer-reminder-toggle.html',
  styleUrl: './footer-reminder-toggle.css',
})
export class FooterReminderToggle {
  notificationService = inject(NotificationService);
  async ngOnInit(): Promise<void> {
    // await this.checkSubscriptionState();
    // await this.notificationService.checkSubscriptionState();
  }

  private destroyRef = inject(DestroyRef);
  async onToggle(): Promise<void> {
    // if (this.isLoading) return;

    if (this.notificationService.isSubscribed()) {
      await this.notificationService.disableReminders();
    } else {
      await this.notificationService.enableReminders();
    }
  }
}
