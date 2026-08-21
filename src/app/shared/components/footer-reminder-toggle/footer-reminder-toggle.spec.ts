import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterReminderToggle } from './footer-reminder-toggle';

describe('FooterReminderToggle', () => {
  let component: FooterReminderToggle;
  let fixture: ComponentFixture<FooterReminderToggle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterReminderToggle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterReminderToggle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
