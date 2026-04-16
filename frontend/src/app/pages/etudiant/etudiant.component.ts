import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EtudiantService } from '../../services/etudiant.service';

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

  etudiantId = 1; // temporaire (auth plus tard)
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

  constructor(private etudiantService: EtudiantService) {}

  ngOnInit() {
    this.loadFormations();
    this.loadMesFormations();
    this.chargerProgression();
  }

  // ===================== Navigation =====================
  setSection(section: any) {
    this.activeSection = section;
    this.message = '';
  }

  // ===================== 📚 Formations =====================
  loadFormations() {
    this.etudiantService.getFormations(this.etudiantId)
      .subscribe(data => this.formations = data);
  }

  // ===================== ✅ Mes formations =====================
  loadMesFormations() {
    this.etudiantService.getMesFormations(this.etudiantId)
      .subscribe(data => this.mesFormations = data);
  }

  // ===================== 🟢 Inscription =====================
  inscrire(formationId: number) {
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

  // ===================== 📎 Supports =====================
  voirSupports(formation: any) {
    this.formationSelectionnee = formation;
    this.activeSection = 'supports';

    this.etudiantService.getSupports(formation.id)
      .subscribe(data => this.supports = data);
  }

  // ===================== 📈 Progression =====================
  chargerProgression() {
    this.etudiantService.getProgression(this.etudiantId)
      .subscribe(data => {
        this.progression = data?.progression || 0;
      });
  }
}
