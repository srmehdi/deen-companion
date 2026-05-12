import { Directive, ElementRef, inject, output } from '@angular/core';

@Directive({
  selector: '[appOverflowCheck]',
})
export class OverflowCheck {
  hasOverflow = output<boolean>();
  private el = inject(ElementRef);
  constructor() {}

  ngAfterViewInit() {
    const element = this.el.nativeElement;

    const check = () => {
      const isOverflowing = element.scrollHeight > element.clientHeight;
      this.hasOverflow.emit(isOverflowing);
    };

    check();
    new ResizeObserver(check).observe(element);
  }
}
