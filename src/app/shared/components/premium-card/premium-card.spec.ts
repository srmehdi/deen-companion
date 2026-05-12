import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PremiumCard } from './premium-card';

describe('PremiumCard', () => {
  let component: PremiumCard;
  let fixture: ComponentFixture<PremiumCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PremiumCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PremiumCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
