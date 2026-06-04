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

  activeSection: 'accueil' | 'utilisateurs' | 'formations' | 'formateurs' | 'approvals' | 'messages' | 'paiements' | 'quiz' | 'attestation' | 'creer-formation' = 'accueil';

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
  inscriptionsPending: any[] = [];
  listeAttenteGlobale: any[] = [];
  stats: any = {};

  // Inscrits par formation (modal)
  showInscritsFormationModal = false;
  inscritsFormation: any[] = [];
  inscritsFormationSelected: any = null;
  inscritsLoading = false;

  // Modal rejet avec raison
  showRejetModal = false;
  rejetMotif = '';
  rejetMotifError = '';
  private rejetCallback: ((raison: string) => void) | null = null;

  ouvrirModalRejet(callback: (raison: string) => void) {
    this.rejetMotif = '';
    this.rejetMotifError = '';
    this.rejetCallback = callback;
    this.showRejetModal = true;
  }

  confirmerRejet() {
    if (!this.rejetMotif.trim()) {
      this.rejetMotifError = 'Veuillez saisir un motif de rejet.';
      return;
    }
    this.showRejetModal = false;
    if (this.rejetCallback) this.rejetCallback(this.rejetMotif.trim());
    this.rejetCallback = null;
  }

  annulerRejet() {
    this.showRejetModal = false;
    this.rejetCallback = null;
    this.rejetMotif = '';
    this.rejetMotifError = '';
  }

  get nbCandidatsInscritsAdmin(): number {
    return this.inscritsFormation.filter(i => i.type_participant === 'candidat').length;
  }
  get nbExternesInscritsAdmin(): number {
    return this.inscritsFormation.filter(i => i.type_participant === 'externe').length;
  }

  // Quiz stats
  quizStats: any[] = [];

  // Attestation stats
  attestationStats: any[] = [];
  attestationSearch = '';
  attestationFiltre: 'tous' | 'avec_eligibles' | 'sans_eligibles' = 'tous';

  get attestationStatsFiltres(): any[] {
    let list = this.attestationStats;
    if (this.attestationFiltre === 'avec_eligibles') list = list.filter(a => (a.candidats_eligibles + a.externes_eligibles) > 0);
    if (this.attestationFiltre === 'sans_eligibles') list = list.filter(a => (a.candidats_eligibles + a.externes_eligibles) === 0);
    if (this.attestationSearch.trim()) {
      const q = this.attestationSearch.toLowerCase();
      list = list.filter(a =>
        a.formation_titre?.toLowerCase().includes(q) ||
        a.formateur_nom?.toLowerCase().includes(q) ||
        a.specialite?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get attesTotalFormations(): number { return this.attestationStats.length; }
  get attesTotalInscrits(): number {
    return this.attestationStats.reduce((s, a) => s + (a.candidats_inscrits || 0) + (a.externes_inscrits || 0), 0);
  }
  get attesTotalEligibles(): number {
    return this.attestationStats.reduce((s, a) => s + (a.candidats_eligibles || 0) + (a.externes_eligibles || 0), 0);
  }
  get attesTauxGlobal(): number {
    const inscrits = this.attesTotalInscrits;
    return inscrits > 0 ? Math.round((this.attesTotalEligibles / inscrits) * 100) : 0;
  }
  quizSearch = '';
  quizFiltreStatut: 'tous' | 'avec' | 'sans' = 'tous';

  get quizStatsFiltres(): any[] {
    let list = this.quizStats;
    if (this.quizFiltreStatut === 'avec') list = list.filter(q => q.quiz_id);
    if (this.quizFiltreStatut === 'sans') list = list.filter(q => !q.quiz_id);
    if (this.quizSearch.trim()) {
      const s = this.quizSearch.toLowerCase();
      list = list.filter(q => q.formation_titre?.toLowerCase().includes(s) || q.formateur_nom?.toLowerCase().includes(s));
    }
    return list;
  }

  get usersExternes(): number { return this.users.filter(u => u.role === 'externe').length; }
  get formationsPubliees(): number { return this.formations.filter(f => f.status === 'published').length; }
  get formateursAvecFormation(): number { return this.formateurs.filter(f => !!f.formation_active_id).length; }

  get quizTotalFormations(): number { return this.quizStats.length; }
  get quizAvecQuiz(): number { return this.quizStats.filter(q => q.quiz_id).length; }
  get quizTotalTentatives(): number { return this.quizStats.reduce((s, q) => s + (q.total_tentatives || 0), 0); }
  get quizTauxReussiteGlobal(): number {
    const total = this.quizStats.reduce((s, q) => s + (q.total_tentatives || 0), 0);
    const reussies = this.quizStats.reduce((s, q) => s + (q.tentatives_reussies || 0), 0);
    return total > 0 ? Math.round((reussies / total) * 100) : 0;
  }

  // Paiements externes
  paiementsExternes: any[] = [];
  paiementsFiltreStatut: 'tous' | 'payé' | 'en_attente' = 'tous';
  paiementsRecherche = '';

  get paiementsFiltres(): any[] {
    let list = this.paiementsExternes;
    if (this.paiementsFiltreStatut !== 'tous')
      list = list.filter(p => p.statut_paiement === this.paiementsFiltreStatut);
    if (this.paiementsRecherche.trim()) {
      const q = this.paiementsRecherche.toLowerCase();
      list = list.filter(p =>
        p.externe_nom?.toLowerCase().includes(q) ||
        p.externe_email?.toLowerCase().includes(q) ||
        p.formation_titre?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get paiementsTotalEncaisse(): number {
    return this.paiementsExternes
      .filter(p => p.statut_paiement === 'payé')
      .reduce((sum, p) => sum + parseFloat(p.montant || 0), 0);
  }

  get paiementsEnAttenteCount(): number {
    return this.paiementsExternes.filter(p => p.statut_paiement === 'en_attente').length;
  }

  // Filtres approbations
  apprFiltreCategorie: 'tous' | 'inscriptions' | 'formations-pending' | 'formations-accepted' | 'liste-attente' = 'tous';
  apprFiltreType: 'tous' | 'candidat' | 'externe' = 'tous';
  apprRecherche = '';

  get inscriptionsFiltrees(): any[] {
    let list = this.inscriptionsPending;
    if (this.apprFiltreType !== 'tous')
      list = list.filter(i => i.type_utilisateur === this.apprFiltreType);
    if (this.apprRecherche.trim()) {
      const q = this.apprRecherche.toLowerCase();
      list = list.filter(i =>
        i.user_nom?.toLowerCase().includes(q) ||
        i.user_email?.toLowerCase().includes(q) ||
        i.formation_titre?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get formationsPendingFiltrees(): any[] {
    if (!this.apprRecherche.trim()) return this.formationsPending;
    const q = this.apprRecherche.toLowerCase();
    return this.formationsPending.filter(f =>
      f.titre?.toLowerCase().includes(q) ||
      f.formateur?.toLowerCase().includes(q) ||
      f.specialite?.toLowerCase().includes(q)
    );
  }

  get formationsAcceptedFiltrees(): any[] {
    if (!this.apprRecherche.trim()) return this.formationsAccepted;
    const q = this.apprRecherche.toLowerCase();
    return this.formationsAccepted.filter(f =>
      f.titre?.toLowerCase().includes(q) ||
      f.formateur?.toLowerCase().includes(q)
    );
  }

  get listeAttenteFiltree(): any[] {
    if (!this.apprRecherche.trim()) return this.listeAttenteGlobale;
    const q = this.apprRecherche.toLowerCase();
    return this.listeAttenteGlobale.filter(a =>
      a.user_nom?.toLowerCase().includes(q) ||
      a.user_email?.toLowerCase().includes(q) ||
      a.formation_titre?.toLowerCase().includes(q)
    );
  }

  get apprShowInscriptions(): boolean {
    return (this.apprFiltreCategorie === 'tous' || this.apprFiltreCategorie === 'inscriptions') && this.inscriptionsFiltrees.length > 0;
  }
  get apprShowFormationsPending(): boolean {
    return (this.apprFiltreCategorie === 'tous' || this.apprFiltreCategorie === 'formations-pending') && this.formationsPendingFiltrees.length > 0;
  }
  get apprShowFormationsAccepted(): boolean {
    return (this.apprFiltreCategorie === 'tous' || this.apprFiltreCategorie === 'formations-accepted') && this.formationsAcceptedFiltrees.length > 0;
  }
  get apprShowListeAttente(): boolean {
    return (this.apprFiltreCategorie === 'tous' || this.apprFiltreCategorie === 'liste-attente') && this.listeAttenteFiltree.length > 0;
  }
  get apprAucunResultat(): boolean {
    return !this.apprShowInscriptions && !this.apprShowFormationsPending && !this.apprShowFormationsAccepted && !this.apprShowListeAttente;
  }

  userSearch: string = '';
  userRoleFilter: string = '';
  userSpecialiteFilter: string = '';

  searchTerm: string = '';
  statusFilter: '' | 'draft' | 'published' | 'pending_approval' | 'accepted' | 'archivée' | 'en_cours' | 'terminée' = '';
  specialiteFilter: string = '';

  formateurSearch: string = '';
  formateurSpecialiteFilter: string = '';
  formateurSort: 'nom' | 'email' | 'specialite' = 'nom';
  formateurSpecialiteOptions: string[] = [];

  formateursDisponibilite: any[] = [];

  get formateursFiltresParSpecialite(): any[] {
    if (!this.formData.specialite) return [];
    return this.formateurs.filter(f => f.specialite === this.formData.specialite);
  }

  get formateursAvecDispo(): any[] {
    if (!this.formData.specialite) return [];
    return this.formateurs.filter(f => f.specialite === this.formData.specialite);
  }

  onSpecialiteFormChange() {
    this.formData.formateur_id = null;
  }

  isFormateurEnCours(f: any): boolean {
    return !!f.formation_active_id;
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
  configNbPlaces: number | null = null;
  configQuiz: any = null;
  configSeances: any[] = [];
  configModules: any[] = [];
  configSeanceForm: any = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
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
  detailsQuiz: any = null;
  detailsListeAttente: any[] = [];
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
  adminStep: 1 | 2 | 3 | 4 = 1;
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
  adminStepSeanceForm: any = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
  adminStepEditSeanceMode = false;
  adminStepEditSeanceId: number | null = null;

  // Quiz (stepper étape 4)
  adminQuizTitre = 'Quiz de validation';
  adminQuizSeuil = 70;
  adminQuizNbTentatives = 3;
  adminQuizSaving = false;
  adminQuizQuestions: { question: string; reponses: { reponse: string; est_correcte: boolean }[] }[] = [];

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
    this.loadInscriptionsPending();
    this.loadStats();
    this.loadUnreadMessages();
    this.msgPollingInterval = setInterval(() => this.loadUnreadMessages(), 30000);
  }

  ngOnDestroy() {
    if (this.msgPollingInterval) clearInterval(this.msgPollingInterval);
  }

  setSection(section: 'accueil' | 'utilisateurs' | 'formations' | 'formateurs' | 'approvals' | 'messages' | 'paiements' | 'quiz' | 'attestation' | 'creer-formation') {
    this.activeSection = section;
    if (section === 'approvals') {
      this.loadFormationsPending();
      this.loadFormationsAccepted();
      this.loadInscriptionsPending();
    }
    if (section === 'messages') this.loadContacts();
    if (section === 'paiements') this.loadPaiementsExternes();
    if (section === 'quiz') this.loadQuizStats();
    if (section === 'attestation') this.loadAttestationStats();
  }

  loadAttestationStats() {
    this.adminService.getAttestationStats().subscribe({
      next: data => this.attestationStats = data,
      error: () => this.showMessage('❌ Erreur chargement statistiques attestations', 'danger')
    });
  }

  loadQuizStats() {
    this.adminService.getQuizStats().subscribe({
      next: data => this.quizStats = data,
      error: () => this.showMessage('❌ Erreur chargement statistiques quiz', 'danger')
    });
  }

  supprimerQuiz(formationId: number, titreFo: string) {
    if (!confirm(`Supprimer le quiz de "${titreFo}" ?`)) return;
    this.adminService.deleteFormationQuiz(formationId).subscribe({
      next: () => { this.showMessage('Quiz supprimé ✅', 'success'); this.loadQuizStats(); },
      error: () => this.showMessage('❌ Erreur suppression quiz', 'danger')
    });
  }

  loadPaiementsExternes() {
    this.adminService.getPaiementsExternes().subscribe({
      next: data => this.paiementsExternes = data,
      error: (err) => this.showMessage(err?.error?.error || '❌ Erreur chargement paiements', 'danger')
    });
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

  get uniqueSpecialites(): string[] {
    return [...new Set(this.users.map((u: any) => u.specialite).filter((s: any) => s))].sort() as string[];
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
    if (!this.editFormateurMode) {
      if (!this.formateurForm.mot_de_passe || this.formateurForm.mot_de_passe.length < 8) {
        this.formateurErrors.mot_de_passe = 'Mot de passe obligatoire (minimum 8 caractères)'; valid = false;
      }
    }
    return valid;
  }

  loadFormateurs() {
    this.adminService.getFormateursDisponibilite().subscribe({
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

  voirInscritsFormation(f: any) {
    this.inscritsFormationSelected = f;
    this.inscritsFormation = [];
    this.inscritsLoading = true;
    this.showInscritsFormationModal = true;
    this.adminService.getInscritsFormation(f.id).subscribe({
      next: data => { this.inscritsFormation = data; this.inscritsLoading = false; },
      error: () => { this.inscritsLoading = false; }
    });
  }

  fermerInscritsFormationModal() {
    this.showInscritsFormationModal = false;
    this.inscritsFormation = [];
    this.inscritsFormationSelected = null;
  }

  openAddForm() {
    this.setSection('creer-formation');
    this.editFormationMode = false;
    this.formData = this.getEmptyForm();
    this.adminService.getFormateursDisponibilite().subscribe({
      next: data => this.formateursDisponibilite = data,
      error: () => {}
    });
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
    this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
    this.adminStepEditSeanceMode = false;
    this.adminStepEditSeanceId = null;
    this.adminQuizTitre = 'Quiz de validation';
    this.adminQuizSeuil = 70;
    this.adminQuizNbTentatives = 3;
    this.adminQuizQuestions = [];
  }

  editFormation(f: any) {
    this.showFormationForm = true;
    this.editFormationMode = true;
    this.resetFormationErrors();
    this.loadFormateurs();
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
    if (!this.editFormationMode) { this.setSection('formations'); }
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
    this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
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
    const selectedModules = this.programmeModules.filter(m => this.adminStepSeanceForm.module_ids.includes(m.id));
    this.adminService.addFormationSeance(this.adminStepFormationId!, {
      ...this.adminStepSeanceForm, formation_id: this.adminStepFormationId
    }).subscribe({
      next: (res: any) => {
        this.adminStepSeances.push({
          id: res.id,
          ...this.adminStepSeanceForm,
          modules: selectedModules,
          module_titre: selectedModules.map((m: any) => m.titre).join(', ')
        });
        this.adminStepSeances = [...this.adminStepSeances].sort((a, b) => a.date_seance > b.date_seance ? 1 : -1);
        this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
        this.adminStepEditSeanceMode = false;
        this.adminStepEditSeanceId = null;
      },
      error: (err: any) => this.showMessage(err?.error?.error || 'Erreur ajout séance', 'danger')
    });
  }

  editerSeanceAdmin(s: any) {
    this.adminStepEditSeanceMode = true;
    this.adminStepEditSeanceId = s.id;
    this.adminStepSeanceForm = {
      date_seance: s.date_seance?.substring(0, 10),
      heure_debut: s.heure_debut,
      heure_fin: s.heure_fin,
      salle: s.salle || '',
      module_ids: s.modules?.map((m: any) => m.id) || []
    };
  }

  toggleModuleSeanceAdmin(moduleId: number) {
    const ids = this.adminStepSeanceForm.module_ids as number[];
    const idx = ids.indexOf(moduleId);
    if (idx === -1) ids.push(moduleId); else ids.splice(idx, 1);
  }

  toggleModuleSeanceConfig(moduleId: number) {
    const ids = this.configSeanceForm.module_ids as number[];
    const idx = ids.indexOf(moduleId);
    if (idx === -1) ids.push(moduleId); else ids.splice(idx, 1);
  }

  annulerEditSeanceAdmin() {
    this.adminStepEditSeanceMode = false;
    this.adminStepEditSeanceId = null;
    this.adminStepSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
  }

  supprimerSeanceAdmin(id: number) {
    this.adminService.deleteFormationSeance(id).subscribe({
      next: () => { this.adminStepSeances = this.adminStepSeances.filter(s => s.id !== id); },
      error: () => this.showMessage('Erreur suppression séance', 'danger')
    });
  }

  passerStep4Admin() {
    this.adminStep = 4;
  }

  ajouterQuestionAdmin4() {
    this.adminQuizQuestions.push({
      question: '',
      reponses: [
        { reponse: '', est_correcte: true },
        { reponse: '', est_correcte: false },
        { reponse: '', est_correcte: false }
      ]
    });
  }

  supprimerQuestionAdmin4(qi: number) {
    this.adminQuizQuestions.splice(qi, 1);
  }

  ajouterReponseAdmin4(qi: number) {
    if (this.adminQuizQuestions[qi].reponses.length < 4)
      this.adminQuizQuestions[qi].reponses.push({ reponse: '', est_correcte: false });
  }

  supprimerReponseAdmin4(qi: number, ri: number) {
    if (this.adminQuizQuestions[qi].reponses.length > 2)
      this.adminQuizQuestions[qi].reponses.splice(ri, 1);
  }

  marquerCorrecteAdmin4(qi: number, ri: number) {
    this.adminQuizQuestions[qi].reponses.forEach((r, i) => r.est_correcte = i === ri);
  }

  terminerCreationAdmin() {
    if (!this.adminStepFormationId) {
      this.showMessage('❌ Erreur : formation introuvable.', 'danger');
      return;
    }

    // Quiz obligatoire
    if (this.adminQuizQuestions.length === 0) {
      this.showMessage('❌ Le quiz est obligatoire. Ajoutez au moins une question.', 'danger');
      return;
    }

    // Validation du quiz
    for (let i = 0; i < this.adminQuizQuestions.length; i++) {
      const q = this.adminQuizQuestions[i];
      if (!q.question.trim()) {
        this.showMessage(`❌ La question ${i + 1} est vide.`, 'danger'); return;
      }
      const filled = q.reponses.filter(r => r.reponse.trim());
      if (filled.length < 2) {
        this.showMessage(`❌ Question ${i + 1} : au moins 2 réponses requises.`, 'danger'); return;
      }
      if (!q.reponses.some(r => r.est_correcte)) {
        this.showMessage(`❌ Question ${i + 1} : marquez la bonne réponse.`, 'danger'); return;
      }
    }

    this.adminQuizSaving = true;
    const payload = {
      titre: this.adminQuizTitre,
      seuil_reussite: this.adminQuizSeuil,
      nb_tentatives: this.adminQuizNbTentatives,
      questions: this.adminQuizQuestions.map(q => ({
        question: q.question,
        reponses: q.reponses.filter(r => r.reponse.trim())
      }))
    };
    this.adminService.saveFormationQuiz(this.adminStepFormationId, payload).subscribe({
      next: () => {
        this.adminQuizSaving = false;
        this.showMessage('Formation et quiz créés avec succès ✅', 'success');
        this.closeForm();
        this.loadFormations();
        this.loadStats();
      },
      error: () => {
        this.adminQuizSaving = false;
        this.showMessage('❌ Erreur lors de la sauvegarde du quiz.', 'danger');
      }
    });
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
    this.adminService.deleteFormation(id).subscribe({
      next: () => { this.showMessage('Formation supprimée ✅', 'success'); this.loadFormations(); },
      error: (err) => this.showMessage(err?.error?.message || '❌ Erreur lors de la suppression', 'danger')
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

loadInscriptionsPending() {
  this.adminService.getInscriptionsPending().subscribe({
    next: res => { this.inscriptionsPending = res; this.loadStats(); },
    error: err => console.error(err)
  });
  this.adminService.getListeAttenteGlobale().subscribe({
    next: res => this.listeAttenteGlobale = res,
    error: () => {}
  });
}

retirerDeListeAttente(entry: any) {
  if (!confirm(`Retirer ${entry.user_nom} de la liste d'attente ?`)) return;
  this.adminService.retirerListeAttente(entry.id).subscribe({
    next: () => {
      this.showMessage(`${entry.user_nom} retiré(e) de la liste d'attente.`, 'success');
      this.loadInscriptionsPending();
    },
    error: () => this.showMessage('❌ Erreur lors de la suppression', 'danger')
  });
}

inscrireDepuisAttente(entry: any) {
  if (!confirm(`Inscrire ${entry.user_nom} dans « ${entry.formation_titre} » ?`)) return;
  this.adminService.inscrireDepuisAttente(entry.id).subscribe({
    next: () => {
      this.showMessage(`✅ ${entry.user_nom} a été inscrit(e) dans « ${entry.formation_titre} » et notifié(e).`, 'success');
      this.loadInscriptionsPending();
    },
    error: (err) => this.showMessage(err?.error?.error || '❌ Erreur lors de l\'inscription', 'danger')
  });
}

approuverInscription(id: number) {
  this.adminService.approuverInscription(id).subscribe({
    next: () => {
      this.showMessage('Inscription approuvée ✅ — L\'utilisateur a été notifié.', 'success');
      this.loadInscriptionsPending();
    },
    error: (err) => this.showMessage(err?.error?.error || '❌ Erreur lors de l\'approbation', 'danger')
  });
}

rejeterInscription(id: number) {
  this.ouvrirModalRejet((raison) => {
    this.adminService.rejeterInscription(id, raison).subscribe({
      next: () => {
        this.showMessage('Inscription refusée — L\'utilisateur a été notifié.', 'success');
        this.loadInscriptionsPending();
      },
      error: (err) => this.showMessage(err?.error?.error || '❌ Erreur lors du refus', 'danger')
    });
  });
}

approuverDemandeInscription(item: any) {
  if (item.type_utilisateur === 'externe') {
    this.adminService.approuverInscriptionExterne(item.id).subscribe({
      next: (res: any) => {
        const msg = res?.message || 'Inscription externe approuvée ✅ — L\'utilisateur a été notifié.';
        this.showMessage(msg, 'success');
        this.loadInscriptionsPending();
      },
      error: (err) => this.showMessage(err?.error?.error || '❌ Erreur lors de l\'approbation', 'danger')
    });
  } else {
    this.approuverInscription(item.id);
  }
}

rejeterDemandeInscription(item: any) {
  this.ouvrirModalRejet((raison) => {
    const obs = item.type_utilisateur === 'externe'
      ? this.adminService.rejeterInscriptionExterne(item.id, raison)
      : this.adminService.rejeterInscription(item.id, raison);
    obs.subscribe({
      next: () => {
        this.showMessage('Inscription refusée — L\'utilisateur a été notifié.', 'success');
        this.loadInscriptionsPending();
      },
      error: (err) => this.showMessage(err?.error?.error || '❌ Erreur lors du refus', 'danger')
    });
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
  this.configNbPlaces = f.nb_places ?? null;
  this.configQuiz = null;
  this.configSeances = [];
  this.configModules = [];
  this.configSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
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

  this.adminService.getFormationQuiz(f.id).subscribe({
    next: (quiz) => this.configQuiz = quiz,
    error: () => this.configQuiz = null
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
  const selectedModules = this.configModules.filter(m => this.configSeanceForm.module_ids.includes(m.id));
  this.adminService.addFormationSeance(this.configFormation.id, {
    ...this.configSeanceForm,
    formation_id: this.configFormation.id
  }).subscribe({
    next: (res: any) => {
      this.configSeances.push({
        id: res.id,
        ...this.configSeanceForm,
        modules: selectedModules,
        module_titre: selectedModules.map((m: any) => m.titre).join(', ')
      });
      this.configSeances = [...this.configSeances].sort((a, b) => a.date_seance > b.date_seance ? 1 : -1);
      this.configSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
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
    module_ids: s.modules?.map((m: any) => m.id) || []
  };
}

annulerEditSeanceConfig() {
  this.configEditSeanceMode = false;
  this.configEditSeanceId = null;
  this.configSeanceForm = { date_seance: '', heure_debut: '', heure_fin: '', salle: '', module_ids: [] };
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
  if (!this.configNbPlaces || this.configNbPlaces <= 0) {
    this.showMessage('Le nombre de places est obligatoire pour publier.', 'danger'); return;
  }
  if (!this.configPrix || this.configPrix < 1) {
    this.showMessage('Le prix est obligatoire pour publier la formation.', 'danger'); return;
  }
  if (this.configDateFin && this.configDateFin < this.configDateDebut) {
    this.showMessage('La date de fin doit être après la date de début.', 'danger'); return;
  }
  this.configPublishing = true;
  this.adminService.publishAcceptedFormation(this.configFormation.id, {
    date_debut: this.configDateDebut,
    date_fin: this.configDateFin || undefined,
    prix: this.configPrix,
    nb_places: this.configNbPlaces
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
    this.ouvrirModalRejet((raison) => {
      this.adminService.rejectFormation(formationId, raison).subscribe({
        next: () => {
          this.showMessage('Formation rejetée et remise en draft 🔙', 'success');
          this.loadFormationsPending();
        },
        error: err => this.showMessage(err?.error?.error || '❌ Erreur lors du rejet', 'danger')
      });
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
    this.detailsQuiz = null;

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

    this.adminService.getFormationQuiz(f.id).subscribe({
      next: (data: any) => { this.detailsQuiz = data || null; },
      error: () => { this.detailsQuiz = null; }
    });

    this.adminService.getFormationListeAttente(f.id).subscribe({
      next: (data: any[]) => { this.detailsListeAttente = data || []; },
      error: () => { this.detailsListeAttente = []; }
    });
  }

  fermerDetails() {
    this.showDetailsModal = false;
    this.formationDetails = null;
    this.detailsModules = [];
    this.detailsSupports = [];
    this.detailsProgramme = null;
    this.detailsQuiz = null;
    this.detailsListeAttente = [];
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

  soumettreModule() {
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
    localStorage.clear();
    window.location.href = '/admin-login';
  }
}