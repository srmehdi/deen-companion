import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Hadees } from './hadees';

describe('Hadees', () => {
  let component: Hadees;
  let fixture: ComponentFixture<Hadees>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hadees]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Hadees);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
