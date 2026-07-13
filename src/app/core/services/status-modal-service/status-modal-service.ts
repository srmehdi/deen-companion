import { Injectable, signal } from '@angular/core';

export type ModalState = 'initializing' | 'loading' | 'success' | 'error' | null;

export interface GlobalModalConfig {
  message?: string;
  fn?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class StatusModalService {
  // START STATE AT 'initializing' INSTEAD OF null TO SHIELD FIRST LOAD
  state = signal<ModalState>('initializing');
  title = signal('Bismillah');
  message = signal('Preparing your spiritual reading environment...');
  private currentCallback: (() => void) | null = null;

  showLoading(message = 'Please wait. This might take sometime.') {
    this.currentCallback = null;
    this.state.set('loading');
    this.title.set('Loading...');
    this.message.set(message);
  }

  showSuccess(config?: GlobalModalConfig) {
    this.state.set('success');
    this.title.set('Success');
    this.message.set(config?.message || 'Success');
    this.currentCallback = config?.fn || null;
  }

  showError(config?: GlobalModalConfig) {
    this.state.set('error');
    this.title.set('Error');
    this.message.set(config?.message || 'Something went wrong.');
    this.currentCallback = config?.fn || null;
  }

  close() {
    const callback = this.currentCallback;
    this.state.set(null);
    this.currentCallback = null;

    if (typeof callback === 'function') {
      callback();
    }
  }
}
