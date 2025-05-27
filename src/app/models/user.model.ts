export interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth?: Date;
  height?: number; // cm
  weight?: number; // kg
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  height?: number;
  weight?: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
}

export interface LoginData {
  email: string;
  password: string;
}
