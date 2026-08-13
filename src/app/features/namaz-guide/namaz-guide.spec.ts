import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamazGuide } from './namaz-guide';

describe('NamazGuide', () => {
  let component: NamazGuide;
  let fixture: ComponentFixture<NamazGuide>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NamazGuide]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NamazGuide);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
