import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  success = false;
  error = '';

  constructor(private authService: Auth) {}

  submit() {
    if (!this.email.trim()) { this.error = 'Veuillez saisir votre adresse email.'; return; }
    this.loading = true;
    this.error = '';
    this.authService.forgotPassword(this.email).subscribe({
      next: () => { this.loading = false; this.success = true; },
      error: (err) => { this.loading = false; this.error = err?.error?.message || 'Une erreur est survenue.'; }
    });
  }
}
