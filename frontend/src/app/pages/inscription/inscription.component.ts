import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inscription.component.html',
  styleUrl: './inscription.component.css',
})
export class InscriptionComponent implements OnInit {
  nom = '';
  email = '';
  password = '';
  role = 'candidat';
  type_candidat = 'etudiant';
  cin = '';
  niveau = '';
  specialite = '';
  telephone = '';
  entreprise = '';
  dateNaissance = '';
  message = '';
  loading = false;
  dateNaissanceError = false;
  today = new Date().toISOString().split('T')[0];

  specialites: { id: number; nom: string }[] = [];

  constructor(private authService: Auth, private router: Router) {}

  ngOnInit() {
    this.authService.getSpecialites().subscribe({
      next: data => this.specialites = data,
      error: () => {}
    });
  }

  validateDateNaissance(): boolean {
    if (!this.dateNaissance) {
      this.dateNaissanceError = false;
      return true;
    }
    const dob = new Date(this.dateNaissance);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    this.dateNaissanceError = dob >= now;
    return !this.dateNaissanceError;
  }

  register(form: NgForm) {
    this.message = '';
    this.dateNaissanceError = false;

    Object.values(form.controls).forEach(ctrl => ctrl.markAsTouched());

    if (form.invalid) return;
    if (!this.validateDateNaissance()) return;

    const data: any = {
      nom: this.nom.trim(),
      email: this.email.trim(),
      mot_de_passe: this.password,
      role: this.role
    };

    if (this.role === 'candidat') {
      data.type_candidat = this.type_candidat;
      data.cin = this.cin;
      data.niveau = this.type_candidat === 'etudiant' ? this.niveau : '';
      data.specialite = this.specialite;
      data.telephone = this.telephone;
      data.date_naissance = this.dateNaissance;
    }

    if (this.role === 'externe') {
      data.telephone = this.telephone;
      data.entreprise = this.entreprise;
      data.specialite = this.specialite;
      data.date_naissance = this.dateNaissance;
    }

    this.loading = true;
    this.authService.register(data).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Compte créé avec succès ! Redirection...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.message = err?.error?.message || "Erreur lors de l'inscription.";
      }
    });
  }
}
