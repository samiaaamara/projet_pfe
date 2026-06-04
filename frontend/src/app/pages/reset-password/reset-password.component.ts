import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  nouveauMdp = '';
  confirmMdp = '';
  loading = false;
  success = false;
  error = '';
  tokenInvalide = false;

  constructor(
    private authService: Auth,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.tokenInvalide = true;
  }

  submit() {
    if (!this.nouveauMdp || this.nouveauMdp.length < 6) {
      this.error = 'Le mot de passe doit contenir au moins 6 caractères.'; return;
    }
    if (this.nouveauMdp !== this.confirmMdp) {
      this.error = 'Les mots de passe ne correspondent pas.'; return;
    }
    this.loading = true;
    this.error = '';
    this.authService.resetPassword(this.token, this.nouveauMdp).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Lien invalide ou expiré.';
      }
    });
  }
}
