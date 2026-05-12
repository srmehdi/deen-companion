import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, signal } from '@angular/core';
import { ThemeService } from '../../core/services/theme-service/theme-service';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  constructor(
    public theme: ThemeService,
    private eRef: ElementRef,
  ) {}
  isToggle = signal<boolean>(false);
  toggleMenu() {
    this.isToggle.update((v) => !v);
  }
  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.isToggle() && !this.eRef.nativeElement.contains(event.target)) {
      this.isToggle.set(false);
    }
  }
}
