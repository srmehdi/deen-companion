import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-accessibility-control',
  standalone: true,
  imports: [],
  templateUrl: './accessibility-control.html',
  styleUrl: './accessibility-control.css',
})
export class AccessibilityControlComponent {
  isOpen = signal(false);
  fontSize = signal<number>(110);

  togglePanel(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.startCollapseTimer();
    } else {
      this.clearCollapseTimer();
    }
  }
  ngOnInit() {
    const saved = localStorage.getItem('user-font-size');
    if (saved) {
      this.fontSize.set(parseInt(saved, 10));
      this.applyFontSize(+this.fontSize());
    }
  }
  onSliderChange(event: any) {
    this.fontSize.set(event.target.value);
    this.applyFontSize(+this.fontSize());
  }

  private applyFontSize(value: number) {
    document.documentElement.style.setProperty('--base-font-size', `${value}%`);
    localStorage.setItem('user-font-size', value.toString());
  }
  resetFontSize() {
    this.fontSize.set(110);
    this.applyFontSize(+this.fontSize());
  }
  increaseFontSize() {
    if (+this.fontSize() < 180) {
      this.fontSize.set(Math.min(+this.fontSize() + 10, 180));
      this.applyFontSize(+this.fontSize());
    }
  }

  decreaseFontSize() {
    if (+this.fontSize() > 80) {
      this.fontSize.set(Math.max(+this.fontSize() - 10, 80));
      this.applyFontSize(+this.fontSize());
    }
  }

  private collapseTimeout: ReturnType<typeof setTimeout> | null = null;
  private startCollapseTimer() {
    this.clearCollapseTimer();

    this.collapseTimeout = setTimeout(() => {
      this.isOpen.set(false);
    }, 4000);
  }

  private clearCollapseTimer() {
    if (this.collapseTimeout) {
      clearTimeout(this.collapseTimeout);
      this.collapseTimeout = null;
    }
  }
  keepDockOpen() {
    if (this.isOpen()) {
      this.startCollapseTimer();
    }
  }
  toggleDock() {
    this.isOpen.set(!this.isOpen());

    if (this.isOpen()) {
      this.startCollapseTimer();
    } else {
      this.clearCollapseTimer();
    }
  }
}
