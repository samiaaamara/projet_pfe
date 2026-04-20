import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EtudiantService } from '../../services/etudiant.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-etudiant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './etudiant.component.html',
  styleUrl: './etudiant.component.css',
})
export class EtudiantComponent implements OnInit {

  formations: any[] = [];
  mesFormations: any[] = [];
  supports: any[] = [];

  etudiantId: number | null = null;
  message = '';
  progression = 0;

  formationSelectionnee: any = null;

  // ✅ Sections disponibles
  activeSection:
    | 'accueil'
    | 'formations'
    | 'mesFormations'
    | 'supports'
    | 'progression' = 'accueil';

  constructor(private etudiantService: EtudiantService, private router: Router) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (!stored) {
      this.router.navigate(['/login']);
      return;
    }
    const user = JSON.parse(stored);
    if (user.role !== 'etudiant' || !user.etudiantId) {
      this.router.navigate(['/login']);
      return;
    }
    this.etudiantId = user.etudiantId;
    this.loadFormations();
    this.loadMesFormations();
    this.chargerProgression();
  }

  setSection(section: any) {
    this.activeSection = section;
    this.message = '';
  }

  loadFormations() {
    if (!this.etudiantId) return;
    this.etudiantService.getFormations(this.etudiantId)
      .subscribe(data => this.formations = data);
  }

  loadMesFormations() {
    if (!this.etudiantId) return;
    this.etudiantService.getMesFormations(this.etudiantId)
      .subscribe(data => this.mesFormations = data);
  }

  inscrire(formationId: number) {
    if (!this.etudiantId) return;
    this.etudiantService.inscrire(this.etudiantId, formationId)
      .subscribe({
        next: () => {
          this.message = 'Inscription réussie ✅';
          this.loadMesFormations();
        },
        error: () => {
          alert("Erreur lors de l'inscription");
        }
      });
  }

  estDejaInscrit(formationId: number): boolean {
    return this.mesFormations.some(f => f.formation_id === formationId);
  }

  voirSupports(formation: any) {
    this.formationSelectionnee = formation;
    this.activeSection = 'supports';
    this.etudiantService.getSupports(formation.id)
      .subscribe(data => this.supports = data);
  }

  chargerProgression() {
    if (!this.etudiantId) return;
    this.etudiantService.getProgression(this.etudiantId)
      .subscribe(data => {
        this.progression = data?.progression || 0;
      });
  }
}