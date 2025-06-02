import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('GuestGuard: Verificando autenticação...');
    
    // Usar AuthService para verificar autenticação
    const isAuthenticated = this.authService.isAuthenticated();
    
    console.log('GuestGuard: Usuário autenticado?', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('GuestGuard: Permitindo acesso (usuário não autenticado)');
      return true;
    } else {
      console.log('GuestGuard: Redirecionando para tabs/home (usuário já autenticado)');
      this.router.navigate(['/tabs/home']);
      return false;
    }
  }
}
