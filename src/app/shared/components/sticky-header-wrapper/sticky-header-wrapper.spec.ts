import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StickyHeaderWrapper } from './sticky-header-wrapper';

describe('StickyHeaderWrapper', () => {
  let component: StickyHeaderWrapper;
  let fixture: ComponentFixture<StickyHeaderWrapper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StickyHeaderWrapper]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StickyHeaderWrapper);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
