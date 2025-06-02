import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutExecutionPage } from './workout-execution.page';

describe('WorkoutExecutionPage', () => {
  let component: WorkoutExecutionPage;
  let fixture: ComponentFixture<WorkoutExecutionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkoutExecutionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
