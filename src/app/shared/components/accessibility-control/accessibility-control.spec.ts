import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessibilityControlComponent } from './accessibility-control';

describe('AccessibilityControl', () => {
  let component: AccessibilityControlComponent;
  let fixture: ComponentFixture<AccessibilityControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessibilityControlComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessibilityControlComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
