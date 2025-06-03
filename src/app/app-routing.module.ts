import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },

  {
    path: 'auth/login',
    loadChildren: () => import('./auth/login/login.module').then(m => m.LoginPageModule),
    canActivate: [GuestGuard]
  },
  {
    path: 'auth/register',
    loadChildren: () => import('./auth/register/register.module').then(m => m.RegisterPageModule),
    canActivate: [GuestGuard]
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'lista',
    loadChildren: () => import('./lista/lista.module').then(m => m.ListaPageModule)
  },
  {
    path: 'detalhe/:id',
    loadChildren: () => import('./detalhe/detalhe.module').then(m => m.DetalhePageModule)
  },
  {
    path: 'progresso',
    loadChildren: () => import('./progresso/progresso.module').then(m => m.ProgressoPageModule)
  },
  {
    path: 'exercise-detail/:id',
    loadChildren: () => import('./exercise-detail/exercise-detail.module').then(m => m.ExerciseDetailPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./auth/forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
  },
  {
    path: 'plano-hoje',
    loadChildren: () => import('./plano-hoje/plano-hoje.module').then(m => m.PlanoHojePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'personalizar-treino',
    loadChildren: () => import('./personalizar-treino/personalizar-treino.module').then(m => m.PersonalizarTreinoPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'analisar-progresso',
    loadChildren: () => import('./analisar-progresso/analisar-progresso.module').then(m => m.AnalisarProgressoPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'workout-management',
    loadChildren: () => import('./workout-management/workout-management.module').then(m => m.WorkoutManagementPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'weekly-plan',
    loadChildren: () => import('./weekly-plan/weekly-plan.module').then(m => m.WeeklyPlanPageModule),
    canActivate: [AuthGuard]
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
