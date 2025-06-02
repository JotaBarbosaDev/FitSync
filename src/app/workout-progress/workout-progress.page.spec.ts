import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutProgressPage } from './workout-progress.page';

describe('WorkoutProgressPage', () => {
  let component: WorkoutProgressPage;
  let fixture: ComponentFixture<WorkoutProgressPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkoutProgressPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
