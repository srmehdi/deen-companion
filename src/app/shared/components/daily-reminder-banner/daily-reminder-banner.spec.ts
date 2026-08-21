import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyReminderBanner } from './daily-reminder-banner';

describe('DailyReminderBanner', () => {
  let component: DailyReminderBanner;
  let fixture: ComponentFixture<DailyReminderBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyReminderBanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyReminderBanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
