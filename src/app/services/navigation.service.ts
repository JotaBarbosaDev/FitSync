import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  constructor(
    private router: Router,
    private location: Location
  ) {}

  // Navigate to specific page
  navigateTo(route: string | string[], extras?: NavigationExtras): Promise<boolean> {
    return this.router.navigate(Array.isArray(route) ? route : [route], extras);
  }

  // Navigate with parameters
  navigateWithParams(route: string, params: { [key: string]: any }, queryParams?: { [key: string]: any }): Promise<boolean> {
    const navigationExtras: NavigationExtras = {
      queryParams: queryParams
    };
    
    // Replace route parameters
    let finalRoute = route;
    Object.keys(params).forEach(key => {
      finalRoute = finalRoute.replace(`:${key}`, params[key]);
    });

    return this.router.navigate([finalRoute], navigationExtras);
  }

  // Navigate to workout detail
  navigateToWorkoutDetail(workoutId: string, params?: { [key: string]: any }): Promise<boolean> {
    return this.navigateWithParams('/detalhe/:id', { id: workoutId }, params);
  }

  // Navigate to exercise detail
  navigateToExerciseDetail(exerciseId: string, params?: { [key: string]: any }): Promise<boolean> {
    if (params) {
      return this.navigateWithParams('/exercise-detail/:id', { id: exerciseId }, params);
    }
    return this.navigateTo(['/exercise-detail', exerciseId]);
  }

  // Navigate to progress with date filter
  navigateToProgress(period?: 'week' | 'month' | 'year'): Promise<boolean> {
    const queryParams = period ? { period } : undefined;
    return this.navigateWithParams('/progresso', {}, queryParams);
  }

  // Navigate to workout plans
  navigateToWorkoutPlans(difficulty?: string): Promise<boolean> {
    const queryParams = difficulty ? { difficulty } : undefined;
    return this.navigateWithParams('/lista', {}, queryParams);
  }

  // Navigate back
  goBack(): void {
    this.location.back();
  }

  // Navigate forward
  goForward(): void {
    this.location.forward();
  }

  // Navigate to root
  navigateToHome(): Promise<boolean> {
    return this.navigateTo('/home');
  }

  // Navigate to dashboard
  navigateToDashboard(): Promise<boolean> {
    return this.navigateTo('/dashboard');
  }

  // Navigate to achievements
  navigateToAchievements(): Promise<boolean> {
    return this.navigateTo('/progress/achievements');
  }

  // Navigate with state
  navigateWithState(route: string, state: any): Promise<boolean> {
    return this.router.navigate([route], { state });
  }

  // Get current route
  getCurrentRoute(): string {
    return this.router.url;
  }

  // Check if current route matches
  isCurrentRoute(route: string): boolean {
    return this.router.url === route;
  }

  // Navigate and replace current history entry
  navigateAndReplace(route: string): Promise<boolean> {
    return this.router.navigate([route], { replaceUrl: true });
  }

  // Navigate with animation
  navigateWithAnimation(route: string, animation: 'slide' | 'fade' | 'none' = 'slide'): Promise<boolean> {
    const navigationExtras: NavigationExtras = {
      state: { animation }
    };
    return this.router.navigate([route], navigationExtras);
  }

  // Navigate to workout with muscle group filter
  navigateToWorkoutsWithFilter(muscleGroup: string): Promise<boolean> {
    return this.navigateWithParams('/lista', {}, { muscleGroup });
  }

  // Navigate to profile settings
  navigateToProfile(): Promise<boolean> {
    return this.navigateTo('/profile');
  }

  // Navigate to login
  navigateToLogin(): Promise<boolean> {
    return this.navigateTo('/auth/login');
  }

  // Navigate to register
  navigateToRegister(): Promise<boolean> {
    return this.navigateTo('/auth/register');
  }

  // Logout and navigate to login
  logoutAndNavigate(): Promise<boolean> {
    // Clear any user data here if needed
    return this.navigateAndReplace('/auth/login');
  }

  // Navigate to workout creation
  navigateToCreateWorkout(templateId?: string): Promise<boolean> {
    const queryParams = templateId ? { template: templateId } : undefined;
    return this.navigateWithParams('/workout/create', {}, queryParams);
  }

  // Navigate to exercises list
  navigateToExercisesList(): Promise<boolean> {
    return this.navigateTo('/exercises');
  }

  // Navigate to workouts
  navigateToWorkouts(): Promise<boolean> {
    return this.navigateTo('/workouts');
  }

  // Navigate to quick workout
  navigateToQuickWorkout(): Promise<boolean> {
    return this.navigateTo('/quick-workout');
  }

  // Navigate to workout creator
  navigateToWorkoutCreator(): Promise<boolean> {
    return this.navigateTo('/workout-creator');
  }

  // Enhanced navigate to exercise detail with parameters
  navigateToExerciseDetailWithParams(exerciseId: string, params?: { [key: string]: any }): Promise<boolean> {
    return this.navigateWithParams('/exercise-detail/:id', { id: exerciseId }, params);
  }

  // Get route parameters from activated route
  getRouteParams(activatedRoute: ActivatedRoute): { [key: string]: any } {
    return activatedRoute.snapshot.params;
  }

  // Get query parameters from activated route
  getQueryParams(activatedRoute: ActivatedRoute): { [key: string]: any } {
    return activatedRoute.snapshot.queryParams;
  }

  // Get route data
  getRouteData(activatedRoute: ActivatedRoute): any {
    return activatedRoute.snapshot.data;
  }

  // Get navigation state
  getNavigationState(): any {
    return this.router.getCurrentNavigation()?.extras?.state;
  }
}
