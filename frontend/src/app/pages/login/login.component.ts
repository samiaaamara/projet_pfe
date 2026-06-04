import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-login',
  standalone: true, 
  imports: [CommonModule, FormsModule , RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private authService: Auth,
    private router: Router
  ) {}

  login() {
    if (!this.email || !this.password) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.authService.login({
      email: this.email,
      mot_de_passe: this.password
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        const user = res.user;
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(user));
        if (user.role === 'candidat') {
          this.router.navigate(['/candidat']);
        } else if (user.role === 'formateur') {
          this.router.navigate(['/formateur']);
        } else if (user.role === 'externe') {
          this.router.navigate(['/externe']);
        } else if (user.role === 'admin') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.error = 'Accès refusé. Veuillez utiliser la page administrateur.';
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.error = 'Rôle utilisateur non reconnu. Contactez l\'administrateur.';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Email ou mot de passe incorrect.';
      }
    });
  }
}