import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule , RouterLink],
  templateUrl: './inscription.component.html',
  styleUrl: './inscription.component.css',
})
export class InscriptionComponent {

  nom = '';
  email = '';
  password = '';
  role = 'etudiant';

  // 🔥 NOUVEAUX CHAMPS
  cin = '';
  
  niveau = '';
  specialite = '';

  telephone = '';
  entreprise = '';
  dateNaissance = '';
  message = '';

  constructor(
    private authService: Auth,
    private router: Router
  ) {}

  register() {

    // 🔥 objet envoyé au backend
    const data: any = {
      nom: this.nom,
      email: this.email,
      mot_de_passe: this.password,
      role: this.role
    };

    // ✅ si étudiant → ajouter les infos
    if (this.role === 'etudiant') {
      data.cin = this.cin;
      data.niveau = this.niveau;
      data.specialite = this.specialite;
      data.telephone = this.telephone;
      data.date_naissance = this.dateNaissance;
    }

    // ✅ si formateur → seulement spécialité
    if (this.role === 'formateur') {
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
    this.authService.register(data).subscribe({
      next: () => {
        this.message = 'Compte créé avec succès ✅';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: () => {
        this.message = 'Erreur lors de l’inscription ❌';
      }
    });
  }
}