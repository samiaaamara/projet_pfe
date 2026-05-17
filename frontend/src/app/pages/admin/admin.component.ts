import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { MessagesService } from '../../services/messages.service';
import { Auth } from '../../services/auth';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit, OnDestroy {

  activeSection: 'accueil' | 'utilisateurs' | 'formations' | 'formateurs' | 'approvals' | 'messages' = 'accueil';

  user: any = null;

  // Messagerie
  contacts: any[] = [];
  messagesConversation: any[] = [];
  contactSelectionne: any = null;
  nouveauMessage = '';
  unreadMessages = 0;
  adminContactSearch = '';
  private msgPollingInterval: any;

  get filteredAdminContacts() {
    if (!this.adminContactSearch.trim()) return this.contacts;
    const q = this.adminContactSearch.toLowerCase();
    return this.contacts.filter(c => c.nom?.toLowerCase().includes(q));
  }

  users: any[] = [];
  formations: any[] = [];
  formateurs: any[] = [];
  formationsPending: any[] = [];
  formationsAccepted: any[] = [];
  stats: any = {};

  userSearch: string = '';
  userRoleFilter: string = '';
  userSpecialiteFilter: string = '';

  searchTerm: string = '';
  statusFilter: '' | 'draft' | 'published' = '';
  specialiteFilter: string = '';

  formateurSearch: string = '';
  formateurSpecialiteFilter: string = '';
  formateurSort: 'nom' | 'email' | 'specialite' = 'nom';
  formateurSpecialiteOptions: string[] = [];

  get formateursFiltresParSpecialite(): any[] {
    if (!this.formData.specialite) return [];
    return this.formateurs.filter(f => f.specialite === this.formData.specialite);
  }

  onSpecialiteFormChange() {
    this.formData.formateur_id = null;
  }

  message: string = '';
  messageType: 'success' | 'warning' | 'danger' | 'info' = 'info';

  showFormationForm = false;
  editFormationMode = false;
  showFormateurForm = false;
  editFormateurMode = false;

  formData: any = this.getEmptyForm();
  formateurForm: any = this.getEmptyFormateur();
  formDataErrors: any = {};

  photoFile: File | null = null;
  photoPreview: string | null = null;
  photoExistante: string = '';
  formateurErrors: any = {};

  loading = false;

  // Modal configuration avant publication
  showConfigModal = false;
  configFormation: any = null;
  configDateDebut = '';
  configDateFin = '';
  configPrix: number | null = null;
  configSeances: any[] = [];
  configModules: any[] = [];
  configSeanceForm: any = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
  configEditSeanceMode = false;
  configEditSeanceId: number | null = null;
  configLoading = false;
  configPublishing = false;

  get configToday(): string { return new Date().toISOString().split('T')[0]; }

  // Détails formation (modal lecture)
  showDetailsModal = false;
  formationDetails: any = null;
  detailsModules: any[] = [];
  detailsSupports: any[] = [];
  detailsProgramme: any = null;
  detailsLoading = false;

  // Programme de formation
  showProgrammeEditor = false;
  programmeFormation: any = null;
  programmeData = { description_globale: '', objectifs: '', prerequis: '' };
  programmeModules: any[] = [];
  moduleForm = { titre: '', description: '', ordre: 0 };
  editModuleMode = false;
  editModuleId: number | null = null;

  // Stepper création formation (admin)
  adminStep: 1 | 2 | 3 = 1;
  adminStepFormationId: number | null = null;

  // Supports (stepper étape 3)
  adminSupports: any[] = [];
  adminSupportFile: File | null = null;
  adminSupportType = 'pdf';
  adminSupportUrl = '';
  adminSupportNom = '';
  adminSupportLoading = false;

  // Séances (stepper étape 3)
  adminStepSeances: any[] = [];
  adminStepSeanceForm: any = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
  adminStepEditSeanceMode = false;
  adminStepEditSeanceId: number | null = null;

  getSupportIcon(type: string): string {
    const icons: any = { pdf: '📄', video: '🎥', lien: '🔗', image: '🖼️', autre: '📎' };
    return icons[type] || '📎';
  }

  constructor(
    private adminService: AdminService,
    private msgService: MessagesService,
    private authService: Auth
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (stored) this.user = JSON.parse(stored);
    this.authService.getSpecialites().subscribe({
      next: data => this.formateurSpecialiteOptions = data.map(s => s.nom),
      error: () => {}
    });
    this.loadUsers();
    this.loadFormations();
    this.loadFormateurs();
    this.loadFormationsPending();
    this.loadFormationsAccepted();
    this.loadStats();
    this.loadUnreadMessages();
    this.msgPollingInterval = setInterval(() => this.loadUnreadMessages(), 30000);
  }

  ngOnDestroy() {
    if (this.msgPollingInterval) clearInterval(this.msgPollingInterval);
  }

  setSection(section: 'accueil' | 'utilisateurs' | 'formations' | 'formateurs' | 'approvals' | 'messages') {
    this.activeSection = section;
    if (section === 'approvals') {
      this.loadFormationsPending();
      this.loadFormationsAccepted();
    }
    if (section === 'messages') this.loadContacts();
  }

  // ===== Messagerie =====
  loadUnreadMessages() {
    if (!this.user?.id) return;
    this.msgService.getUnreadCount(this.user.id).subscribe({
      next: data => this.unreadMessages = data?.count || 0,
      error: () => {}
    });
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

  getRoleLabel(role: string): string {
    const labels: any = { formateur: 'Formateur', candidat: 'Candidat', externe: 'Externe', admin: 'Admin' };
    return labels[role] || role;
  }

  getEmptyForm() {
    return {
      id: null,
      titre: '',
      description: '',
      date_debut: '',
      date_fin: '',

      formateur_id: null,
      specialite: '',
      nb_places: null,
      prix: 0,
      status: 'draft'
    };
  }

  getEmptyFormateur() {
    return {
      id: null,
      nom: '',
      email: '',
      mot_de_passe: '',
      specialite: ''
    };
  }

  loadUsers() {
    this.adminService.getUsers().subscribe({
      next: res => this.users = res,
      error: err => console.error(err)
    });
  }

  loadFormations() {
    this.adminService.getFormations().subscribe({
      next: res => this.formations = res,
      error: err => console.error(err)
    });
  }

  pageSize = 5;
  currentPage = 1;
  formateurPageSize = 6;
  formateurCurrentPage = 1;
get filteredUsers() {
    return this.users.filter(u => {
      const searchMatch = this.userSearch
        ? `${u.nom} ${u.email}`.toLowerCase().includes(this.userSearch.toLowerCase())
        : true;
      const roleMatch = this.userRoleFilter ? u.role === this.userRoleFilter : true;
      const specialiteMatch = this.userSpecialiteFilter
        ? (u.specialite || '').toLowerCase().includes(this.userSpecialiteFilter.toLowerCase())
        : true;
      return searchMatch && roleMatch && specialiteMatch;
    });
  }

  get filteredFormations() {
    return this.formations.filter(f => {
      const searchMatch = this.searchTerm
        ? f.titre.toLowerCase().includes(this.searchTerm.toLowerCase())
        : true;
      const statusMatch = this.statusFilter ? f.status === this.statusFilter : true;
      const specialiteMatch = this.specialiteFilter
        ? (f.specialite || '').toLowerCase().includes(this.specialiteFilter.toLowerCase())
        : true;
      return searchMatch && statusMatch && specialiteMatch;
    });
  }

  get paginatedFormations() {
    const totalPages = this.pageCount;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredFormations.slice(start, start + this.pageSize);
  }

  get pageCount() {
    return Math.max(1, Math.ceil(this.filteredFormations.length / this.pageSize));
  }

  get paginationPages() {
    return Array.from({ length: this.pageCount }, (_, i) => i + 1);
  }

  get paginatedFormateurs() {
    const totalPages = this.formateurPageCount;
    if (this.formateurCurrentPage > totalPages) this.formateurCurrentPage = totalPages;
    const start = (this.formateurCurrentPage - 1) * this.formateurPageSize;
    return this.filteredFormateurs.slice(start, start + this.formateurPageSize);
  }

  get formateurPageCount() {
    return Math.max(1, Math.ceil(this.filteredFormateurs.length / this.formateurPageSize));
  }

  get formateurPaginationPages() {
    return Array.from({ length: this.formateurPageCount }, (_, i) => i + 1);
  }

  changeFormateurPage(page: number) {
    if (page < 1 || page > this.formateurPageCount) return;
    this.formateurCurrentPage = page;
  }

  get filteredFormateurs() {
    return this.formateurs
      .filter(f => {
        const searchMatch = this.formateurSearch
          ? `${f.nom} ${f.email} ${f.specialite || ''}`.toLowerCase().includes(this.formateurSearch.toLowerCase())
          : true;
        const specialiteMatch = this.formateurSpecialiteFilter
          ? (f.specialite || '').toLowerCase().includes(this.formateurSpecialiteFilter.toLowerCase())
          : true;
        return searchMatch && specialiteMatch;
      })
      .sort((a, b) => {
        const valueA = String(a[this.formateurSort] || '').toLowerCase();
        const valueB = String(b[this.formateurSort] || '').toLowerCase();
        return valueA.localeCompare(valueB);
      });
  }

  changePage(page: number) {
    if (page < 1 || page > this.pageCount) return;
    this.currentPage = page;
  }

  resetFormationErrors() { this.formDataErrors = {}; }
  resetFormateurErrors() { this.formateurErrors = {}; }
  resetFormateurPage() { this.formateurCurrentPage = 1; }

  validateFormationForm() {
    this.resetFormationErrors();
    let valid = true;

    if (!this.formData.titre || this.formData.titre.trim().length === 0) {
      this.formDataErrors.titre = 'Titre obligatoire'; valid = false;
    }
    if (!this.formData.date_debut) {
      this.formDataErrors.date_debut = 'Date début obligatoire'; valid = false;
    }
    if (this.formData.date_fin && new Date(this.formData.date_fin) < new Date(this.formData.date_debut)) {
      this.formDataErrors.date_fin = 'Date fin doit être après date début'; valid = false;
    }
    if (!this.formData.specialite) {
      this.formDataErrors.specialite = 'Spécialité obligatoire'; valid = false;
    }
    if (!this.formData.formateur_id) {
      this.formDataErrors.formateur_id = 'Formateur obligatoire'; valid = false;
    }
    if (!this.formData.nb_places || Number(this.formData.nb_places) <= 0) {
      this.formDataErrors.nb_places = 'Nombre de places positif requis'; valid = false;
    }

    return valid;
  }

  validateFormateurForm() {
    this.resetFormateurErrors();
    let valid = true;
    if (!this.formateurForm.nom || this.formateurForm.nom.trim().length === 0) {
      this.formateurErrors.nom = 'Nom obligatoire'; valid = false;
    }
    if (!this.formateurForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formateurForm.email)) {
      this.formateurErrors.email = 'Email invalide'; valid = false;
    }
    return valid;
  }

  loadFormateurs() {
    this.adminService.getFormateurs().subscribe({
      next: res => { this.formateurs = res; this.resetFormateurPage(); },
      error: err => console.error(err)
    });
  }

  loadStats() {
    this.adminService.getStats().subscribe({
      next: res => this.stats = res,
      error: err => console.error(err)
    });
  }

  openAddForm() {
    this.showFormationForm = true;
    this.editFormationMode = false;
    this.formData = this.getEmptyForm();
    this.resetFormationErrors();
    this.photoFile = null;
    this.photoPreview = null;
    this.photoExistante = '';
    this.adminStep = 1;
    this.adminStepFormationId = null;
    this.programmeFormation = null;
    this.programmeData = { description_globale: '', objectifs: '', prerequis: '' };
    this.programmeModules = [];
    this.moduleForm = { titre: '', description: '', ordre: 0 };
    this.editModuleMode = false;
    this.editModuleId = null;
    this.adminSupports = [];
    this.adminSupportFile = null;
    this.adminSupportType = 'pdf';
    this.adminSupportUrl = '';
    this.adminSupportNom = '';
    this.adminStepSeances = [];
    this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
    this.adminStepEditSeanceMode = false;
    this.adminStepEditSeanceId = null;
  }

  editFormation(f: any) {
    this.showFormationForm = true;
    this.editFormationMode = true;
    this.resetFormationErrors();
    this.formData = {
      id: f.id,
      titre: f.titre || '',
      description: f.description || '',
      date_debut: f.date_debut || '',
      date_fin: f.date_fin || '',

      formateur_id: f.formateur_id || null,
      specialite: f.specialite || '',
      nb_places: f.nb_places || 0,
      prix: f.prix || 0,
      status: f.status || 'draft'
    };
    this.photoFile = null;
    this.photoExistante = f.photo || '';
    this.photoPreview = f.photo ? `${environment.baseUrl}${f.photo}` : null;
  }

  onAdminPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.photoFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.photoPreview = e.target?.result as string; };
      reader.readAsDataURL(this.photoFile);
    }
  }

  supprimerAdminPhoto() {
    this.photoFile = null;
    this.photoPreview = null;
    this.photoExistante = '';
  }

  openAddFormateur() {
    this.showFormateurForm = true;
    this.editFormateurMode = false;
    this.formateurForm = this.getEmptyFormateur();
    this.resetFormateurErrors();
  }

  editFormateur(f: any) {
    this.showFormateurForm = true;
    this.editFormateurMode = true;
    this.resetFormateurErrors();
    this.formateurForm = {
      id: f.id,
      nom: f.nom || '',
      email: f.email || '',
      mot_de_passe: '',
      specialite: f.specialite || ''
    };
  }

  closeForm() {
    this.showFormationForm = false;
    this.resetFormationErrors();
    this.photoFile = null;
    this.photoPreview = null;
    this.photoExistante = '';
    this.adminStep = 1;
    this.adminStepFormationId = null;
  }
  closeFormateurForm() { this.showFormateurForm = false; this.resetFormateurErrors(); }

  saveFormation() {
    if (!this.validateFormationForm()) {
      this.showMessage('⚠️ Veuillez corriger les erreurs dans le formulaire.', 'danger');
      return;
    }
    this.loading = true;

    const fd = new FormData();
    fd.append('titre', this.formData.titre);
    fd.append('description', this.formData.description || '');
    fd.append('date_debut', this.formData.date_debut);
    if (this.formData.date_fin) fd.append('date_fin', this.formData.date_fin);
    fd.append('specialite', this.formData.specialite);
    fd.append('nb_places', this.formData.nb_places);
    fd.append('prix', this.formData.prix || 0);
    fd.append('formateur_id', this.formData.formateur_id);
    if (this.formData.status) fd.append('status', this.formData.status);
    if (this.photoFile) fd.append('photo', this.photoFile);
    else if (this.photoExistante) fd.append('photo_existante', this.photoExistante);

    if (this.editFormationMode) {
      this.adminService.updateFormation(this.formData.id, fd).subscribe({
        next: () => { this.showMessage('Formation modifiée ✅', 'success'); this.afterSave(); },
        error: () => { this.showMessage('❌ Erreur modification', 'danger'); this.loading = false; }
      });
    } else {
      this.adminService.addFormation(fd).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.adminStepFormationId = res.id;
          this.programmeFormation = { id: res.id, titre: this.formData.titre };
          this.programmeModules = [];
          this.adminStep = 2;
        },
        error: () => { this.showMessage('❌ Erreur ajout', 'danger'); this.loading = false; }
      });
    }
  }

  passerStep3Admin() {
    if (!this.adminStepFormationId) return;
    if (this.programmeData.description_globale || this.programmeData.objectifs || this.programmeData.prerequis) {
      this.adminService.saveProgramme(this.adminStepFormationId, this.programmeData).subscribe({ error: () => {} });
    }
    this.adminStepSeances = [];
    this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
    this.adminStep = 3;
  }

  onAdminSupportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.adminSupportFile = input.files[0];
      if (!this.adminSupportNom) this.adminSupportNom = input.files[0].name;
    }
  }

  ajouterSupportAdmin() {
    if (!this.adminStepFormationId) return;
    if (this.adminSupportType === 'lien') {
      if (!this.adminSupportUrl.trim()) { this.showMessage('URL obligatoire pour un lien.', 'danger'); return; }
      const fd = new FormData();
      fd.append('type', this.adminSupportType);
      fd.append('fichier', this.adminSupportUrl.trim());
      fd.append('nom', this.adminSupportNom || this.adminSupportUrl.trim());
      this.adminSupportLoading = true;
      this.adminService.addFormationSupport(this.adminStepFormationId, fd).subscribe({
        next: (res: any) => {
          this.adminSupports.push(res);
          this.adminSupportUrl = '';
          this.adminSupportNom = '';
          this.adminSupportLoading = false;
        },
        error: () => { this.showMessage('Erreur ajout support', 'danger'); this.adminSupportLoading = false; }
      });
    } else {
      if (!this.adminSupportFile) { this.showMessage('Sélectionnez un fichier.', 'danger'); return; }
      const fd = new FormData();
      fd.append('type', this.adminSupportType);
      fd.append('fichier', this.adminSupportFile);
      fd.append('nom', this.adminSupportNom || this.adminSupportFile.name);
      this.adminSupportLoading = true;
      this.adminService.addFormationSupport(this.adminStepFormationId, fd).subscribe({
        next: (res: any) => {
          this.adminSupports.push(res);
          this.adminSupportFile = null;
          this.adminSupportNom = '';
          this.adminSupportLoading = false;
        },
        error: () => { this.showMessage('Erreur upload support', 'danger'); this.adminSupportLoading = false; }
      });
    }
  }

  supprimerSupportAdmin(supportId: number) {
    this.adminService.deleteFormationSupport(supportId).subscribe({
      next: () => { this.adminSupports = this.adminSupports.filter(s => s.id !== supportId); },
      error: () => this.showMessage('Erreur suppression support', 'danger')
    });
  }

  ajouterSeanceAdmin() {
    if (!this.adminStepFormationId) return;
    const f = this.adminStepSeanceForm;
    if (!f.date_seance || !f.heure_debut || !f.heure_fin) {
      this.showMessage('Date, heure début et heure fin sont obligatoires.', 'danger'); return;
    }
    if (this.adminStepEditSeanceMode && this.adminStepEditSeanceId) {
      this.adminService.deleteFormationSeance(this.adminStepEditSeanceId).subscribe({
        next: () => {
          this.adminStepSeances = this.adminStepSeances.filter(s => s.id !== this.adminStepEditSeanceId);
          this._creerSeanceAdmin();
        },
        error: () => this.showMessage('Erreur modification séance', 'danger')
      });
    } else {
      this._creerSeanceAdmin();
    }
  }

  private _creerSeanceAdmin() {
    const module = this.programmeModules.find(m => m.id === this.adminStepSeanceForm.module_id);
    this.adminService.addFormationSeance(this.adminStepFormationId!, {
      ...this.adminStepSeanceForm, formation_id: this.adminStepFormationId
    }).subscribe({
      next: (res: any) => {
        this.adminStepSeances.push({ id: res.id, ...this.adminStepSeanceForm, module_titre: module?.titre || null });
        this.adminStepSeances = [...this.adminStepSeances].sort((a, b) => a.date_seance > b.date_seance ? 1 : -1);
        this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
        this.adminStepEditSeanceMode = false;
        this.adminStepEditSeanceId = null;
      },
      error: (err: any) => this.showMessage(err?.error?.error || 'Erreur ajout séance', 'danger')
    });
  }

  editerSeanceAdmin(s: any) {
    this.adminStepEditSeanceMode = true;
    this.adminStepEditSeanceId = s.id;
    this.adminStepSeanceForm = { date_seance: s.date_seance?.substring(0, 10), heure_debut: s.heure_debut, heure_fin: s.heure_fin, salle: s.salle || '', module_id: s.module_id || null };
  }

  annulerEditSeanceAdmin() {
    this.adminStepEditSeanceMode = false;
    this.adminStepEditSeanceId = null;
    this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
  }

  supprimerSeanceAdmin(id: number) {
    this.adminService.deleteFormationSeance(id).subscribe({
      next: () => { this.adminStepSeances = this.adminStepSeances.filter(s => s.id !== id); },
      error: () => this.showMessage('Erreur suppression séance', 'danger')
    });
  }

  terminerCreationAdmin() {
    this.showMessage('Formation créée avec succès ✅', 'success');
    this.closeForm();
    this.loadFormations();
    this.loadStats();
  }

  // ===== QUIZ MANAGEMENT =====
  showQuizModal = false;
  quizManagFormationId: number | null = null;
  quizManagFormationTitre = '';
  quizManagLoading = false;
  quizManagForm = { titre: 'Quiz de validation', seuil_reussite: 70, nb_tentatives: 3 };
  quizManagQuestions: any[] = [];
  quizManagHasExisting = false;

  ouvrirGererQuiz(f: any) {
    this.quizManagFormationId = f.id;
    this.quizManagFormationTitre = f.titre;
    this.quizManagLoading = true;
    this.showQuizModal = true;
    this.adminService.getFormationQuiz(f.id).subscribe({
      next: (data: any) => {
        this.quizManagLoading = false;
        if (data) {
          this.quizManagHasExisting = true;
          this.quizManagForm = { titre: data.titre, seuil_reussite: data.seuil_reussite, nb_tentatives: data.nb_tentatives };
          this.quizManagQuestions = data.questions.map((q: any) => ({
            question: q.question,
            reponses: q.reponses.map((r: any) => ({ reponse: r.reponse, est_correcte: !!r.est_correcte }))
          }));
        } else {
          this.quizManagHasExisting = false;
          this.quizManagForm = { titre: 'Quiz de validation', seuil_reussite: 70, nb_tentatives: 3 };
          this.quizManagQuestions = [
            { question: '', reponses: [{ reponse: '', est_correcte: true }, { reponse: '', est_correcte: false }] }
          ];
        }
      },
      error: () => { this.quizManagLoading = false; }
    });
  }

  fermerQuizModal() {
    this.showQuizModal = false;
    this.quizManagFormationId = null;
    this.quizManagQuestions = [];
  }

  ajouterQuestionAdmin() {
    this.quizManagQuestions.push({
      question: '',
      reponses: [{ reponse: '', est_correcte: true }, { reponse: '', est_correcte: false }]
    });
  }

  supprimerQuestionAdmin(i: number) { this.quizManagQuestions.splice(i, 1); }

  ajouterReponseAdmin(qi: number) {
    this.quizManagQuestions[qi].reponses.push({ reponse: '', est_correcte: false });
  }

  supprimerReponseAdmin(qi: number, ri: number) {
    this.quizManagQuestions[qi].reponses.splice(ri, 1);
  }

  setCorrectAnswer(qi: number, ri: number) {
    this.quizManagQuestions[qi].reponses.forEach((r: any, idx: number) => {
      r.est_correcte = idx === ri;
    });
  }

  sauvegarderQuiz() {
    if (!this.quizManagFormationId) return;
    if (!this.quizManagQuestions.length) { this.showMessage('Ajoutez au moins une question.', 'danger'); return; }
    for (const q of this.quizManagQuestions) {
      if (!q.question.trim()) { this.showMessage('Toutes les questions doivent avoir un texte.', 'danger'); return; }
      if (!q.reponses.some((r: any) => r.est_correcte)) { this.showMessage('Chaque question doit avoir une bonne réponse.', 'danger'); return; }
    }
    const payload = { ...this.quizManagForm, questions: this.quizManagQuestions };
    this.adminService.saveFormationQuiz(this.quizManagFormationId, payload).subscribe({
      next: () => { this.showMessage('Quiz sauvegardé ✅', 'success'); this.fermerQuizModal(); },
      error: (err: any) => this.showMessage(err?.error?.error || '❌ Erreur sauvegarde quiz', 'danger')
    });
  }

  supprimerQuizAdmin() {
    if (!this.quizManagFormationId || !confirm('Supprimer le quiz de cette formation ?')) return;
    this.adminService.deleteFormationQuiz(this.quizManagFormationId).subscribe({
      next: () => { this.showMessage('Quiz supprimé ✅', 'success'); this.fermerQuizModal(); },
      error: () => this.showMessage('Erreur suppression quiz', 'danger')
    });
  }

  saveFormateur() {
    if (!this.validateFormateurForm()) {
      this.showMessage('⚠️ Veuillez corriger les erreurs dans le formulaire formateur.', 'danger');
      return;
    }
    this.loading = true;
    if (this.editFormateurMode) {
      this.adminService.updateFormateur(this.formateurForm.id, this.formateurForm).subscribe({
        next: () => { this.showMessage('Formateur mis à jour ✅', 'success'); this.afterSaveFormateur(); },
        error: err => { this.showMessage(err?.error?.message || '❌ Erreur lors de la mise à jour', 'danger'); this.loading = false; }
      });
    } else {
      this.adminService.addFormateur(this.formateurForm).subscribe({
        next: () => { this.showMessage('Formateur créé ✅', 'success'); this.afterSaveFormateur(); },
        error: err => { this.showMessage(err?.error?.message || '❌ Erreur lors de la création', 'danger'); this.loading = false; }
      });
    }
  }

  deleteFormateur(id: number) {
    if (!confirm('Supprimer ce formateur ?')) return;
    this.adminService.deleteFormateur(id).subscribe({
      next: () => { this.showMessage('Formateur supprimé ✅', 'success'); this.loadFormateurs(); },
      error: err => this.showMessage(err?.error?.message || '❌ Erreur de suppression', 'danger')
    });
  }

  afterSave() { this.loading = false; this.loadFormations(); this.closeForm(); }
  afterSaveFormateur() { this.loading = false; this.loadFormateurs(); this.closeFormateurForm(); }

  showMessage(msg: string, type: 'success' | 'warning' | 'danger' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  deleteFormation(id: number) {
    if (!confirm('Supprimer cette formation ?')) return;
    this.adminService.deleteFormation(id).subscribe(() => {
      this.showMessage('Formation supprimée ✅', 'success');
      this.loadFormations();
    });
  }

  publishFormation(id: number) {
    this.adminService.publishFormation(id).subscribe(() => {
      this.showMessage('Formation publiée 🚀', 'success');
      this.loadFormations();
    });
  }

  deleteUser(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.')) return;
    this.adminService.deleteUser(id).subscribe({
      next: () => {
        this.showMessage('Utilisateur supprimé avec succès ✅', 'success');
        this.loadUsers();
      },
      error: (err) => {
        this.showMessage(err?.error?.message || 'Erreur lors de la suppression ❌', 'danger');
      }
    });
  }

  loadFormationsPending() {
    this.adminService.getFormationsPending().subscribe({
      next: res => this.formationsPending = res,
      error: err => console.error(err)
    });
  }

 loadFormationsAccepted() {
  this.adminService.getFormationsAccepted().subscribe({
    next: res => this.formationsAccepted = res,
    error: err => console.error(err)
  });
}

acceptFormation(formationId: number) {
  if (!confirm('Accepter cette formation ? Une notification sera envoyée au formateur.')) return;

  this.adminService.acceptFormation(formationId).subscribe({
    next: () => {
      this.showMessage('Formation acceptée ✅ — Le formateur a été notifié.', 'success');
      this.loadFormationsPending();
      this.loadFormationsAccepted();
    },
    error: (err) => {
      this.showMessage(err?.error?.error || '❌ Erreur lors de l\'acceptation', 'danger');
    }
  });
}


// ===== Configuration avant publication =====
ouvrirConfig(f: any) {
  this.configFormation = f;
  this.configDateDebut = f.date_debut ? f.date_debut.substring(0, 10) : '';
  this.configDateFin = f.date_fin ? f.date_fin.substring(0, 10) : '';
  this.configPrix = f.prix ?? null;
  this.configSeances = [];
  this.configModules = [];
  this.configSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
  this.configEditSeanceMode = false;
  this.configEditSeanceId = null;
  this.configLoading = true;
  this.showConfigModal = true;

  this.adminService.getFormationDetails(f.id).subscribe({
    next: (res: any) => {
      this.configModules = res.modules || [];
      this.configLoading = false;
    },
    error: () => { this.configLoading = false; }
  });

  this.adminService.getFormationSeances(f.id).subscribe({
    next: (data) => this.configSeances = data,
    error: () => {}
  });
}

fermerConfig() {
  this.showConfigModal = false;
  this.configFormation = null;
}

ajouterSeanceConfig() {
  if (!this.configFormation) return;
  if (!this.configSeanceForm.date_seance || !this.configSeanceForm.heure_debut || !this.configSeanceForm.heure_fin) {
    this.showMessage('Date, heure début et heure fin sont obligatoires.', 'danger'); return;
  }
  if (this.configEditSeanceMode && this.configEditSeanceId) {
    // Pas de route PUT admin — supprimer et recréer
    this.adminService.deleteFormationSeance(this.configEditSeanceId).subscribe({
      next: () => {
        this.configSeances = this.configSeances.filter(s => s.id !== this.configEditSeanceId);
        this._creerSeanceConfig();
      },
      error: () => this.showMessage('Erreur modification séance', 'danger')
    });
  } else {
    this._creerSeanceConfig();
  }
}

private _creerSeanceConfig() {
  this.adminService.addFormationSeance(this.configFormation.id, {
    ...this.configSeanceForm,
    formation_id: this.configFormation.id
  }).subscribe({
    next: (res: any) => {
      const module = this.configModules.find(m => m.id === this.configSeanceForm.module_id);
      this.configSeances.push({
        id: res.id,
        ...this.configSeanceForm,
        module_titre: module?.titre || null,
        module_ordre: module?.ordre || null
      });
      this.configSeances = [...this.configSeances].sort((a, b) => a.date_seance > b.date_seance ? 1 : -1);
      this.configSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
      this.configEditSeanceMode = false;
      this.configEditSeanceId = null;
    },
    error: (err: any) => this.showMessage(err?.error?.error || 'Erreur ajout séance', 'danger')
  });
}

editerSeanceConfig(s: any) {
  this.configEditSeanceMode = true;
  this.configEditSeanceId = s.id;
  this.configSeanceForm = {
    date_seance: s.date_seance?.substring(0, 10),
    heure_debut: s.heure_debut,
    heure_fin: s.heure_fin,
    salle: s.salle || '',
    module_id: s.module_id || null
  };
}

annulerEditSeanceConfig() {
  this.configEditSeanceMode = false;
  this.configEditSeanceId = null;
  this.configSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_id: null };
}

supprimerSeanceConfig(seanceId: number) {
  this.adminService.deleteFormationSeance(seanceId).subscribe({
    next: () => {
      this.configSeances = this.configSeances.filter(s => s.id !== seanceId);
    },
    error: () => this.showMessage('Erreur suppression séance', 'danger')
  });
}

publierFormation() {
  if (!this.configFormation || !this.configDateDebut) {
    this.showMessage('La date de début est obligatoire.', 'danger'); return;
  }
  if (!this.configPrix || this.configPrix <= 0) {
    this.showMessage('Le prix est obligatoire pour publier la formation.', 'danger'); return;
  }
  if (this.configDateFin && this.configDateFin < this.configDateDebut) {
    this.showMessage('La date de fin doit être après la date de début.', 'danger'); return;
  }
  this.configPublishing = true;
  this.adminService.publishAcceptedFormation(this.configFormation.id, {
    date_debut: this.configDateDebut,
    date_fin: this.configDateFin || undefined,
    prix: this.configPrix
  }).subscribe({
    next: () => {
      this.showMessage(`Formation publiée dans le catalogue 🚀 — ${this.configPrix} EUR. Le formateur a été notifié.`, 'success');
      this.configPublishing = false;
      this.fermerConfig();
      this.loadFormationsAccepted();
      this.loadFormations();
    },
    error: (err: any) => {
      this.configPublishing = false;
      this.showMessage(err?.error?.error || '❌ Erreur lors de la publication', 'danger');
    }
  });
}
  rejectFormation(formationId: number) {
    const reason = prompt('Raison du rejet:');
    if (reason === null) return;
    this.adminService.rejectFormation(formationId, reason).subscribe({
      next: () => {
        this.showMessage('Formation rejetée et remise en draft 🔙', 'success');
        this.loadFormationsPending();
      },
      error: err => this.showMessage(err?.error?.error || '❌ Erreur lors du rejet', 'danger')
    });
  }

  // ===== Détails formation =====
  voirDetails(f: any) {
    this.showDetailsModal = true;
    this.formationDetails = f;
    this.detailsLoading = true;
    this.detailsModules = [];
    this.detailsSupports = [];
    this.detailsProgramme = null;
    this.adminService.getFormationDetails(f.id).subscribe({
      next: (res: any) => {
        this.formationDetails = res.formation;
        this.detailsProgramme = res.programme;
        this.detailsModules = res.modules || [];
        this.detailsSupports = res.supports || [];
        this.detailsLoading = false;
      },
      error: () => {
        this.detailsLoading = false;
        this.showMessage('Erreur lors du chargement des détails', 'danger');
      }
    });
  }

  fermerDetails() {
    this.showDetailsModal = false;
    this.formationDetails = null;
    this.detailsModules = [];
    this.detailsSupports = [];
    this.detailsProgramme = null;
  }

  accepterDepuisDetails() {
    if (!this.formationDetails) return;
    this.fermerDetails();
    this.acceptFormation(this.formationDetails.id);
  }

  rejeterDepuisDetails() {
    if (!this.formationDetails) return;
    const id = this.formationDetails.id;
    this.fermerDetails();
    this.rejectFormation(id);
  }


  // ===== Programme =====
  ouvrirProgramme(f: any) {
    this.programmeFormation = f;
    this.showProgrammeEditor = true;
    this.editModuleMode = false;
    this.editModuleId = null;
    this.moduleForm = { titre: '', description: '', ordre: 0 };
    this.adminService.getProgramme(f.id).subscribe({
      next: (res: any) => {
        const p = res.programme;
        this.programmeData = p
          ? { description_globale: p.description_globale || '', objectifs: p.objectifs || '', prerequis: p.prerequis || '' }
          : { description_globale: '', objectifs: '', prerequis: '' };
        this.programmeModules = res.modules || [];
      },
      error: () => this.showMessage('Erreur chargement du programme', 'danger')
    });
  }

  fermerProgrammeEditor() {
    this.showProgrammeEditor = false;
    this.programmeFormation = null;
    this.editModuleMode = false;
    this.editModuleId = null;
  }

  sauvegarderProgramme() {
    if (!this.programmeFormation) return;
    this.adminService.saveProgramme(this.programmeFormation.id, this.programmeData).subscribe({
      next: () => this.showMessage('Programme sauvegardé ✅', 'success'),
      error: () => this.showMessage('Erreur sauvegarde programme', 'danger')
    });
  }

  soumettrModule() {
    if (!this.moduleForm.titre || !(this.moduleForm.titre as string).trim() || !this.programmeFormation) return;
    if (this.editModuleMode && this.editModuleId !== null) {
      this.adminService.updateModule(this.programmeFormation.id, this.editModuleId, this.moduleForm).subscribe({
        next: () => {
          const idx = this.programmeModules.findIndex(m => m.id === this.editModuleId);
          if (idx !== -1) this.programmeModules[idx] = { ...this.programmeModules[idx], ...this.moduleForm };
          this.annulerEditModule();
          this.showMessage('Module mis à jour ✅', 'success');
        },
        error: () => this.showMessage('Erreur mise à jour module', 'danger')
      });
    } else {
      this.adminService.addModule(this.programmeFormation.id, this.moduleForm).subscribe({
        next: (res: any) => {
          this.programmeModules.push({ id: res.id, ...this.moduleForm, formation_id: this.programmeFormation.id });
          this.moduleForm = { titre: '', description: '', ordre: this.programmeModules.length };
          this.showMessage('Module ajouté ✅', 'success');
        },
        error: () => this.showMessage('Erreur ajout module', 'danger')
      });
    }
  }

  editerModule(m: any) {
    this.editModuleMode = true;
    this.editModuleId = m.id;
    this.moduleForm = { titre: m.titre, description: m.description || '', ordre: m.ordre };
  }

  annulerEditModule() {
    this.editModuleMode = false;
    this.editModuleId = null;
    this.moduleForm = { titre: '', description: '', ordre: this.programmeModules.length };
  }

  supprimerModule(moduleId: number) {
    if (!confirm('Supprimer ce module ?') || !this.programmeFormation) return;
    this.adminService.deleteModule(this.programmeFormation.id, moduleId).subscribe({
      next: () => {
        this.programmeModules = this.programmeModules.filter(m => m.id !== moduleId);
        this.showMessage('Module supprimé ✅', 'success');
      },
      error: () => this.showMessage('Erreur suppression module', 'danger')
    });
  }

  logout() {
    localStorage.removeItem('adminLogged');
    window.location.href = '/admin-login';
  }
}