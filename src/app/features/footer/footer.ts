import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ApiService } from '../../core/services/api-service/api-service';

@Component({
  selector: 'app-footer',
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  constructor(private http: ApiService) {
    this.getActivityStats();
  }

  activityStats: any = signal(null);
  getActivityStats() {
    this.http.getActivityStats().subscribe({
      next: (resp) => {
        // console.log('getActivityStats resp', resp);
        this.activityStats.set(resp);
      },
      error: (err) => {
        console.log('getActivityStats error', err);
      },
    });
  }
}
