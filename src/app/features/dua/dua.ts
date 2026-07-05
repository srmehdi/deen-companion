import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { ButtonModule } from 'primeng/button';
// import { TableModule } from 'primeng/table';
// import { CardModule } from 'primeng/card';
// import { FileUploadModule, FileUploadEvent } from 'primeng/fileupload';
// import { TagModule } from 'primeng/tag';
// import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { FileUploadModule } from 'primeng/fileupload';
import { SelectButtonModule } from 'primeng/selectbutton';
// import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { PremiumCard } from '../../shared/components/premium-card/premium-card';

@Component({
  selector: 'app-dua',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    CardModule,
    FileUploadModule,
    TagModule,
    TabsModule,
    ToastModule,
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    CardModule,
    TagModule,
    TabsModule,
    FileUploadModule,
    SelectButtonModule,
    // DropdownModule,
    TooltipModule,
    MessageModule,
    PremiumCard,
  ],
  providers: [MessageService],
  templateUrl: './dua.html',
  styleUrl: './dua.css',
})
export class Dua {}
