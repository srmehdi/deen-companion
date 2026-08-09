import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'quran',
    loadComponent: () => import('./features/quran/quran').then((m) => m.Quran),
  },
  {
    path: 'quran/:id',
    loadComponent: () => import('./features/quran/quran').then((m) => m.Quran),
  },
  {
    path: 'hadees',
    loadComponent: () => import('./features/hadees/hadees').then((m) => m.Hadees),
  },
  {
    path: 'hadees/:collectionKey',
    loadComponent: () => import('./features/hadees/hadees').then((m) => m.Hadees),
  },
  {
    path: 'dua',
    loadComponent: () => import('./features/dua/dua').then((m) => m.Dua),
  },
  {
    path: 'islamic-videos',
    loadComponent: () => import('./features/media/media').then((m) => m.MediaComponent),
  },
];
