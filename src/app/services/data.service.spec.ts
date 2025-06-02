import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { AppData, User } from '../models';

describe('DataService', () => {
  let service: DataService;
  let originalLocalStorage: Storage;

  const mockAppData: AppData = {
    version: '1.0.0',
    lastUpdated: '2024-01-01T00:00:00.000Z',
    users: [{
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      fitnessLevel: 'intermediate',
      goals: ['strength'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }],
    plans: [],
    days: [],
    workouts: [],
    exercises: [],
    sets: [],
    workoutSessions: [],
    exerciseLibrary: []
  };

  beforeEach(() => {
    // Mock localStorage
    let store: { [key: string]: string } = {};
    
    originalLocalStorage = localStorage;
    
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      store[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete store[key];
    });
    spyOn(localStorage, 'clear').and.callFake(() => {
      store = {};
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial data loading', () => {
    it('should create initial data when localStorage is empty', (done) => {
      service.data$.subscribe(data => {
        if (data) {
          expect(data.version).toBe('1.0.0');
          expect(data.users).toBeDefined();
          expect(data.users.length).toBe(1);
          expect(data.users[0].email).toBe('demo@fitsync.app');
          expect(localStorage.setItem).toHaveBeenCalledWith('fitsync_data', jasmine.any(String));
          done();
        }
      });
    });

    it('should load existing data from localStorage', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(mockAppData));
      
      const newService = TestBed.inject(DataService);
      
      expect(newService.getCurrentData()).toEqual(mockAppData);
    });

    it('should handle corrupted localStorage data', (done) => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid-json');
      
      const newService = TestBed.inject(DataService);
      
      newService.data$.subscribe(data => {
        if (data) {
          expect(data.version).toBe('1.0.0');
          expect(data.users).toBeDefined();
          done();
        }
      });
    });
  });

  describe('loadData', () => {
    it('should load data from localStorage successfully', (done) => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(mockAppData));
      
      service.loadData().subscribe(data => {
        expect(data).toEqual(mockAppData);
        done();
      });
    });

    it('should return data$ observable when no localStorage data', (done) => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      
      service.loadData().subscribe(data => {
        // Should return current data from service
        expect(data).toBeDefined();
        done();
      });
    });

    it('should handle JSON parse error gracefully', (done) => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid-json');
      
      service.loadData().subscribe(data => {
        // Should return data$ observable when parse fails
        expect(data).toBeDefined();
        done();
      });
    });
  });

  describe('saveData', () => {
    it('should save data successfully', async () => {
      const result = await service.saveData(mockAppData);
      
      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('fitsync_data', jasmine.any(String));
      
      const savedData = JSON.parse((localStorage.setItem as jasmine.Spy).calls.mostRecent().args[1]);
      expect(savedData.version).toBe(mockAppData.version);
      expect(savedData.lastUpdated).toBeDefined();
    });

    it('should update lastUpdated timestamp when saving', async () => {
      const originalTimestamp = mockAppData.lastUpdated;
      
      await service.saveData(mockAppData);
      
      const savedData = JSON.parse((localStorage.setItem as jasmine.Spy).calls.mostRecent().args[1]);
      expect(savedData.lastUpdated).not.toBe(originalTimestamp);
    });

    it('should handle save errors', async () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage quota exceeded');
      
      const result = await service.saveData(mockAppData);
      
      expect(result).toBe(false);
    });

    it('should update data subject after successful save', async () => {
      const initialData = service.getCurrentData();
      
      await service.saveData(mockAppData);
      
      const updatedData = service.getCurrentData();
      expect(updatedData).toEqual(jasmine.objectContaining({
        version: mockAppData.version,
        users: mockAppData.users
      }));
    });
  });

  describe('exportData', () => {
    it('should export current data as JSON string', async () => {
      await service.saveData(mockAppData);
      
      const exportedData = await service.exportData();
      const parsedData = JSON.parse(exportedData);
      
      expect(parsedData.version).toBe(mockAppData.version);
      expect(parsedData.users).toEqual(mockAppData.users);
    });

    it('should throw error when no data available', async () => {
      // Clear current data
      (service as any).dataSubject.next(null);
      
      try {
        await service.exportData();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Nenhum dado disponível para exportar');
      }
    });
  });

  describe('importData', () => {
    it('should import valid JSON data successfully', async () => {
      const jsonData = JSON.stringify(mockAppData);
      
      const result = await service.importData(jsonData);
      
      expect(result).toBe(true);
      expect(service.getCurrentData()).toEqual(jasmine.objectContaining({
        version: mockAppData.version,
        users: mockAppData.users
      }));
    });

    it('should handle invalid JSON data', async () => {
      const invalidJsonData = 'invalid-json';
      
      const result = await service.importData(invalidJsonData);
      
      expect(result).toBe(false);
    });

    it('should handle import errors', async () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage error');
      const jsonData = JSON.stringify(mockAppData);
      
      const result = await service.importData(jsonData);
      
      expect(result).toBe(false);
    });
  });

  describe('getCurrentData', () => {
    it('should return current data', async () => {
      await service.saveData(mockAppData);
      
      const currentData = service.getCurrentData();
      
      expect(currentData).toEqual(jasmine.objectContaining({
        version: mockAppData.version,
        users: mockAppData.users
      }));
    });

    it('should return null when no data available', () => {
      (service as any).dataSubject.next(null);
      
      const currentData = service.getCurrentData();
      
      expect(currentData).toBeNull();
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = service.generateId();
      const id2 = service.generateId();
      
      expect(id1).toContain('id_');
      expect(id2).toContain('id_');
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct format', () => {
      const id = service.generateId();
      
      expect(id).toMatch(/^id_[a-z0-9]+$/);
    });
  });

  describe('updateDataSection', () => {
    beforeEach(async () => {
      await service.saveData(mockAppData);
    });

    it('should update specific data section', () => {
      const newUsers: User[] = [{
        id: 'user2',
        email: 'new@example.com',
        name: 'New User',
        fitnessLevel: 'beginner',
        goals: ['weight_loss'],
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      
      service.updateDataSection('users', newUsers);
      
      const updatedData = service.getCurrentData();
      expect(updatedData?.users).toEqual(newUsers);
    });

    it('should not update when no current data', () => {
      (service as any).dataSubject.next(null);
      
      service.updateDataSection('users', []);
      
      expect(service.getCurrentData()).toBeNull();
    });

    it('should save data after updating section', () => {
      const saveDataSpy = spyOn(service, 'saveData');
      
      service.updateDataSection('users', []);
      
      expect(saveDataSpy).toHaveBeenCalled();
    });
  });

  describe('data$ observable', () => {
    it('should emit data changes', (done) => {
      let emissionCount = 0;
      
      service.data$.subscribe(data => {
        emissionCount++;
        if (emissionCount === 2 && data) { // Skip initial emission
          expect(data.version).toBe(mockAppData.version);
          done();
        }
      });
      
      service.saveData(mockAppData);
    });

    it('should emit null initially when no data', (done) => {
      const newService = new DataService();
      
      newService.data$.subscribe(data => {
        expect(data).toBeNull();
        done();
      });
    });
  });

  describe('error handling', () => {
    it('should create fallback data on initialization error', () => {
      (localStorage.getItem as jasmine.Spy).and.throwError('localStorage error');
      
      const newService = TestBed.inject(DataService);
      
      expect(newService.getCurrentData()).toBeDefined();
      expect(newService.getCurrentData()?.version).toBe('1.0.0');
    });

    it('should handle localStorage quota exceeded', async () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');
      
      const result = await service.saveData(mockAppData);
      
      expect(result).toBe(false);
    });
  });
});
