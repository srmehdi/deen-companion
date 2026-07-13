import { Component, DOCUMENT, effect, inject, input, output } from '@angular/core';
import { ModalState } from '../../../core/services/status-modal-service/status-modal-service';

@Component({
  selector: 'app-status-modal',
  imports: [],
  templateUrl: './status-modal.html',
  styleUrl: './status-modal.css',
})
export class StatusModal {
  // Bind configuration states directly from global inputs
  state = input<ModalState>(null);
  message = input('');

  // Notify root layer shell when the action button is selected
  onClose = output<void>();

  private document = inject(DOCUMENT);

  constructor() {
    // Retain your dynamic body backdrop class toggles nicely here
    effect(() => {
      if (this.state()) {
        this.document.body.classList.add('overflow-hidden');
      } else {
        this.document.body.classList.remove('overflow-hidden');
      }
    });
  }

  close() {
    this.onClose.emit();
  }
}
