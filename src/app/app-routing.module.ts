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
    path: 'test',
    loadChildren: () => import('./test/test.module').then(m => m.TestPageModule)
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
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'lista',
    loadChildren: () => import('./lista/lista.module').then( m => m.ListaPageModule)
  },
  {
    path: 'detalhe/:id',
    loadChildren: () => import('./detalhe/detalhe.module').then( m => m.DetalhePageModule)
  },  {
    path: 'progress',
    loadChildren: () => import('./progress/progress.module').then( m => m.ProgressPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'progresso',
    loadChildren: () => import('./progresso/progresso.module').then( m => m.ProgressoPageModule)
  },
  {
    path: 'exercise-detail/:id',
    loadChildren: () => import('./exercise-detail/exercise-detail.module').then( m => m.ExerciseDetailPageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
