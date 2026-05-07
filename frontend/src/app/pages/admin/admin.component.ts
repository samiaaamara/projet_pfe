import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { MessagesService } from '../../services/messages.service';
import { Auth } from '../../services/auth';

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
  private msgPollingInterval: any;

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

  message: string = '';
  messageType: 'success' | 'warning' | 'danger' | 'info' = 'info';

  showFormationForm = false;
  editFormationMode = false;
  showFormateurForm = false;
  editFormateurMode = false;

  formData: any = this.getEmptyForm();
  formateurForm: any = this.getEmptyFormateur();
  formDataErrors: any = {};
  formateurErrors: any = {};

  loading = false;

  // Programme de formation
  showProgrammeEditor = false;
  programmeFormation: any = null;
  programmeData = { description_globale: '', objectifs: '', prerequis: '' };
  programmeModules: any[] = [];
  moduleForm = { titre: '', description: '', duree_heures: '' as string | number, ordre: 0 };
  editModuleMode = false;
  editModuleId: number | null = null;

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
    const labels: any = { formateur: 'Formateur', etudiant: 'Étudiant', externe: 'Externe', admin: 'Admin' };
    return labels[role] || role;
  }

  getEmptyForm() {
    return {
      id: null,
      titre: '',
      description: '',
      date_debut: '',
      date_fin: '',
      duree: '',
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
    if (!this.formData.duree || Number(this.formData.duree) <= 0) {
      this.formDataErrors.duree = 'Durée positive requise'; valid = false;
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
      duree: f.duree || '',
      formateur_id: f.formateur_id || null,
      specialite: f.specialite || '',
      nb_places: f.nb_places || 0,
      prix: f.prix || 0,
      status: f.status || 'draft'
    };
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

  closeForm() { this.showFormationForm = false; this.resetFormationErrors(); }
  closeFormateurForm() { this.showFormateurForm = false; this.resetFormateurErrors(); }

  saveFormation() {
    if (!this.validateFormationForm()) {
      this.showMessage('⚠️ Veuillez corriger les erreurs dans le formulaire.', 'danger');
      return;
    }
    this.loading = true;
    if (this.editFormationMode) {
      this.adminService.updateFormation(this.formData.id, this.formData).subscribe({
        next: () => { this.showMessage('Formation modifiée ✅', 'success'); this.afterSave(); },
        error: () => { this.showMessage('❌ Erreur modification', 'danger'); this.loading = false; }
      });
    } else {
      this.adminService.addFormation(this.formData).subscribe({
        next: () => { this.showMessage('Formation ajoutée ✅', 'success'); this.afterSave(); },
        error: () => { this.showMessage('❌ Erreur ajout', 'danger'); this.loading = false; }
      });
    }
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

publishAcceptedFormation(formationId: number) {
  if (!confirm('Publier cette formation dans le catalogue ?')) return;

  this.adminService.publishAcceptedFormation(formationId).subscribe({
    next: () => {
      this.showMessage('Formation publiée dans le catalogue 🚀 — Le formateur a été notifié.', 'success');
      this.loadFormationsAccepted();
      this.loadFormations();
    },
    error: (err) => {
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

  // ===== Programme =====
  ouvrirProgramme(f: any) {
    this.programmeFormation = f;
    this.showProgrammeEditor = true;
    this.editModuleMode = false;
    this.editModuleId = null;
    this.moduleForm = { titre: '', description: '', duree_heures: '', ordre: 0 };
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
          this.moduleForm = { titre: '', description: '', duree_heures: '', ordre: this.programmeModules.length };
          this.showMessage('Module ajouté ✅', 'success');
        },
        error: () => this.showMessage('Erreur ajout module', 'danger')
      });
    }
  }

  editerModule(m: any) {
    this.editModuleMode = true;
    this.editModuleId = m.id;
    this.moduleForm = { titre: m.titre, description: m.description || '', duree_heures: m.duree_heures || '', ordre: m.ordre };
  }

  annulerEditModule() {
    this.editModuleMode = false;
    this.editModuleId = null;
    this.moduleForm = { titre: '', description: '', duree_heures: '', ordre: this.programmeModules.length };
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