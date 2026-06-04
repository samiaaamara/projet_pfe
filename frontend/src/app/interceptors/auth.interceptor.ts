import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const router = inject(Router);

  if (token && req.url.startsWith(environment.apiUrl)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        let user: any = {};
        try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
        const isAdmin = user?.role === 'admin';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate([isAdmin ? '/admin-login' : '/login']);
      }
      return throwError(() => error);
    })
  );
};
