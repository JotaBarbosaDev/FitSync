import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeeklyPlanPage } from './weekly-plan.page';

describe('WeeklyPlanPage', () => {
  let component: WeeklyPlanPage;
  let fixture: ComponentFixture<WeeklyPlanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WeeklyPlanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
