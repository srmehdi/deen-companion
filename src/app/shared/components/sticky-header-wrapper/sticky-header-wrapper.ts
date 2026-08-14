import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { HeaderStateService } from '../../../core/services/header-state-service/header-state-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sticky-header-wrapper',
  imports: [CommonModule],
  templateUrl: './sticky-header-wrapper.html',
  styleUrl: './sticky-header-wrapper.css',
})
export class StickyHeaderWrapper implements OnDestroy {
  public headerState = inject(HeaderStateService);
  private ngZone = inject(NgZone);

  readonly headerHeight = input<number>(72);
  readonly showPullHandle = input<boolean>(true);
  readonly scrollContainerSelector = input<string | null>('main');

  readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      this.initObserver();
    });
  }

  private initObserver(): void {
    const sentinelEl = this.sentinel()?.nativeElement;
    if (!sentinelEl) return;

    const containerSelector = this.scrollContainerSelector();
    const rootEl = containerSelector
      ? document.querySelector<HTMLElement>(containerSelector)
      : null;

    const offset = this.headerHeight();

    this.ngZone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          const isTouchingHeader = !entry.isIntersecting && entry.boundingClientRect.top <= offset;

          this.ngZone.run(() => {
            this.headerState.isHeaderHidden.set(isTouchingHeader);
          });
        },
        {
          root: rootEl,
          rootMargin: `-${offset}px 0px 0px 0px`,
          threshold: [0, 1],
        },
      );

      this.observer.observe(sentinelEl);
    });
  }

  restoreHeader(): void {
    this.headerState.isHeaderHidden.set(false);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.headerState.isHeaderHidden.set(false);
  }
}
