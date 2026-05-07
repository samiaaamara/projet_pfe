import { Component, OnInit , OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormateurService } from '../../services/formateur.service';
import { Auth } from '../../services/auth';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';
import { QuestionsService } from '../../services/questions.service';
@Component({
  selector: 'app-formateur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formateur.component.html',
  styleUrls: ['./formateur.component.css'],
})
export class FormateurComponent implements OnInit, OnDestroy {

  formateurId: number | null = null;
  user: any = null;
  formations: any[] = [];
  inscriptions: any[] = [];
  supports: any[] = [];

  // Champs formulaire création formation
  titre = '';
  description = '';
  date_debut = '';
  date_fin = '';
  duree: number | null = null;
  specialite = '';
  nb_places: number | null = null;
  editMode = false;
  editedFormationId: number | null = null;

  searchTerm = '';
 statusFilter: '' | 'draft' | 'pending_approval' | 'accepted' | 'published' = '';
  specialites: string[] = [];

  formErrors: { titre?: string; description?: string; date_debut?: string; date_fin?: string; duree?: string; nb_places?: string; specialite?: string } = {};

  get today(): string {
    return new Date().toISOString().split('T')[0];
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

  // Questions
  questionsFormation: any[] = [];
  formationQuestionsId: number | null = null;

  // Progression
  progressionEtudiant: any = null;
  progressionModules: any[] = [];
  progressionPourcentage = 0;

  // Justificatifs
  justificatifs: any[] = [];

  // Séances
  showSeancesPanel = false;
  seancesFormation: any[] = [];
  seanceForm: any = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée' };
  editSeanceMode = false;
  editSeanceId: number | null = null;

  // Feuille de présence
  seanceSelectionnee: any = null;
  feuillePresence: any[] = [];

  // Section active (menu sidebar)

  activeSection: 'accueil' | 'creerFormation' | 'mesFormations' | 'supports' | 'profil' | 'notifications' | 'messages' | 'questions' = 'accueil';

  constructor(
    private formateurService: FormateurService,
     private authService: Auth,
     private msgService: MessagesService,
    private questService: QuestionsService,
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
          console.error('Profil formateur vide pour user:', this.user);
          return;
        }

       this.formateurId = profile.id;
        this.profileNom = this.user.nom;
        this.profileEmail = this.user.email;
        this.profileSpecialite = profile.specialite || '';
        this.profileTelephone = profile.telephone || '';
        this.profileDateNaissance = profile.date_naissance ? profile.date_naissance.substring(0, 10) : '';
        console.log('✅ Profil formateur chargé:', profile);
        this.loadFormations();
        this.loadUnreadCount();
        this.pollingInterval = setInterval(() => this.loadUnreadCount(), 30000);
      },
      error: (err) => {
        console.error('Erreur chargement profil formateur:', err);
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
        error: (err) => console.error('Erreur chargement formations:', err)
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
    this.date_debut = '';
    this.date_fin = '';
    this.duree = null;
    this.specialite = '';
    this.nb_places = null;
    this.editMode = false;
    this.editedFormationId = null;
    this.formErrors = {};
  }

  validateFormation(checkDateToday = true): boolean {
    this.formErrors = {};
    let valid = true;
    if (!this.titre || !this.titre.trim()) {
      this.formErrors.titre = 'Le titre est obligatoire.'; valid = false;
    }
    if (!this.description || !this.description.trim()) {
      this.formErrors.description = 'La description est obligatoire.'; valid = false;
    }
    if (!this.date_debut) {
      this.formErrors.date_debut = 'La date de début est obligatoire.'; valid = false;
    } else if (checkDateToday) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(this.date_debut) < today) {
        this.formErrors.date_debut = 'La date de début doit être aujourd\'hui ou dans le futur.'; valid = false;
      }
    }
    if (this.date_fin && this.date_debut && new Date(this.date_fin) < new Date(this.date_debut)) {
      this.formErrors.date_fin = 'La date de fin doit être après la date de début.'; valid = false;
    }
     if (this.duree !== null && this.duree !== undefined && this.duree <= 0) {
      this.formErrors.duree = 'La durée doit être supérieure à 0.'; valid = false;
    }
    if (this.nb_places !== null && this.nb_places !== undefined && this.nb_places <= 0) {
      this.formErrors.nb_places = 'Le nombre de places doit être supérieur à 0.'; valid = false;
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
      error: (err) => console.error('Erreur chargement stats formateur:', err)
    });
  }

  /** =================== Création formation =================== */
  creerFormation() {
    if (!this.validateFormation(true)) return;

    if (this.formateurId === null) {
      this.message = 'Impossible de créer la formation : profil formateur introuvable.';
       return;
    }

    const payload = {
      titre: this.titre,
      description: this.description,
      date_debut: this.date_debut,
      date_fin: this.date_fin || undefined,
      duree: this.duree || undefined,
      specialite: this.specialite,
      nb_places: this.nb_places || undefined,
      formateur_id: this.formateurId
    };

    this.formateurService.creerFormation(payload).subscribe({
      next: () => {
        this.showMessage('Formation créée avec succès ✅', 'success');
        this.closeFormationModal();
        this.loadFormations();
        this.activeSection = 'mesFormations';
      },
      error: (err) => {
        console.error('Erreur création formation:', err);
        this.showMessage(err?.error?.error || err?.error?.message || '❌ Erreur lors de la création de la formation', 'danger');
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
      this.date_debut = formation.date_debut;
      this.date_fin = formation.date_fin || '';
      this.duree = formation.duree || null;
      this.specialite = formation.specialite || '';
      this.nb_places = formation.nb_places || null;
    } else {
      this.editMode = false;
      this.resetFormationForm();
    }
    this.showFormationModal = true;
  }

  closeFormationModal() {
    this.showFormationModal = false;
    this.editMode = false;
    this.resetFormationForm();
  }

  ouvrirEditionFormation(formation: any) {
    this.openFormationModal(formation);
  }

  annulerEditionFormation() {
    this.closeFormationModal();
  }

  modifierFormation() {
    if (!this.validateFormation(false)) return;

    if (this.formateurId === null || this.editedFormationId === null) {
      this.message = 'Impossible de modifier cette formation.';
      return;
    }


    this.formateurService.modifierFormation(this.editedFormationId, {
      titre: this.titre,
      description: this.description,
      date_debut: this.date_debut,
      date_fin: this.date_fin,
      duree: this.duree || undefined,
      specialite: this.specialite,
      nb_places: this.nb_places || undefined,
      formateur_id: this.formateurId
    }).subscribe({
      next: () => {
        this.showMessage('Formation modifiée avec succès ✅', 'success');
        this.closeFormationModal();
        this.loadFormations();
        this.activeSection = 'mesFormations';
      },
      error: (err) => {
        console.error('Erreur modification formation:', err);
        this.showMessage(err?.error?.error || '❌ Erreur lors de la modification de la formation', 'danger');
      }
    });
  }

  supprimerFormation(formationId: number) {
    if (!this.formateurId) {
      this.message = 'Impossible de supprimer la formation.';
      return;
    }

    this.formateurService.supprimerFormation(formationId, this.formateurId)
      .subscribe({
        next: () => {
          this.showMessage('Formation supprimée avec succès ✅', 'success');
          this.loadFormations();
        },
        error: (err) => {
          console.error('Erreur suppression formation:', err);
          this.showMessage(err?.error?.error || '❌ Erreur lors de la suppression de la formation', 'danger');
        }
      });
  }

  soumettreFormationPourApprobation(formationId: number) {
    if (!this.formateurId) {
      this.message = 'Impossible de soumettre la formation.';
      return;
    }

    this.formateurService.soumettreFormationPourApprobation(formationId, this.formateurId)
      .subscribe({
        next: () => {
          this.message = 'Formation soumise à l\'admin pour approbation ✉️';
          this.loadFormations();
        },
        error: (err) => {
          console.error('Erreur soumission formation:', err);
          this.message = `Erreur lors de la soumission: ${err?.error?.error || err?.message || 'Erreur inconnue'}`;
        }
      });
  }

  validerPresence(inscription: any, statut: string) {
    if (!inscription?.id) {
      return;
    }

    this.formateurService.mettreAJourStatutInscription(inscription.id, statut)
      .subscribe({
        next: () => {
          inscription.statut = statut;
          this.message = `Statut mis à jour: ${statut}`;
        },
        error: (err) => {
          console.error('Erreur validation présence:', err);
          this.message = 'Impossible de mettre à jour le statut.';
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
        error: (err) => console.error('Erreur chargement inscriptions:', err)
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
        error: (err) => console.error('Erreur chargement supports:', err)
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
        error: (err) => console.error('Erreur chargement supports:', err)
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
      console.error('Erreur ajout support:', err);
      this.message = err?.error?.error || 'Erreur lors de l\'ajout du support';
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
      console.error('ID du support manquant pour suppression', { supportId, supports: this.supports });
      this.message = 'Impossible de supprimer ce support : ID manquant.';
      return;
    }

    if (!confirm('Supprimer ce support pédagogique ?')) return;

    console.log('Suppression support demandée', { supportId, formationSelectionnee: this.formationSelectionnee });

    this.formateurService.supprimerSupport(supportId)
      .subscribe({
        next: () => {
          this.message = 'Support supprimé ✅';
          this.supports = this.supports.filter(s => (s.id ?? s.support_id) !== supportId);

          if (this.formationSelectionnee && this.formationSelectionnee.id) {
            this.formateurService.getSupports(this.formationSelectionnee.id)
              .subscribe({
                next: (data) => this.supports = data,
                error: (err) => console.error('Erreur rechargement supports:', err)
              });
          }
        },
        error: (err) => {
          console.error('Erreur suppression support:', err);
          this.message = 'Erreur lors de la suppression du support';
        }
      });
  }

  /** =================== Changer de section (sidebar) =================== */
  setSection(section: 'accueil' | 'creerFormation' | 'mesFormations' | 'supports' | 'profil' | 'notifications' | 'messages' | 'questions') {
    this.activeSection = section;

    // Reset inscriptions si on quitte mesFormations
    if (section !== 'mesFormations') {
      this.inscriptions = [];
      this.formationSelectionnee = null;
    }
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

  changerMotDePasse() {
    if (!this.ancienMdp || !this.nouveauMdp) {
      this.showMessage('Remplissez tous les champs', 'danger'); return;
    }
    if (this.nouveauMdp !== this.confirmMdp) {
      this.showMessage('Les mots de passe ne correspondent pas', 'danger'); return;
    }
    if (this.nouveauMdp.length < 6) {
      this.showMessage('Mot de passe trop court (min 6 caractères)', 'danger'); return;
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

  getNotifIcon(type: string): string {
    const icons: any = {
      'inscription': '📚',
      'approbation': '✅',
      'rejet': '❌',
      'presence': '🏆',
      'info': 'ℹ️'
    };
    return icons[type] || '🔔';
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

  // ===== Questions =====
  openQuestions() {
    this.activeSection = 'questions';
    this.message = '';
  }

  loadQuestionsFormation(formationId: number) {
    if (!formationId) { this.questionsFormation = []; return; }
    this.questService.getQuestionsFormation(formationId).subscribe({
      next: data => this.questionsFormation = data.map((q: any) => ({ ...q, reponseTemp: '', isEditing: false })),
      error: () => {}
    });
  }

  repondreQuestion(q: any) {
    if (!q.reponseTemp?.trim()) return;
    this.questService.repondre(q.id, q.reponseTemp).subscribe({
      next: () => {
        q.reponse = q.reponseTemp;
        q.reponseTemp = '';
        q.isEditing = false;
        this.showMessage('Réponse envoyée ✅');
      },
      error: () => this.showMessage('Erreur lors de la réponse', 'danger')
    });
  }

  modifierReponse(q: any) {
    q.reponseTemp = q.reponse;
    q.isEditing = true;
  }


logout() {
  localStorage.clear();
  this.router.navigate(['/login']);
}

  /** =================== Progression modulaire =================== */
  ouvrirProgression(etudiant: any) {
    if (!this.formationSelectionnee?.id || !etudiant.etudiant_id) return;
    this.progressionEtudiant = etudiant;
    this.formateurService.getProgression(this.formationSelectionnee.id, etudiant.etudiant_id).subscribe({
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
    if (!this.formationSelectionnee?.id || !this.progressionEtudiant?.etudiant_id) return;
    const ancienStatut = module.statut;
    module.statut = statut;
    this.formateurService.updateProgression(
      this.formationSelectionnee.id,
      this.progressionEtudiant.etudiant_id,
      module.id,
      statut
    ).subscribe({
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
    this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée' };
    this.editSeanceMode = false;
    this.editSeanceId = null;
    this.seanceSelectionnee = null;
    this.feuillePresence = [];
    this.formateurService.getSeances(formation.id).subscribe({
      next: (data) => this.seancesFormation = data,
      error: () => this.showMessage('Erreur chargement des séances', 'danger')
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
          this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée' };
          this.formateurService.getSeances(this.formationSelectionnee.id).subscribe({ next: d => this.seancesFormation = d });
        },
        error: () => this.showMessage('Erreur modification séance', 'danger')
      });
    } else {
      const payload = { ...this.seanceForm, formation_id: this.formationSelectionnee.id };
      this.formateurService.creerSeance(payload).subscribe({
        next: () => {
          this.showMessage('Séance créée ✅');
          this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée' };
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
      statut: seance.statut
    };
  }

  annulerEditSeance() {
    this.editSeanceMode = false;
    this.editSeanceId = null;
    this.seanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', statut: 'planifiée' };
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
    this.formateurService.enregistrerPresence(this.seanceSelectionnee.id, etudiant.etudiant_id, statut).subscribe({
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
        if (statut === 'accepté') {
          // Mettre à jour localement dans la feuille de présence
          const etudiant = this.feuillePresence.find(e => e.etudiant_id === justif.etudiant_id);
          if (etudiant) etudiant.statut = 'excusé';
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
}
