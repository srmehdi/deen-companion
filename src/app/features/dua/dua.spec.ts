import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dua } from './dua';

describe('Dua', () => {
  let component: Dua;
  let fixture: ComponentFixture<Dua>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dua]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dua);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
