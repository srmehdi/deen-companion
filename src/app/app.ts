import { Component, inject, Inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './features/header/header';
import { Footer } from './features/footer/footer';
import { PremiumCard } from './shared/components/premium-card/premium-card';
import { DOCUMENT } from '@angular/common';
import { Activity } from './core/services/activity/activity';
import { AccessibilityControlComponent } from './shared/components/accessibility-control/accessibility-control';
import { AudioPlayer } from './shared/components/audio-player/audio-player';
import { ScrollTopModule } from 'primeng/scrolltop';
import { StatusModal } from './shared/modals/status-modal/status-modal';
import { StatusModalService } from './core/services/status-modal-service/status-modal-service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Header,
    PremiumCard,
    Footer,
    AccessibilityControlComponent,
    AudioPlayer,
    ScrollTopModule,
    StatusModal,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('islamic-app');
  public modalService = inject(StatusModalService);
  constructor() {}
  ngOnInit() {}
}
