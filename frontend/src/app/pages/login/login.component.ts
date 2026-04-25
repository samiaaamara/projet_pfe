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

  constructor(
    private authService: Auth,
    private router: Router
  ) {}

 login() {
  this.authService.login({
    email: this.email,
    mot_de_passe: this.password
  }).subscribe({
    next: (res: any) => {

      const user = res.user;

     
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'etudiant') {
        this.router.navigate(['/etudiant']);
      } else if (user.role === 'formateur') {
        this.router.navigate(['/formateur']);
      } else {
        this.router.navigate(['/admin']);
      }
    },
    error: () => {
      this.error = 'Email ou mot de passe incorrect';
    }
  });
}
}