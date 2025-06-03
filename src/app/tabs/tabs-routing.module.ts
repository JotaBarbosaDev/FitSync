import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('../home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'lista',
        loadChildren: () => import('../lista/lista.module').then(m => m.ListaPageModule)
      },
      {
        path: 'workout-management',
        loadChildren: () => import('../workout-management/workout-management.module').then(m => m.WorkoutManagementPageModule)
      },
      {
        path: 'progresso',
        loadChildren: () => import('../progresso/progresso.module').then(m => m.ProgressoPageModule)
      },
      {
        path: 'dashboard',
        loadChildren: () => import('../dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'workout-execution',
        loadChildren: () => import('../workout-execution/workout-execution.module').then(m => m.WorkoutExecutionPageModule)
      },
      {
        path: 'workout-progress',
        loadChildren: () => import('../workout-progress/workout-progress.module').then(m => m.WorkoutProgressPageModule)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule { }
