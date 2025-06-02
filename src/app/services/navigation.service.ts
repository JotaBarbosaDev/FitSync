import { Injectable } from '@angular/core';
import { Router, NavigationExtras, ActivatedRoute } from '@angular/router';

type NavigationParams = { [key: string]: string | number | boolean | undefined };

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  constructor(
    private router: Router
  ) {}

  // Navigate to specific page
  navigateTo(route: string | string[], extras?: NavigationExtras): Promise<boolean> {
    return this.router.navigate(Array.isArray(route) ? route : [route], extras);
  }

  // Navigate with parameters
  navigateWithParams(route: string, params: NavigationParams, queryParams?: NavigationParams): Promise<boolean> {
    const navigationExtras: NavigationExtras = {
      queryParams: queryParams
    };
    
    // Replace route parameters
    let finalRoute = route;
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined) {
        finalRoute = finalRoute.replace(`:${key}`, String(value));
      }
    });

    return this.router.navigate([finalRoute], navigationExtras);
  }

  // Navigate to workout detail
  navigateToWorkoutDetail(workoutId: string, params?: NavigationParams): Promise<boolean> {
    return this.navigateWithParams('/detalhe/:id', { id: workoutId }, params);
  }

  // Navigate to exercise detail
  navigateToExerciseDetail(exerciseId: string, params?: NavigationParams): Promise<boolean> {
    console.log('🧭 NavigationService: Navegando para exercise-detail com ID:', exerciseId);
    if (params) {
      return this.navigateWithParams('/exercise-detail/:id', { id: exerciseId }, params);
    }
    return this.navigateTo(['/exercise-detail', exerciseId]);
  }

  // Navigate to progress with date filter
  navigateToProgress(period?: 'week' | 'month' | 'year'): Promise<boolean> {
    const queryParams = period ? { period } : undefined;
    return this.navigateWithParams('/tabs/progresso', {}, queryParams);
  }

  // Navigate to workout plans
  navigateToWorkoutPlans(difficulty?: string): Promise<boolean> {
    const queryParams = difficulty ? { difficulty } : undefined;
    return this.navigateWithParams('/tabs/lista', {}, queryParams);
  }

  // Navigate back
  goBack(): void {
    window.history.back();
  }

  // Navigate forward
  goForward(): void {
    window.history.forward();
  }

  // Navigate to root
  navigateToHome(): Promise<boolean> {
    return this.navigateTo('/tabs/home');
  }

  // Navigate to dashboard
  navigateToDashboard(): Promise<boolean> {
    return this.navigateTo('/tabs/home');
  }

  // Navigate to achievements
  navigateToAchievements(): Promise<boolean> {
    return this.navigateTo('/tabs/progresso');
  }

  // Navigate with state
  navigateWithState(route: string, state: Record<string, unknown>): Promise<boolean> {
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
    return this.navigateWithParams('/tabs/lista', {}, { muscleGroup });
  }

  // Navigate to profile settings
  navigateToProfile(): Promise<boolean> {
    return this.navigateTo('/tabs/dashboard');
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
    return this.navigateTo('/tabs/lista');
  }

  // Navigate to workouts
  navigateToWorkouts(): Promise<boolean> {
    return this.navigateTo('/tabs/detalhe');
  }

  // Navigate to quick workout
  navigateToQuickWorkout(): Promise<boolean> {
    return this.navigateTo('/tabs/detalhe');
  }

  // Navigate to workout creator
  navigateToWorkoutCreator(): Promise<boolean> {
    return this.navigateTo('/workout-creator');
  }

  // Enhanced navigate to exercise detail with parameters
  navigateToExerciseDetailWithParams(exerciseId: string, params?: NavigationParams): Promise<boolean> {
    return this.navigateWithParams('/exercise-detail/:id', { id: exerciseId }, params);
  }

  // Get route parameters from activated route
  getRouteParams(activatedRoute: ActivatedRoute): NavigationParams {
    return activatedRoute.snapshot.params;
  }

  // Get query parameters from activated route
  getQueryParams(activatedRoute: ActivatedRoute): NavigationParams {
    return activatedRoute.snapshot.queryParams;
  }

  // Get route data
  getRouteData(activatedRoute: ActivatedRoute): Record<string, unknown> {
    return activatedRoute.snapshot.data;
  }

  // Get navigation state
  getNavigationState(): Record<string, unknown> | undefined {
    return this.router.getCurrentNavigation()?.extras?.state;
  }
}
