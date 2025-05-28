import { TestBed } from '@angular/core/testing';

import { WorkoutCreatorService } from './workout-creator.service';

describe('WorkoutCreatorService', () => {
  let service: WorkoutCreatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkoutCreatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
