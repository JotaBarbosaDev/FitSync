import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExerciseDetailPage } from './exercise-detail.page';

describe('ExerciseDetailPage', () => {
  let component: ExerciseDetailPage;
  let fixture: ComponentFixture<ExerciseDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ExerciseDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
