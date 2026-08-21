import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  isDevMode,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth-interceptor/auth-interceptor';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { ConfirmationService, MessageService } from 'primeng/api';
import { provideServiceWorker } from '@angular/service-worker';
import { NotificationService } from './core/services/notification-service/notification-service';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // withInMemoryScrolling({
      //   scrollPositionRestoration: 'top',
      //   // anchorScrolling: 'enabled',
      // }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    ConfirmationService,
    MessageService,
    provideServiceWorker('ngsw-worker.js', {
      // enabled: true,
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => {
      const notificationService = inject(NotificationService);
      return notificationService.checkSubscriptionState();
    }),
  ],
};
