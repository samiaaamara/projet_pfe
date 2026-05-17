import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CandidatService } from '../../services/candidat.service';
import { ExterneService } from '../../services/externe.service';
import { Auth } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';
import { ChatWidgetComponent } from '../../components/navbar/chat-widget/chat-widget.component';

@Component({
  selector: 'app-candidat',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatWidgetComponent],
  templateUrl: './candidat.component.html',
  styleUrl: './candidat.component.css',
})
export class CandidatComponent implements OnInit, OnDestroy {
  readonly environment = environment;

  user: any = null;
  candidatId: number | null = null;

  formations: any[] = [];
  page = 1;
  totalPages = 1;
  totalFormations = 0;
  filtreSpecialite: string | null = null;
  specialites: string[] = [];
  recherche = '';

  mesFormations: any[] = [];

  supports: any[] = [];
  formationSelectionnee: any = null;

  progression = 0;

  // Notation
  mesNotes: { [formationId: number]: number } = {};
  noteHover: { [formationId: number]: number } = {};
  noteCommentaire = '';

  // Profil
  profileNom = '';
  profileEmail = '';
  profileTelephone = '';
  profileDateNaissance = '';
  profileSpecialite = '';
  profileCin = '';
  profileNiveau = '';
  profileEntreprise = '';
  profilePhotoUrl: string | null = null;
  ancienMdp = '';
  nouveauMdp = '';
  confirmMdp = '';

  // Attestation
  formationAttestation: any = null;
  eligibiliteMap: { [formationId: number]: any } = {};

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
  candidatContactSearch = '';

  get filteredCandidatContacts() {
    if (!this.candidatContactSearch.trim()) return this.contacts;
    const q = this.candidatContactSearch.toLowerCase();
    return this.contacts.filter(c => c.nom?.toLowerCase().includes(q));
  }

  message = '';
  messageType: 'success' | 'danger' = 'success';
  activeSection: 'accueil' | 'formations' | 'mesFormations' | 'supports' | 'progression' | 'profil' | 'attestation' | 'notifications' | 'messages' = 'accueil';

  // Programme
  programmeFormation: any = null;
  programmeData: any = null;
  programmeLoading = false;

  // Progression par formation
  formationProgressionSelectionnee: any = null;
  progressionModulesFormation: any[] = [];
  progressionPourcentageFormation = 0;
  showProgressionModal = false;

  // Présences
  presencesFormation: any = null;
  presencesData: any = null;
  showPresencesModal = false;

  // Liste d'attente
  enAttente: any[] = [];

  // Justificatifs
  justifSeanceId: number | null = null;
  justifMotif = '';
  attestationData: any = null;
  attestationLoading = false;

  constructor(
    private candidatService: CandidatService,
    private externeService: ExterneService,
    private authService: Auth,
    private notifService: NotificationsService,
    private msgService: MessagesService,
    private router: Router
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (!stored) { this.router.navigate(['/login']); return; }
    this.user = JSON.parse(stored);
    if (this.user.role !== 'candidat' || !this.user.candidatId) {
      this.router.navigate(['/login']); return;
    }
    this.candidatId = this.user.candidatId;
    this.profileNom = this.user.nom;
    this.profileEmail = this.user.email;
    this.loadProfilComplet();
    this.loadFormations();
    this.loadMesFormations();
    this.chargerProgression();
    this.loadEnAttente();
    this.loadUnreadCount();
    this.authService.getSpecialites().subscribe({
      next: data => this.specialites = data.map(s => s.nom),
      error: () => {}
    });
    this.pollingInterval = setInterval(() => this.loadUnreadCount(), 30000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  setSection(section: any) { this.activeSection = section; this.message = ''; }

  showMessage(msg: string, type: 'success' | 'danger' = 'success') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }

  // ===== Formations =====
  loadFormations() {
    if (!this.candidatId) return;
    this.candidatService.getFormations(this.candidatId, this.page).subscribe({
      next: (res: any) => {
        this.formations = res.data;
        this.totalPages = res.pagination.pages;
        this.totalFormations = res.pagination.total;
        this.filtreSpecialite = res.filtre_specialite || null;
        this.formations.forEach(f => this.chargerMaNote(f.id));
      },
      error: () => this.showMessage('Erreur chargement des formations', 'danger')
    });
  }

  get formationsFiltrees() {
    return this.formations.filter(f => {
      const matchRecherche = this.recherche
        ? (f.titre + ' ' + f.description).toLowerCase().includes(this.recherche.toLowerCase())
        : true;
      return matchRecherche;
    });
  }

  changerPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadFormations();
  }

  placesRestantes(f: any): number {
    if (f.nb_places === null) return 999;
    return Math.max(0, f.nb_places - (f.inscrits || 0));
  }

  estComplet(f: any): boolean {
    return f.nb_places !== null && this.placesRestantes(f) === 0;
  }

  joursRestants(dateDebut: string): number {
    const diff = new Date(dateDebut).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  badgeDateClass(dateDebut: string): string {
    const j = this.joursRestants(dateDebut);
    if (j <= 7) return 'badge-urgent';
    if (j <= 30) return 'badge-proche';
    return 'badge-loin';
  }

  inscrire(formationId: number) {
    if (!this.candidatId) return;
    this.candidatService.inscrire(this.candidatId, formationId).subscribe({
      next: () => {
        this.showMessage('Inscription réussie !');
        this.loadMesFormations();
        this.loadFormations();
      },
      error: (err) => this.showMessage(err?.error?.message || "Erreur lors de l'inscription", 'danger')
    });
  }

  estDejaInscrit(formationId: number): boolean {
    return this.mesFormations.some(f => f.formation_id === formationId);
  }

  // ===== Mes formations =====
  loadMesFormations() {
    if (!this.candidatId) return;
    this.candidatService.getMesFormations(this.candidatId).subscribe({
      next: data => {
        this.mesFormations = data;
        this.loadEligibilites(data);
      },
      error: () => this.showMessage('Erreur chargement de vos formations', 'danger')
    });
  }

  loadEligibilites(formations: any[]) {
    if (!this.candidatId) return;
    formations.forEach(f => {
      const fid = f.formation_id;
      this.candidatService.getEligibiliteAttestation(this.candidatId!, fid).subscribe({
        next: data => this.eligibiliteMap = { ...this.eligibiliteMap, [fid]: data },
        error: () => {}
      });
    });
  }

  getStatutBadge(statut: string): string {
    const map: any = { 'Inscrit': 'bg-primary', 'présent': 'bg-success', 'absent': 'bg-danger', 'Terminé': 'bg-secondary' };
    return map[statut] || 'bg-secondary';
  }

  // ===== Supports =====
  voirSupports(formation: any) {
    this.formationSelectionnee = formation;
    this.activeSection = 'supports';
    const id = formation.formation_id || formation.id;
    this.candidatService.getSupports(id).subscribe({
      next: data => this.supports = data,
      error: () => this.showMessage('Erreur chargement des supports', 'danger')
    });
  }

  getIconSupport(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return '📄';
    if (t.includes('vidéo') || t.includes('video')) return '🎬';
    if (t.includes('image') || t.includes('img')) return '🖼️';
    if (t.includes('zip') || t.includes('archive')) return '📦';
    if (t.includes('doc') || t.includes('word')) return '📝';
    if (t.includes('ppt') || t.includes('présentation')) return '📊';
    return '📎';
  }

  getLienSupport(fichier: string): string {
    if (!fichier) return '#';
    if (fichier.startsWith('/uploads/')) return `${environment.baseUrl}${fichier}`;
    return fichier;
  }

  // ===== Progression =====
  chargerProgression() {
    if (!this.candidatId) return;
    this.candidatService.getProgression(this.candidatId).subscribe({
      next: data => this.progression = data?.progression || 0,
      error: () => {}
    });
  }

  get formationsTerminees(): number {
    return this.mesFormations.filter(f => f.statut === 'présent' || f.statut === 'Terminé').length;
  }

  get formationsEnCours(): number {
    return this.mesFormations.filter(f => f.statut === 'Inscrit').length;
  }

  getProgressColor(): string {
    if (this.progression >= 75) return '#28a745';
    if (this.progression >= 40) return '#ffc107';
    return '#dc3545';
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // ===== Notation =====
  chargerMaNote(formationId: number) {
    if (!this.candidatId) return;
    this.candidatService.getMaNote(this.candidatId, formationId).subscribe({
      next: data => { if (data?.note) this.mesNotes[formationId] = data.note; },
      error: () => {}
    });
  }

  setNoteHover(formationId: number, note: number) { this.noteHover[formationId] = note; }
  clearNoteHover(formationId: number) { delete this.noteHover[formationId]; }

  noterFormation(formationId: number, note: number) {
    if (!this.candidatId) return;
    this.candidatService.noter(this.candidatId, formationId, note).subscribe({
      next: () => {
        this.mesNotes[formationId] = note;
        this.showMessage('Formation notée ' + '⭐'.repeat(note));
      },
      error: () => this.showMessage('Erreur lors de la notation', 'danger')
    });
  }

  getNoteAffichee(formationId: number): number {
    return this.noteHover[formationId] ?? this.mesNotes[formationId] ?? 0;
  }

  imprimerAttestation() { window.print(); }

  getTodayStr(): string {
    return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ===== Profil =====
  loadProfilComplet() {
    this.authService.getProfile().subscribe({
      next: (data: any) => {
        this.profileTelephone = data.telephone || '';
        this.profileDateNaissance = data.date_naissance ? data.date_naissance.substring(0, 10) : '';
        this.profileSpecialite = data.specialite || '';
        this.profileCin = data.cin || '';
        this.profileNiveau = data.niveau || '';
        this.profileEntreprise = data.entreprise || '';
        this.profilePhotoUrl = data.photo_profil || null;
      },
      error: () => {}
    });
  }

  sauvegarderProfil() {
    if (!this.profileNom || !this.profileEmail) {
      this.showMessage('Nom et email sont requis', 'danger'); return;
    }
    this.authService.updateProfile({
      nom: this.profileNom, email: this.profileEmail,
      telephone: this.profileTelephone, date_naissance: this.profileDateNaissance,
      specialite: this.profileSpecialite, cin: this.profileCin, niveau: this.profileNiveau,
      entreprise: this.profileEntreprise
    }).subscribe({
      next: () => {
        this.user.nom = this.profileNom; this.user.email = this.profileEmail;
        localStorage.setItem('user', JSON.stringify(this.user));
        this.showMessage('Profil mis à jour avec succès');
      },
      error: (err) => this.showMessage(err?.error?.message || 'Erreur mise à jour du profil', 'danger')
    });
  }

  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    this.authService.uploadProfilePhoto(formData).subscribe({
      next: (res: any) => {
        this.profilePhotoUrl = res.photo_profil;
        this.user.photo_profil = res.photo_profil;
        localStorage.setItem('user', JSON.stringify(this.user));
        this.showMessage('Photo de profil mise à jour');
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
    if (this.nouveauMdp.length < 6) {
      this.showMessage('Mot de passe trop court (min 6 caractères)', 'danger'); return;
    }
    this.authService.changePassword({ ancien_mdp: this.ancienMdp, nouveau_mdp: this.nouveauMdp }).subscribe({
      next: () => {
        this.showMessage('Mot de passe modifié avec succès');
        this.ancienMdp = ''; this.nouveauMdp = ''; this.confirmMdp = '';
      },
      error: (err) => this.showMessage(err?.error?.message || 'Erreur changement de mot de passe', 'danger')
    });
  }

  // ===== Notifications =====
  loadUnreadCount() {
    if (!this.user?.id) return;
    this.notifService.getUnreadCount(this.user.id).subscribe({
      next: data => this.unreadCount = data?.count || 0,
      error: () => {}
    });
  }

  loadNotifications() {
    if (!this.user?.id) return;
    this.notifService.getNotifications(this.user.id).subscribe({
      next: data => {
        this.notifications = data;
        this.unreadCount = data.filter((n: any) => !n.lu).length;
      },
      error: () => {}
    });
  }

  marquerLu(notif: any) {
    if (notif.lu) return;
    this.notifService.marquerLu(notif.id).subscribe({
      next: () => {
        notif.lu = 1;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {}
    });
  }

  marquerToutLu() {
    if (!this.user?.id) return;
    this.notifService.marquerToutLu(this.user.id).subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = 1);
        this.unreadCount = 0;
      },
      error: () => {}
    });
  }

  supprimerNotif(id: number, event: Event) {
    event.stopPropagation();
    this.notifService.supprimer(id).subscribe({
      next: () => {
        const notif = this.notifications.find(n => n.id === id);
        if (notif && !notif.lu) this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.notifications = this.notifications.filter(n => n.id !== id);
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

  // ===== Progression modulaire =====
  voirProgressionFormation(f: any) {
    if (!this.candidatId) return;
    this.formationProgressionSelectionnee = f;
    this.showProgressionModal = true;
    this.candidatService.getProgressionModules(this.candidatId, f.formation_id).subscribe({
      next: (res: any) => {
        this.progressionModulesFormation = res.modules || [];
        this.progressionPourcentageFormation = res.pourcentage || 0;
      },
      error: () => {}
    });
  }

  fermerProgressionFormation() {
    this.formationProgressionSelectionnee = null;
    this.progressionModulesFormation = [];
    this.progressionPourcentageFormation = 0;
    this.showProgressionModal = false;
  }

  countTerminesFormation(): number {
    return this.progressionModulesFormation.filter(m => m.statut === 'termine').length;
  }

  getProgressBarColor(pct: number): string {
    if (pct >= 80) return 'linear-gradient(90deg, #2e7d32, #66bb6a)';
    if (pct >= 40) return 'linear-gradient(90deg, #f57c00, #ffb74d)';
    return 'linear-gradient(90deg, #e53935, #ef9a9a)';
  }

  // ===== Programme =====
  voirProgramme(f: any) {
    this.programmeFormation = f;
    this.programmeData = null;
    this.programmeLoading = true;
    this.externeService.getProgramme(f.id).subscribe({
      next: (res: any) => { this.programmeData = res; this.programmeLoading = false; },
      error: () => { this.programmeLoading = false; this.showMessage('Erreur chargement du programme', 'danger'); }
    });
  }

  fermerProgramme() {
    this.programmeFormation = null;
    this.programmeData = null;
  }

  // ===== Présences =====
  voirMesPresences(f: any) {
    if (!this.candidatId) return;
    this.presencesFormation = f;
    this.presencesData = null;
    this.showPresencesModal = true;
    this.candidatService.getMesPresences(this.candidatId, f.formation_id).subscribe({
      next: (res: any) => this.presencesData = res,
      error: () => this.showMessage('Erreur chargement des présences', 'danger')
    });
  }

  fermerPresences() {
    this.presencesFormation = null;
    this.presencesData = null;
    this.showPresencesModal = false;
  }

  getPresenceClass(statut: string): string {
    const map: any = { 'présent': 'pres-present', 'retard': 'pres-retard', 'excusé': 'pres-excuse', 'absent': 'pres-absent' };
    return map[statut] || 'pres-absent';
  }

  // ===== Liste d'attente =====
  loadEnAttente() {
    if (!this.candidatId) return;
    this.candidatService.getEnAttente(this.candidatId).subscribe({
      next: data => this.enAttente = data,
      error: () => {}
    });
  }

  estEnAttente(formationId: number): boolean {
    return this.enAttente.some(f => f.formation_id === formationId);
  }

  positionAttente(formationId: number): number {
    return this.enAttente.find(f => f.formation_id === formationId)?.position ?? 0;
  }

  rejoindreListeAttente(formationId: number) {
    if (!this.candidatId) return;
    this.candidatService.rejoindreListeAttente(this.candidatId, formationId).subscribe({
      next: () => { this.showMessage('Vous avez rejoint la liste d\'attente ✅'); this.loadEnAttente(); },
      error: (err) => this.showMessage(err?.error?.error || 'Erreur', 'danger')
    });
  }

  quitterListeAttente(formationId: number) {
    if (!this.candidatId) return;
    this.candidatService.quitterListeAttente(this.candidatId, formationId).subscribe({
      next: () => { this.showMessage('Retiré de la liste d\'attente'); this.loadEnAttente(); },
      error: () => this.showMessage('Erreur', 'danger')
    });
  }

  desinscrire(formationId: number) {
    if (!this.candidatId || !confirm('Se désinscrire de cette formation ?')) return;
    this.candidatService.desinscrire(this.candidatId, formationId).subscribe({
      next: () => {
        this.showMessage('Désinscription effectuée');
        this.loadMesFormations();
        this.loadFormations();
      },
      error: () => this.showMessage('Erreur lors de la désinscription', 'danger')
    });
  }

  // ===== Justificatifs =====
  ouvrirJustificatif(seanceId: number) {
    this.justifSeanceId = seanceId;
    this.justifMotif = '';
  }

  fermerJustificatif() {
    this.justifSeanceId = null;
    this.justifMotif = '';
  }

  soumettreJustificatif() {
    if (!this.candidatId || !this.justifSeanceId || !this.justifMotif.trim()) {
      this.showMessage('Veuillez rédiger un motif', 'danger'); return;
    }
    this.candidatService.soumettreJustificatif(this.candidatId, this.justifSeanceId, this.justifMotif).subscribe({
      next: () => {
        this.showMessage('Justificatif envoyé ✅');
        this.fermerJustificatif();
        if (this.presencesFormation) this.voirMesPresences(this.presencesFormation);
      },
      error: () => this.showMessage('Erreur lors de l\'envoi', 'danger')
    });
  }

  allerAuxAttestations() {
    this.formationAttestation = null;
    this.activeSection = 'attestation';
    this.message = '';
  }

  // ===== Attestation enrichie =====
  ouvrirAttestation(f: any) {
    this.formationAttestation = f;
    this.attestationData = null;
    this.attestationLoading = true;
    this.activeSection = 'attestation';
    this.candidatService.getAttestationData(this.candidatId!, f.formation_id).subscribe({
      next: data => { this.attestationData = data; this.attestationLoading = false; },
      error: () => { this.attestationLoading = false; }
    });
  }
}
