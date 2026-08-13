import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HeaderStateService {
  autoHideEnabled = signal<boolean>(false);
  isHeaderHidden = signal<boolean>(false);

  enableAutoHide(): void {
    this.autoHideEnabled.set(true);
  }

  disableAutoHide(): void {
    this.autoHideEnabled.set(false);
    this.isHeaderHidden.set(false);
  }
}
