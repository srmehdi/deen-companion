import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mobile-bottom-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './mobile-bottom-nav.html',
  styleUrl: './mobile-bottom-nav.css',
})
export class MobileBottomNav {}
