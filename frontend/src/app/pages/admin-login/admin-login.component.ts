import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {

  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private router: Router,
    private authService: Auth
  ) {}

  login() {

    if (!this.email || !this.password) {
      this.error = "Veuillez remplir tous les champs.";
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

        const user = res?.user;

        if (!user) {
          this.error = "Erreur serveur.";
          return;
        }

        if (user.role !== 'admin') {
          this.error = "Accès refusé. Admin uniquement.";
          return;
        }

        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(user));

        this.router.navigate(['/admin']);
      },

      error: (err) => {
        this.loading = false;

        if (err.status === 401) {
          this.error = "Email ou mot de passe incorrect.";
        } else {
          this.error = "Erreur serveur.";
        }
      }
    });
  }
}