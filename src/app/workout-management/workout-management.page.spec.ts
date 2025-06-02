import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutManagementPage } from './workout-management.page';

describe('WorkoutManagementPage', () => {
  let component: WorkoutManagementPage;
  let fixture: ComponentFixture<WorkoutManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkoutManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
