import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormateurService } from '../../services/formateur.service';

@Component({
  selector: 'app-formateur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formateur.component.html',
  styleUrls: ['./formateur.component.css'],
})
export class FormateurComponent implements OnInit {

  formateurId = 1; // temporaire
  formations: any[] = [];
  inscriptions: any[] = [];

  // Champs formulaire création formation
  titre = '';
  description = '';
  date_debut = '';

  // Support pédagogique
  supportType = '';
  supportFichier = '';

  // Formation sélectionnée pour voir les inscriptions ou ajouter un support
  formationSelectionnee: any;

  // Message général
  message = '';

  // Section active (menu sidebar)
  activeSection: 'accueil' | 'creerFormation' | 'mesFormations' | 'supports' = 'accueil';

  constructor(private formateurService: FormateurService) {}

  ngOnInit() {
    this.loadFormations();
  }

  /** =================== Chargement des formations =================== */
  loadFormations() {
    this.formateurService.getMesFormations(this.formateurId)
      .subscribe({
        next: (data) => {
          this.formations = data;
          console.log('Formations chargées:', data);
        },
        error: (err) => console.error('Erreur chargement formations:', err)
      });
  }

  /** =================== Création formation =================== */
  creerFormation() {
    if (!this.titre || !this.description || !this.date_debut) {
      this.message = 'Veuillez remplir tous les champs';
      return;
    }

    this.formateurService.creerFormation({
      titre: this.titre,
      description: this.description,
      date_debut: this.date_debut,
      formateur_id: this.formateurId
    }).subscribe({
      next: () => {
        this.message = 'Formation créée avec succès ✅';
        this.titre = '';
        this.description = '';
        this.date_debut = '';
        this.loadFormations();
        this.activeSection = 'mesFormations';
      },
      error: (err) => {
        console.error('Erreur création formation:', err);
        this.message = 'Erreur lors de la création de la formation';
      }
    });
  }

  /** =================== Voir inscriptions =================== */
  voirInscriptions(formationId: number) {
    const formation = this.formations.find(f => f.id === formationId);
    this.formationSelectionnee = formation;
    this.activeSection = 'mesFormations';

    this.formateurService.getInscriptions(formationId)
      .subscribe({
        next: (data) => this.inscriptions = data,
        error: (err) => console.error('Erreur chargement inscriptions:', err)
      });
  }

  /** =================== Ajouter support =================== */
  ajouterSupport() {
    if (!this.formationSelectionnee) {
      this.message = 'Veuillez sélectionner une formation';
      return;
    }

    if (!this.supportType || !this.supportFichier) {
      this.message = 'Veuillez remplir tous les champs du support';
      return;
    }

    this.formateurService.ajouterSupport(
      this.formationSelectionnee.id,
      this.supportType,
      this.supportFichier
    ).subscribe({
      next: () => {
        this.message = 'Support ajouté ✅';
        // Ajouter le support localement pour mise à jour visuelle
        if (!this.formationSelectionnee.supports) {
          this.formationSelectionnee.supports = [];
        }
        this.formationSelectionnee.supports.push({
          type: this.supportType,
          fichier: this.supportFichier
        });
        this.supportType = '';
        this.supportFichier = '';
        this.activeSection = 'supports';
      },
      error: (err) => {
        console.error('Erreur ajout support:', err);
        this.message = 'Erreur lors de l’ajout du support';
      }
    });
  }

  /** =================== Changer de section (sidebar) =================== */
  setSection(section: 'accueil' | 'creerFormation' | 'mesFormations' | 'supports') {
    this.activeSection = section;

    // Reset inscriptions si on quitte mesFormations
    if (section !== 'mesFormations') {
      this.inscriptions = [];
      this.formationSelectionnee = null;
    }
  }

}
