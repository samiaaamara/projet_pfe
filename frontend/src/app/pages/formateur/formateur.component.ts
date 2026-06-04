import { Component, OnInit , OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormateurService } from '../../services/formateur.service';
import { Auth } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';
@Component({
  selector: 'app-formateur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formateur.component.html',
  styleUrls: ['./formateur.component.css'],
})
export class FormateurComponent implements OnInit, OnDestroy {
  readonly environment = environment;

  formateurId: number | null = null;
  user: any = null;
  formations: any[] = [];
  inscriptions: any[] = [];
  supports: any[] = [];

  // Champs formulaire création formation
  titre = '';
  description = '';
  specialite = '';
  nb_places: number | null = null;
  photoFile: File | null = null;
  photoPreview: string | null = null;
  photoExistante: string = '';
  editMode = false;
  editedFormationId: number | null = null;

  searchTerm = '';
  statusFilter: '' | 'draft' | 'pending_approval' | 'accepted' | 'published' | 'archivée' = '';
  specialites: string[] = [];

  formErrors: { titre?: string; description?: string; specialite?: string; nb_places?: string } = {};

  // Stepper création
  creationStep: 1 | 2 | 3 | 4 = 1;
  creationFormationId: number | null = null;

  // Quiz création (Step 4)
  quizTitre = 'Quiz de validation';
  quizSeuil = 70;
  quizNbTentatives = 3;
  quizQuestions: { question: string; reponses: { reponse: string; est_correcte: boolean }[] }[] = [];
  quizSaving = false;
  quizEditMode = false;

  // Programme editor
  showProgrammeModal = false;
  programmeFormation: any = null;
  programmeData: { description_globale: string; objectifs: string; prerequis: string } = { description_globale: '', objectifs: '', prerequis: '' };
  programmeModules: any[] = [];
  moduleForm: { titre: string; description: string; ordre: number | null } = { titre: '', description: '', ordre: null };
  editModuleMode = false;
  editModuleId: number | null = null;

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  get canSubmit(): boolean {
    const f = this.programmeFormation;
    return f && f.module_count > 0;
  }

  // Support pédagogique
  supportType = '';
  supportFichier = '';
  supportFile: File | null = null;
  supportMode: 'url' | 'file' = 'file';
  // Formation sélectionnée pour voir les inscriptions ou ajouter un support
  formationSelectionnee: any;

  // Statistiques du formateur
  stats = { formations: 0, etudiants: 0, seances: 0 };

  // Computed properties pour les compteurs
  get publishedFormationsCount(): number {
    return this.formations.filter(f => f.status === 'published').length;
  }

  get pendingApprovalFormationsCount(): number {
    return this.formations.filter(f => f.status === 'pending_approval').length;
  }

  get nbCandidatsInscrits(): number {
    return this.inscriptions.filter(i => i.type_participant === 'candidat').length;
  }

  get nbExternesInscrits(): number {
    return this.inscriptions.filter(i => i.type_participant === 'externe').length;
  }

  // Modales
  showFormationModal = false;
  showInscriptionsModal = false;
  showSeancesModal = false;

  // Message général
  message = '';

 profileNom = '';
  profileEmail = '';
  profileSpecialite = '';
  profileTelephone = '';
  profileDateNaissance = '';
  profilePhotoUrl: string | null = null;
  ancienMdp = '';
  nouveauMdp = '';
  confirmMdp = '';
  messageType: 'success' | 'danger' = 'success';

  // Notifications
  notifications: any[] = [];
  unreadCount = 0;
  private pollingInterval: any;

  // Messagerie
  contacts: any[] = [];
  messagesConversation: any[] = [];
  contactSelectionne: any = null;
  nouveauMessage = '';
  unreadMessages = 0;
  formateurContactSearch = '';
  formateurContactRole = '';

  get filteredFormateurContacts() {
    return this.contacts.filter(c => {
      const matchSearch = !this.formateurContactSearch.trim() || c.nom?.toLowerCase().includes(this.formateurContactSearch.toLowerCase());
      const matchRole = !this.formateurContactRole || c.role === this.formateurContactRole;
      return matchSearch && matchRole;
    });
  }


  // Progression
  progressionEtudiant: any = null;
  progressionModules: any[] = [];
  progressionPourcentage = 0;

  // Justificatifs
  justificatifs: any[] = [];

  // Séances
  showSeancesPanel = false;
  seancesFormation: any[] = [];
  formationModules: any[] = [];
  seanceForm: any = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée', module_id: null };
  editSeanceMode = false;
  editSeanceId: number | null = null;

  // Feuille de présence
  seanceSelectionnee: any = null;
  feuillePresence: any[] = [];

  // Section active (menu sidebar)

  activeSection: 'accueil' | 'creerFormation' | 'mesFormations' | 'supports' | 'profil' | 'notifications' | 'messages' | 'presences' | 'progression' = 'accueil';

  // ===== Mes formations section =====
  mesFormationsSelectedId: number | null = null;
  get mesFormationsSelected(): any {
    return this.formations.find(f => f.id === this.mesFormationsSelectedId) || null;
  }

  // ===== Présences section =====
  presenceFormationId: number | null = null;
  presenceSeancesLoading = false;

  // ===== Progression section =====
  progressionFormationId: number | null = null;
  progressionInscriptions: any[] = [];
  progressionLoading = false;

  constructor(
    private formateurService: FormateurService,
     private authService: Auth,
     private msgService: MessagesService,
      private notificationsService: NotificationsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProfil();
    this.authService.getSpecialites().subscribe({
      next: data => this.specialites = data.map(s => s.nom),
      error: () => {}
    });
  }

  /** =================== Chargement des formations =================== */
  loadProfil() {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = JSON.parse(storedUser);

    if (this.user.role !== 'formateur') {
      this.router.navigate(['/login']);
      return;
    }

    this.formateurService.getProfil(this.user.id).subscribe({
      next: (profile) => {
        if (!profile || !profile.id) {
          this.message = `❌ Profil formateur non trouvé pour l'utilisateur ID: ${this.user.id}. Veuillez contacter l'administrateur.`;
          return;
        }

       this.formateurId = profile.id;
        this.profileNom = this.user.nom;
        this.profileEmail = this.user.email;
        this.profileSpecialite = profile.specialite || '';
        this.profileTelephone = profile.telephone || '';
        this.profileDateNaissance = profile.date_naissance ? profile.date_naissance.substring(0, 10) : '';
        this.profilePhotoUrl = profile.photo_profil || null;
        this.loadFormations();
        this.loadUnreadCount();
        this.loadUnreadMessages();
        this.pollingInterval = setInterval(() => { this.loadUnreadCount(); this.loadUnreadMessages(); }, 30000);
      },
      error: (err) => {
        this.message = `❌ Erreur lors du chargement du profil formateur. User ID: ${this.user.id}. Détail: ${err?.error?.error || err?.message}`;
      }
    });
  }

  loadFormations() {
    if (!this.formateurId) {
      return;
    }

    this.formateurService.getMesFormations(this.formateurId)
      .subscribe({
        next: (data) => {
          this.formations = data;
          this.loadStats();
        },
        error: () => {}
      });
  }

  get filteredFormations() {
    return this.formations.filter(f => {
      const matchSearch = this.searchTerm
        ? `${f.titre} ${f.description}`.toLowerCase().includes(this.searchTerm.toLowerCase())
        : true;
      const matchStatus = this.statusFilter ? f.status === this.statusFilter : true;
      return matchSearch && matchStatus;
    });
  }

  resetFormationForm() {
    this.titre = '';
    this.description = '';
    this.specialite = this.profileSpecialite;
    this.nb_places = null;
    this.photoFile = null;
    this.photoPreview = null;
    this.photoExistante = '';
    this.editMode = false;
    this.editedFormationId = null;
    this.formErrors = {};
    this.creationStep = 1;
    this.creationFormationId = null;
    this.programmeData = { description_globale: '', objectifs: '', prerequis: '' };
    this.programmeModules = [];
    this.moduleForm = { titre: '', description: '', ordre: null };
    this.quizTitre = 'Quiz de validation';
    this.quizSeuil = 70;
    this.quizNbTentatives = 3;
    this.quizQuestions = [];
    this.quizSaving = false;
    this.editModuleMode = false;
    this.editModuleId = null;
    this.supports = [];
    this.supportType = '';
    this.supportFichier = '';
    this.supportFile = null;
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.photoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.photoPreview = e.target?.result as string; };
      reader.readAsDataURL(this.photoFile);
    }
  }

  supprimerPhoto() {
    this.photoFile = null;
    this.photoPreview = null;
    this.photoExistante = '';
  }

  validateFormation(): boolean {
    this.formErrors = {};
    let valid = true;
    if (!this.titre || !this.titre.trim()) {
      this.formErrors.titre = 'Le titre est obligatoire.'; valid = false;
    }
    if (!this.description || !this.description.trim()) {
      this.formErrors.description = 'La description est obligatoire.'; valid = false;
    }
    if (!this.specialite || !this.specialite.trim()) {
      this.formErrors.specialite = 'La spécialité est obligatoire.'; valid = false;
    }
    return valid;
  }


  loadStats() {
    if (!this.formateurId) {
      return;
    }

    this.formateurService.getStats(this.formateurId).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: () => {}
    });
  }

  /** =================== Création formation =================== */
  creerFormation() {
    if (!this.validateFormation()) return;

    if (this.formateurId === null) {
      this.message = 'Impossible de créer la formation : profil formateur introuvable.';
       return;
    }

    const formData = new FormData();
    formData.append('titre', this.titre);
    formData.append('description', this.description);
    if (this.specialite) formData.append('specialite', this.specialite);
    if (this.nb_places) formData.append('nb_places', this.nb_places.toString());
    formData.append('formateur_id', this.formateurId!.toString());
    if (this.photoFile) formData.append('photo', this.photoFile);

    this.formateurService.creerFormation(formData).subscribe({
      next: (res: any) => {
        this.creationFormationId = res.id;
        this.programmeFormation = { id: res.id, titre: this.titre };
        this.programmeData = { description_globale: '', objectifs: '', prerequis: '' };
        this.programmeModules = [];
        this.moduleForm = { titre: '', description: '', ordre: null };
        this.editModuleMode = false;
        this.editModuleId = null;
        this.creationStep = 2;
      },
      error: (err) => {
        this.showMessage(err?.error?.error || err?.error?.message || 'Erreur : Erreur lors de la création de la formation', 'danger');
      }
    });
  }

  passerEtape3() {
    if (!this.creationFormationId) return;
    const saveProg = () => {
      this.formationSelectionnee = { id: this.creationFormationId, titre: this.titre };
      this.supports = [];
      this.supportType = '';
      this.supportFichier = '';
      this.supportFile = null;
      this.formateurService.getSupports(this.creationFormationId!).subscribe({
        next: (data) => this.supports = data,
        error: () => {}
      });
      this.creationStep = 3;
    };
    const hasProg = this.programmeData.description_globale || this.programmeData.objectifs || this.programmeData.prerequis;
    if (hasProg) {
      this.formateurService.saveProgramme(this.creationFormationId, this.programmeData).subscribe({
        next: saveProg,
        error: () => this.showMessage('Erreur sauvegarde programme', 'danger')
      });
    } else {
      saveProg();
    }
  }

  terminerCreation() {
    const msg = this.quizEditMode ? 'Quiz mis à jour avec succès ✅' : 'Formation créée avec succès ✅';
    this.quizEditMode = false;
    this.showMessage(msg, 'success');
    this.closeFormationModal();
    this.loadFormations();
    this.activeSection = 'mesFormations';
  }

  passerEtape4() {
    if (!this.quizTitre || this.quizTitre === 'Quiz de validation') {
      this.quizTitre = 'Quiz de validation – ' + (this.titre || '').trim();
    }
    this.creationStep = 4;
    if (this.quizQuestions.length === 0) this.ajouterQuestion();
  }

  ouvrirQuizFormation(f: any) {
    this.creationFormationId = f.id;
    this.quizEditMode = true;
    this.quizTitre = 'Quiz de validation – ' + f.titre;
    this.quizSeuil = 70;
    this.quizNbTentatives = 3;
    this.quizQuestions = [];
    this.formateurService.getQuiz(f.id).subscribe({
      next: (quiz: any) => {
        if (quiz) {
          this.quizTitre = quiz.titre || ('Quiz de validation – ' + f.titre);
          this.quizSeuil = quiz.seuil_reussite ?? 70;
          this.quizNbTentatives = quiz.nb_tentatives ?? 3;
          this.quizQuestions = (quiz.questions || []).map((q: any) => ({
            question: q.question,
            reponses: (q.reponses || []).map((r: any) => ({
              reponse: r.reponse,
              est_correcte: !!r.est_correcte
            }))
          }));
        }
        if (this.quizQuestions.length === 0) this.ajouterQuestion();
        this.creationStep = 4;
        this.setSection('creerFormation');
      },
      error: () => {
        if (this.quizQuestions.length === 0) this.ajouterQuestion();
        this.creationStep = 4;
        this.setSection('creerFormation');
      }
    });
  }

  ajouterQuestion() {
    this.quizQuestions.push({
      question: '',
      reponses: [
        { reponse: '', est_correcte: true },
        { reponse: '', est_correcte: false },
        { reponse: '', est_correcte: false }
      ]
    });
  }

  supprimerQuestion(i: number) {
    this.quizQuestions.splice(i, 1);
  }

  ajouterReponse(qi: number) {
    if (this.quizQuestions[qi].reponses.length < 4) {
      this.quizQuestions[qi].reponses.push({ reponse: '', est_correcte: false });
    }
  }

  supprimerReponse(qi: number, ri: number) {
    if (this.quizQuestions[qi].reponses.length > 2) {
      this.quizQuestions[qi].reponses.splice(ri, 1);
    }
  }

  marquerCorrecte(qi: number, ri: number) {
    this.quizQuestions[qi].reponses.forEach((r, idx) => r.est_correcte = idx === ri);
  }

  terminerAvecQuiz() {
    if (this.quizQuestions.length === 0) {
      this.showMessage('Ajoutez au moins une question au quiz.', 'danger');
      return;
    }
    for (let i = 0; i < this.quizQuestions.length; i++) {
      const q = this.quizQuestions[i];
      if (!q.question.trim()) {
        this.showMessage(`Question ${i + 1} : le texte de la question est vide.`, 'danger');
        return;
      }
      const filled = q.reponses.filter(r => r.reponse.trim());
      if (filled.length < 2) {
        this.showMessage(`Question ${i + 1} : remplissez au moins 2 réponses.`, 'danger');
        return;
      }
      if (!q.reponses.some(r => r.est_correcte && r.reponse.trim())) {
        this.showMessage(`Question ${i + 1} : cochez la bonne réponse.`, 'danger');
        return;
      }
    }
    if (!this.creationFormationId) return;
    this.quizSaving = true;
    this.formateurService.creerQuiz(this.creationFormationId, {
      titre: this.quizTitre || 'Quiz de validation',
      seuil_reussite: this.quizSeuil,
      nb_tentatives: this.quizNbTentatives,
      questions: this.quizQuestions.map(q => ({
        question: q.question.trim(),
        reponses: q.reponses.filter(r => r.reponse.trim())
      }))
    }).subscribe({
      next: () => {
        this.quizSaving = false;
        this.terminerCreation();
      },
      error: (err) => {
        this.quizSaving = false;
        this.showMessage(err?.error?.error || 'Erreur : Erreur lors de la création du quiz', 'danger');
      }
    });
  }

  openFormationModal(formation?: any) {
    this.formErrors = {};
    if (formation) {
      this.editMode = true;
      this.editedFormationId = formation.id;
      this.titre = formation.titre;
      this.description = formation.description;
      this.specialite = formation.specialite || '';
      this.nb_places = formation.nb_places || null;
      this.photoExistante = formation.photo || '';
      this.photoPreview = formation.photo ? `${environment.baseUrl}${formation.photo}` : null;
      this.photoFile = null;
    } else {
      this.editMode = false;
      this.resetFormationForm();
      this.setSection('creerFormation');
      return;
    }
    this.showFormationModal = true;
  }

  closeFormationModal() {
    const wasEdit = this.editMode;
    this.showFormationModal = false;
    this.editMode = false;
    this.resetFormationForm();
    if (!wasEdit) { this.setSection('mesFormations'); }
  }

  ouvrirEditionFormation(formation: any) {
    this.openFormationModal(formation);
  }

  annulerEditionFormation() {
    this.closeFormationModal();
  }

  modifierFormation() {
    if (!this.validateFormation()) return;

    if (this.formateurId === null || this.editedFormationId === null) {
      this.message = 'Impossible de modifier cette formation.';
      return;
    }

    const formData = new FormData();
    formData.append('titre', this.titre);
    formData.append('description', this.description);
    if (this.specialite) formData.append('specialite', this.specialite);
    if (this.nb_places) formData.append('nb_places', this.nb_places.toString());
    formData.append('formateur_id', this.formateurId!.toString());
    if (this.photoFile) formData.append('photo', this.photoFile);
    else if (this.photoExistante) formData.append('photo_existante', this.photoExistante);

    this.formateurService.modifierFormation(this.editedFormationId, formData).subscribe({
      next: () => {
        this.showMessage('Formation modifiée avec succès ✅', 'success');
        this.closeFormationModal();
        this.loadFormations();
        this.activeSection = 'mesFormations';
      },
      error: (err) => {
        this.showMessage(err?.error?.error || 'Erreur : Erreur lors de la modification de la formation', 'danger');
      }
    });
  }

  supprimerFormation(formationId: number) {
    if (!confirm('Supprimer cette formation ? Cette action est irréversible.')) return;
    if (!this.formateurId) {
      this.showMessage('Impossible de supprimer la formation.', 'danger');
      return;
    }

    this.formateurService.supprimerFormation(formationId, this.formateurId)
      .subscribe({
        next: () => {
          this.showMessage('Formation supprimée avec succès ✅', 'success');
          this.loadFormations();
        },
        error: (err) => {
          this.showMessage(err?.error?.error || 'Erreur : Erreur lors de la suppression de la formation', 'danger');
        }
      });
  }

  soumettreFormationPourApprobation(formationId: number) {
    if (!this.formateurId) {
      this.showMessage('Impossible de soumettre la formation.', 'danger');
      return;
    }

    this.formateurService.soumettreFormationPourApprobation(formationId, this.formateurId)
      .subscribe({
        next: () => {
          this.showMessage('Formation soumise à l\'admin pour approbation ✉️', 'success');
          this.loadFormations();
        },
        error: (err) => {
          this.showMessage(err?.error?.error || err?.message || 'Erreur lors de la soumission', 'danger');
        }
      });
  }

  validerPresence(inscription: any, statut: string) {
    if (!inscription?.id) {
      return;
    }

    this.formateurService.mettreAJourStatutInscription(inscription.id, statut, inscription.type_participant || 'étudiant')
      .subscribe({
        next: () => {
          inscription.statut = statut;
          this.message = `Statut mis à jour: ${statut}`;
        },
        error: () => {
          this.showMessage('Impossible de mettre à jour le statut.', 'danger');
        }
      });
  }

  /** =================== Voir inscriptions =================== */
  voirInscriptions(formationId: number) {
    const formation = this.formations.find(f => f.id === formationId);
    this.formationSelectionnee = formation;
    this.progressionEtudiant = null;
    this.showInscriptionsModal = true;
    this.formateurService.getInscriptions(formationId)
      .subscribe({
        next: (data) => this.inscriptions = data,
        error: () => {}
      });
  }

  fermerInscriptionsModal() {
    this.showInscriptionsModal = false;
    this.inscriptions = [];
    this.progressionEtudiant = null;
  }

  voirSupports(formationId: number) {
    const formation = this.formations.find(f => f.id === formationId);
    this.formationSelectionnee = formation;
    this.activeSection = 'supports';

    this.formateurService.getSupports(formationId)
      .subscribe({
        next: (data) => this.supports = data,
        error: () => {}
      });
  }

  ajouterSupportDirect(formationId: number) {
    const formation = this.formations.find(f => f.id === formationId);
    this.formationSelectionnee = formation;
    this.activeSection = 'supports';
    this.supportType = '';
    this.supportFichier = '';

    this.formateurService.getSupports(formationId)
      .subscribe({
        next: (data) => this.supports = data,
        error: () => {}
      });
  }

   onSupportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.supportFile = input.files?.[0] || null;
  }

  /** =================== Ajouter support =================== */
  ajouterSupport() {
    if (!this.formationSelectionnee) {
      this.message = 'Veuillez sélectionner une formation';
      return;
    }
if (!this.supportType) {
      this.message = 'Veuillez choisir un type de support';
    return;
    }
    const recharger = () => {
      this.formateurService.getSupports(this.formationSelectionnee.id)
        .subscribe({ next: (data) => this.supports = data });
    };
 
    const onSuccess = () => {
      this.message = 'Support ajouté ✅';
      this.supportType = '';
      this.supportFichier =  '';
      this.supportFile = null;
      recharger();
    };
 
    const onError = (err: any) => {
      this.showMessage(err?.error?.error || 'Erreur lors de l\'ajout du support', 'danger');
    };
 
    if (this.supportMode === 'file' && this.supportFile) {
      this.formateurService.uploadSupport(
        this.formationSelectionnee.id,
        this.supportType,
        this.supportFile
      ).subscribe({ next: onSuccess, error: onError });
    } else if (this.supportMode === 'url' && this.supportFichier) {
      this.formateurService.ajouterSupport(
        this.formationSelectionnee.id,
        this.supportType,
        this.supportFichier
      ).subscribe({ next: onSuccess, error: onError });
    } else {
      this.message = this.supportMode === 'file'
        ? 'Veuillez choisir un fichier'
        : 'Veuillez entrer une URL';
    }
  }


  /** =================== Supprimer support =================== */
  supprimerSupport(supportId: number | undefined) {
    if (!supportId) {
      this.showMessage('Impossible de supprimer ce support : ID manquant.', 'danger');
      return;
    }

    if (!confirm('Supprimer ce support pédagogique ?')) return;

    this.formateurService.supprimerSupport(supportId)
      .subscribe({
        next: () => {
          this.showMessage('Support supprimé ✅', 'success');
          this.supports = this.supports.filter(s => (s.id ?? s.support_id) !== supportId);

          if (this.formationSelectionnee && this.formationSelectionnee.id) {
            this.formateurService.getSupports(this.formationSelectionnee.id)
              .subscribe({
                next: (data) => this.supports = data,
                error: () => {}
              });
          }
        },
        error: () => {
          this.showMessage('Erreur lors de la suppression du support', 'danger');
        }
      });
  }

  /** =================== Changer de section (sidebar) =================== */
  setSection(section: 'accueil' | 'creerFormation' | 'mesFormations' | 'supports' | 'profil' | 'notifications' | 'messages' | 'presences' | 'progression') {
    this.activeSection = section;

    if (section !== 'mesFormations') {
      this.inscriptions = [];
      this.formationSelectionnee = null;
    }
  }

  /** =================== Section Présences =================== */
  ouvrirSectionPresences() {
    this.activeSection = 'presences';
    this.presenceFormationId = null;
    this.seancesFormation = [];
    this.seanceSelectionnee = null;
    this.feuillePresence = [];
    this.justificatifs = [];
    const f = this.formations.find(f => f.status === 'published' || f.status === 'accepted' || f.status === 'archivée');
    if (f) this.selectionnerPresenceFormation(f.id);
  }

  allerPresences(formation: any) {
    this.activeSection = 'presences';
    this.seanceSelectionnee = null;
    this.feuillePresence = [];
    this.selectionnerPresenceFormation(formation.id);
  }

  selectionnerPresenceFormation(formationId: number) {
    this.presenceFormationId = formationId;
    this.formationSelectionnee = this.formations.find(f => f.id === formationId) || null;
    this.seanceSelectionnee = null;
    this.feuillePresence = [];
    this.presenceSeancesLoading = true;
    this.formateurService.getSeances(formationId).subscribe({
      next: data => { this.seancesFormation = data; this.presenceSeancesLoading = false; },
      error: () => { this.presenceSeancesLoading = false; }
    });
    this.formateurService.getFormationModules(formationId).subscribe({
      next: data => this.formationModules = data,
      error: () => {}
    });
    this.chargerJustificatifs();
  }

  allerProgression(formation: any) {
    this.activeSection = 'progression';
    this.progressionEtudiant = null;
    this.progressionModules = [];
    this.chargerProgressionFormation(formation.id);
  }

  /** =================== Section Progression =================== */
  ouvrirSectionProgression() {
    this.activeSection = 'progression';
    this.progressionFormationId = null;
    this.progressionInscriptions = [];
    this.progressionEtudiant = null;
    this.progressionModules = [];
    const f = this.formations.find(f => f.status === 'published' || f.status === 'accepted' || f.status === 'archivée');
    if (f) this.chargerProgressionFormation(f.id);
  }

  chargerProgressionFormation(formationId: number) {
    this.progressionFormationId = formationId;
    this.formationSelectionnee = this.formations.find(f => f.id === formationId) || null;
    this.progressionEtudiant = null;
    this.progressionModules = [];
    this.progressionPourcentage = 0;
    this.progressionLoading = true;
    this.formateurService.getInscriptions(formationId).subscribe({
      next: data => { this.progressionInscriptions = data; this.progressionLoading = false; },
      error: () => { this.progressionLoading = false; }
    });
  }

  ouvrirProgressionSection(etudiant: any) {
    if (this.progressionEtudiant?.id === etudiant.id) {
      this.progressionEtudiant = null;
      this.progressionModules = [];
      this.progressionPourcentage = 0;
      return;
    }
    this.ouvrirProgression(etudiant);
  }
   showMessage(msg: string, type: 'success' | 'danger' = 'success') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }

  
  /** =================== Profil =================== */
  sauvegarderProfil() {
    if (!this.profileNom || !this.profileEmail) {
      this.showMessage('Nom et email sont requis', 'danger'); return;
    }
    this.authService.updateProfile({
      nom: this.profileNom,
      email: this.profileEmail,
      specialite: this.profileSpecialite,
      telephone: this.profileTelephone,
      date_naissance: this.profileDateNaissance
    }).subscribe({
      next: () => {
        this.user.nom = this.profileNom;
        this.user.email = this.profileEmail;
        localStorage.setItem('user', JSON.stringify(this.user));
        this.showMessage('Profil mis à jour avec succès ✅');
      },
      error: (err: any) => this.showMessage(err?.error?.message || 'Erreur mise à jour du profil', 'danger')
    });
  }

  onProfilePhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    this.authService.uploadProfilePhoto(formData).subscribe({
      next: (res: any) => {
        this.profilePhotoUrl = res.photo_profil;
        this.user.photo_profil = res.photo_profil;
        localStorage.setItem('user', JSON.stringify(this.user));
        this.showMessage('Photo de profil mise à jour ✅');
      },
      error: () => this.showMessage('Erreur lors du téléchargement de la photo', 'danger')
    });
  }

  changerMotDePasse() {
    if (!this.ancienMdp || !this.nouveauMdp) {
      this.showMessage('Remplissez tous les champs', 'danger'); return;
    }
    if (this.nouveauMdp !== this.confirmMdp) {
      this.showMessage('Les mots de passe ne correspondent pas', 'danger'); return;
    }
    if (this.nouveauMdp.length < 8) {
      this.showMessage('Mot de passe trop court (min 8 caractères)', 'danger'); return;
    }
    this.authService.changePassword({ ancien_mdp: this.ancienMdp, nouveau_mdp: this.nouveauMdp }).subscribe({
      next: () => {
        this.showMessage('Mot de passe modifié avec succès ✅');
        this.ancienMdp = ''; this.nouveauMdp = ''; this.confirmMdp = '';
      },
      error: (err: any) => this.showMessage(err?.error?.message || 'Erreur changement de mot de passe', 'danger')
    });
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  /** =================== Notifications =================== */
  loadUnreadCount() {
    if (!this.user?.id) return;
    this.notificationsService.getUnreadCount(this.user.id).subscribe({
      next: (data: { count: number; }) => this.unreadCount = data?.count || 0,
      error: () => {}
    });
  }

  loadUnreadMessages() {
    if (!this.user?.id) return;
    this.msgService.getUnreadCount(this.user.id).subscribe({
      next: (data: any) => this.unreadMessages = data?.count || 0,
      error: () => {}
    });
  }

 loadNotifications() {
    if (!this.user?.id) return;
    this.notificationsService.getNotifications(this.user.id).subscribe({
      next: (data: any[]) => {
        this.notifications = data;
        this.unreadCount = data.filter((n: any) => !n.lu).length;
      },
      error: () => {}
    });
  }

  marquerLu(notif: any) {
    if (notif.lu) return;
    this.notificationsService.marquerLu(notif.id).subscribe({
      next: () => {
        notif.lu = 1;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {}
    });
  }

  marquerToutLu() {
    if (!this.user?.id) return;
    this.notificationsService.marquerToutLu(this.user.id).subscribe({
      next: () => {
        this.notifications.forEach((n: any) => n.lu = 1);
        this.unreadCount = 0;
      },
      error: () => {}
    });
  }

  supprimerNotif(id: number, event: Event) {
    event.stopPropagation();
    this.notificationsService.supprimer(id).subscribe({
      next: () => {
        const notif = this.notifications.find((n: any) => n.id === id);
        if (notif && !notif.lu) this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.notifications = this.notifications.filter((n: any) => n.id !== id);
      },
      error: () => {}
    });
  }

  getNotifIcon(type: string): string { return type; }

  stripNotifEmoji(msg: string): string {
    if (!msg) return '';
    return msg.replace(/^[\u{1F300}-\u{1F9FF}✅❌⚠️]️?\s*/u, '');
  }

  openNotifications() {
    this.activeSection = 'notifications';
    this.loadNotifications();
  }
  
  // ===== Messagerie =====
  openMessages() {
    this.activeSection = 'messages';
    this.message = '';
    this.loadContacts();
  }

  loadContacts() {
    if (!this.user?.id) return;
    this.msgService.getContacts(this.user.id).subscribe({
      next: data => this.contacts = data,
      error: () => {}
    });
  }

  ouvrirConversation(contact: any) {
    this.contactSelectionne = contact;
    contact.non_lus = 0;
    if (!this.user?.id) return;
    this.msgService.getConversation(this.user.id, contact.id).subscribe({
      next: data => this.messagesConversation = data,
      error: () => {}
    });
  }

  envoyerMessage(event?: Event) {
    if (event) event.preventDefault();
    if (!this.nouveauMessage.trim() || !this.contactSelectionne || !this.user?.id) return;
    const texte = this.nouveauMessage.trim();
    this.nouveauMessage = '';
    this.msgService.envoyerMessage(this.user.id, this.contactSelectionne.id, texte).subscribe({
      next: (res: any) => {
        this.messagesConversation.push({
          id: res.id,
          expediteur_id: this.user.id,
          contenu: texte,
          date_envoi: new Date().toISOString()
        });
        const c = this.contacts.find(c => c.id === this.contactSelectionne.id);
        if (c) c.dernier_message = texte;
      },
      error: () => this.showMessage('Erreur lors de l\'envoi du message', 'danger')
    });
  }



logout() {
  localStorage.clear();
  this.router.navigate(['/login']);
}

  /** =================== Progression modulaire =================== */
  ouvrirProgression(etudiant: any) {
    if (!this.formationSelectionnee?.id) return;
    this.progressionEtudiant = etudiant;
    const obs = etudiant.candidat_id
      ? this.formateurService.getProgression(this.formationSelectionnee.id, etudiant.candidat_id)
      : this.formateurService.getProgressionExterne(this.formationSelectionnee.id, etudiant.externe_id);
    obs.subscribe({
      next: (res: any) => {
        this.progressionModules = res.modules || [];
        this.progressionPourcentage = res.pourcentage || 0;
      },
      error: () => this.showMessage('Erreur chargement de la progression', 'danger')
    });
  }

  fermerProgression() {
    this.progressionEtudiant = null;
    this.progressionModules = [];
    this.progressionPourcentage = 0;
  }

  changerStatutModule(module: any, statut: string) {
    if (!this.formationSelectionnee?.id || !this.progressionEtudiant) return;
    const ancienStatut = module.statut;
    module.statut = statut;
    const obs = this.progressionEtudiant.candidat_id
      ? this.formateurService.updateProgression(this.formationSelectionnee.id, this.progressionEtudiant.candidat_id, module.id, statut)
      : this.formateurService.updateProgressionExterne(this.formationSelectionnee.id, this.progressionEtudiant.externe_id, module.id, statut);
    obs.subscribe({
      next: () => {
        const termines = this.progressionModules.filter(m => m.statut === 'termine').length;
        this.progressionPourcentage = this.progressionModules.length > 0
          ? Math.round((termines / this.progressionModules.length) * 100) : 0;
      },
      error: () => {
        module.statut = ancienStatut;
        this.showMessage('Erreur mise à jour progression', 'danger');
      }
    });
  }

  getStatutLabel(statut: string): string {
    return statut === 'termine' ? '✅ Terminé' : statut === 'en_cours' ? '🔄 En cours' : '⬜ Non commencé';
  }

  countTermines(): number {
    return this.progressionModules.filter(m => m.statut === 'termine').length;
  }

  /** =================== Séances =================== */
  ouvrirSeances(formation: any) {
    this.formationSelectionnee = formation;
    this.showSeancesPanel = true;
    this.showSeancesModal = true;
    this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée', module_id: null };
    this.editSeanceMode = false;
    this.editSeanceId = null;
    this.seanceSelectionnee = null;
    this.feuillePresence = [];
    this.formationModules = [];
    this.formateurService.getSeances(formation.id).subscribe({
      next: (data) => this.seancesFormation = data,
      error: () => this.showMessage('Erreur chargement des séances', 'danger')
    });
    this.formateurService.getFormationModules(formation.id).subscribe({
      next: (data) => this.formationModules = data,
      error: () => {}
    });
    this.chargerJustificatifs();
  }

  fermerSeances() {
    this.showSeancesPanel = false;
    this.showSeancesModal = false;
    this.seancesFormation = [];
    this.seanceSelectionnee = null;
    this.feuillePresence = [];
  }

  soumettreSeance() {
    if (!this.seanceForm.date_seance || !this.seanceForm.heure_debut || !this.seanceForm.heure_fin) {
      this.showMessage('Date, heure de début et heure de fin sont obligatoires', 'danger');
      return;
    }
    if (this.editSeanceMode && this.editSeanceId) {
      this.formateurService.modifierSeance(this.editSeanceId, this.seanceForm).subscribe({
        next: () => {
          this.showMessage('Séance modifiée ✅');
          this.editSeanceMode = false;
          this.editSeanceId = null;
          this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée', module_id: null };
          this.formateurService.getSeances(this.formationSelectionnee.id).subscribe({ next: d => this.seancesFormation = d });
        },
        error: () => this.showMessage('Erreur modification séance', 'danger')
      });
    } else {
      const payload = { ...this.seanceForm, formation_id: this.formationSelectionnee.id };
      this.formateurService.creerSeance(payload).subscribe({
        next: () => {
          this.showMessage('Séance créée ✅');
          this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée', module_id: null };
          this.formateurService.getSeances(this.formationSelectionnee.id).subscribe({ next: d => this.seancesFormation = d });
        },
        error: () => this.showMessage('Erreur création séance', 'danger')
      });
    }
  }

  editerSeance(seance: any) {
    this.editSeanceMode = true;
    this.editSeanceId = seance.id;
    this.seanceForm = {
      date_seance: seance.date_seance?.substring(0, 10),
      heure_debut: seance.heure_debut,
      heure_fin: seance.heure_fin,
      salle: seance.salle || '',
      statut: seance.statut,
      module_id: seance.module_id || null
    };
  }

  annulerEditSeance() {
    this.editSeanceMode = false;
    this.editSeanceId = null;
    this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée', module_id: null };
  }

  supprimerSeance(seanceId: number) {
    if (!confirm('Supprimer cette séance et toutes ses présences ?')) return;
    this.formateurService.supprimerSeance(seanceId).subscribe({
      next: () => {
        this.showMessage('Séance supprimée ✅');
        this.seancesFormation = this.seancesFormation.filter(s => s.id !== seanceId);
        if (this.seanceSelectionnee?.id === seanceId) {
          this.seanceSelectionnee = null;
          this.feuillePresence = [];
        }
      },
      error: () => this.showMessage('Erreur suppression séance', 'danger')
    });
  }

  /** =================== Feuille de présence =================== */
  ouvrirFeuillePresence(seance: any) {
    this.seanceSelectionnee = seance;
    this.formateurService.getFeuillePresence(seance.id).subscribe({
      next: (data) => this.feuillePresence = data,
      error: () => this.showMessage('Erreur chargement de la feuille de présence', 'danger')
    });
  }

  fermerFeuillePresence() {
    this.seanceSelectionnee = null;
    this.feuillePresence = [];
  }

  changerPresence(etudiant: any, statut: string) {
    const ancien = etudiant.statut;
    etudiant.statut = statut;
    const obs = etudiant.candidat_id
      ? this.formateurService.enregistrerPresence(this.seanceSelectionnee.id, etudiant.candidat_id, statut)
      : this.formateurService.enregistrerPresenceExterne(this.seanceSelectionnee.id, etudiant.externe_id, statut);
    obs.subscribe({
      error: () => {
        etudiant.statut = ancien;
        this.showMessage('Erreur enregistrement présence', 'danger');
      }
    });
  }

  /** =================== Justificatifs =================== */
  chargerJustificatifs() {
    if (!this.formationSelectionnee?.id) return;
    this.formateurService.getJustificatifs(this.formationSelectionnee.id).subscribe({
      next: data => this.justificatifs = data,
      error: () => this.showMessage('Erreur chargement des justificatifs', 'danger')
    });
  }

  traiterJustificatif(justif: any, statut: 'accepté' | 'refusé') {
    this.formateurService.traiterJustificatif(justif.id, statut).subscribe({
      next: () => {
        this.showMessage(statut === 'accepté' ? 'Justificatif accepté ✅' : 'Justificatif refusé');
        justif.statut = statut;
        const etudiant = this.feuillePresence.find(e => e.candidat_id === justif.candidat_id);
        if (etudiant) {
          if (statut === 'accepté') etudiant.statut = 'excusé';
          else if (statut === 'refusé' && etudiant.statut === 'excusé') etudiant.statut = 'absent';
        }
      },
      error: () => this.showMessage('Erreur', 'danger')
    });
  }

  getJustifClass(statut: string): string {
    return statut === 'accepté' ? 'justif-ok' : statut === 'refusé' ? 'justif-ko' : 'justif-pending';
  }

  getStatutPresenceClass(statut: string): string {
    const map: any = { 'présent': 'present', 'absent': 'absent', 'retard': 'retard', 'excusé': 'excuse' };
    return map[statut] || 'absent';
  }

  /** =================== Programme & Modules =================== */
  ouvrirProgramme(formation: any) {
    this.programmeFormation = formation;
    this.showProgrammeModal = true;
    this.editModuleMode = false;
    this.editModuleId = null;
    this.moduleForm = { titre: '', description: '', ordre: null };
    this.formateurService.getProgramme(formation.id).subscribe({
      next: (res: any) => {
        const prog = res.programme;
        this.programmeData = {
          description_globale: prog?.description_globale || '',
          objectifs: prog?.objectifs || '',
          prerequis: prog?.prerequis || ''
        };
        this.programmeModules = res.modules || [];
      },
      error: () => this.showMessage('Erreur chargement du programme', 'danger')
    });
  }

  fermerProgramme() {
    this.showProgrammeModal = false;
    this.programmeFormation = null;
    this.editModuleMode = false;
    this.editModuleId = null;
    this.loadFormations();
  }

  sauvegarderProgramme() {
    if (!this.programmeFormation) return;
    this.formateurService.saveProgramme(this.programmeFormation.id, this.programmeData).subscribe({
      next: () => this.showMessage('Programme sauvegardé ✅'),
      error: () => this.showMessage('Erreur sauvegarde programme', 'danger')
    });
  }

  soumettreModule() {
    if (!this.programmeFormation) return;
    if (!this.moduleForm.titre.trim()) {
      this.showMessage('Le titre du module est obligatoire.', 'danger'); return;
    }
    if (this.editModuleMode && this.editModuleId) {
      this.formateurService.updateModule(this.programmeFormation.id, this.editModuleId, this.moduleForm).subscribe({
        next: () => {
          this.showMessage('Module mis à jour ✅');
          this.annulerEditModule();
          this._rechargerModules();
        },
        error: (err: any) => this.showMessage(err?.error?.error || 'Erreur mise à jour module', 'danger')
      });
    } else {
      this.formateurService.addModule(this.programmeFormation.id, this.moduleForm).subscribe({
        next: () => {
          this.showMessage('Module ajouté ✅');
          this.moduleForm = { titre: '', description: '', ordre: null };
          this._rechargerModules();
        },
        error: (err: any) => this.showMessage(err?.error?.error || 'Erreur ajout module', 'danger')
      });
    }
  }

  editerModule(m: any) {
    this.editModuleMode = true;
    this.editModuleId = m.id;
    this.moduleForm = { titre: m.titre, description: m.description || '', ordre: m.ordre || null };
  }

  annulerEditModule() {
    this.editModuleMode = false;
    this.editModuleId = null;
    this.moduleForm = { titre: '', description: '', ordre: null };
  }

  supprimerModule(moduleId: number) {
    if (!this.programmeFormation) return;
    if (!confirm('Supprimer ce module ?')) return;
    this.formateurService.deleteModule(this.programmeFormation.id, moduleId).subscribe({
      next: () => {
        this.showMessage('Module supprimé ✅');
        this._rechargerModules();
      },
      error: () => this.showMessage('Erreur suppression module', 'danger')
    });
  }

  private _rechargerModules() {
    if (!this.programmeFormation) return;
    this.formateurService.getProgramme(this.programmeFormation.id).subscribe({
      next: (res: any) => {
        this.programmeModules = res.modules || [];
        this.programmeFormation.module_count = this.programmeModules.length;
        const idx = this.formations.findIndex(f => f.id === this.programmeFormation.id);
        if (idx >= 0) this.formations[idx].module_count = this.programmeModules.length;
      },
      error: () => {}
    });
  }
}
