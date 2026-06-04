+320 -0
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExterneService } from '../../services/externe.service';
import { Auth } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';
import { ChatWidgetComponent } from '../../components/navbar/chat-widget/chat-widget.component';

@Component({
  selector: 'app-externe',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatWidgetComponent],
  templateUrl: './externe.component.html',
  styleUrl: './externe.component.css',
})
export class ExterneComponent implements OnInit, OnDestroy {
  readonly environment = environment;

  user: any = null;
  externeId: number | null = null;

  // Catalogue formations
  formations: any[] = [];
  page = 1;
  totalPages = 1;
  totalFormations = 0;
  recherche = '';
  filtreSpecialite = '';

  // Mes inscriptions (confirmées uniquement)
  mesInscriptions: any[] = [];
  // Demandes en attente d'approbation admin
  demandesEnAttente: any[] = [];

  // Supports
  supports: any[] = [];
  formationSelectionnee: any = null;

  // Paiement
  formationPaiement: any = null;
  showPaiementModal = false;

  // Profil
  profileNom = '';
  profileEmail = '';
  profileTelephone = '';
  profileEntreprise = '';
  profileSpecialite = '';
  profileDateNaissance = '';
  profilePhotoUrl: string | null = null;
  ancienMdp = '';
  nouveauMdp = '';
  confirmMdp = '';

  // Notifications
  notifications: any[] = [];
  unreadCount = 0;
  private pollingInterval: any;

  message = '';
  messageType: 'success' | 'danger' = 'success';
  activeSection: 'accueil' | 'formations' | 'mesInscriptions' | 'supports' | 'progression' | 'profil' | 'attestation' | 'notifications' | 'messages' | 'quiz' = 'accueil';

  // Messagerie
  contacts: any[] = [];
  messagesConversation: any[] = [];
  contactSelectionne: any = null;
  nouveauMessage = '';
  unreadMessages = 0;
  externeContactSearch = '';

  get filteredExterneContacts() {
    if (!this.externeContactSearch.trim()) return this.contacts;
    const q = this.externeContactSearch.toLowerCase();
    return this.contacts.filter(c => c.nom?.toLowerCase().includes(q));
  }

  // Progression globale
  progression = 0;

  // Progression par formation (modal)
  formationProgressionSelectionnee: any = null;
  progressionModulesFormation: any[] = [];
  progressionPourcentageFormation = 0;
  showProgressionModal = false;

  // Présences
  presencesFormation: any = null;
  presencesData: any = null;
  showPresencesModal = false;

  // Notation
  mesNotes: { [formationId: number]: number } = {};
  noteHover: { [formationId: number]: number } = {};

  // Attestation
  formationAttestation: any = null;
  eligibiliteMap: { [formationId: number]: any } = {};
  attestationData: any = null;
  attestationLoading = false;

  // Liste d'attente
  enAttente: any[] = [];

  // Justificatifs
  justifSeanceId: number | null = null;
  justifMotif = '';

  // Quiz
  quizStatuts: { [formationId: number]: any } = {};
  quizSectionLoading = false;
  showQuizModal = false;
  quizFormationId: number | null = null;
  quizData: any = null;
  quizReponses: { [questionId: number]: number } = {};
  quizResultat: any = null;
  quizLoading = false;
  quizSubmitting = false;


  constructor(
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
    if (this.user.role !== 'externe' || !this.user.externeId) {
      this.router.navigate(['/login']); return;
    }
    this.externeId = this.user.externeId;
    this.profileNom = this.user.nom;
    this.profileEmail = this.user.email;
    this.loadProfilComplet();
    this.loadFormations();
    this.loadMesInscriptions();
    this.loadDemandesEnAttente();
    this.chargerProgression();
    this.loadEnAttente();
    this.loadUnreadCount();
    this.loadUnreadMessages();
    this.pollingInterval = setInterval(() => { this.loadUnreadCount(); this.loadUnreadMessages(); }, 30000);
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

  loadFormations() {
    this.externeService.getFormations(this.externeId, this.page).subscribe({
      next: (res: any) => {
        this.formations = res.data;
        this.totalPages = res.pagination.pages;
        this.totalFormations = res.pagination.total;
        this.loadMesInscriptions();
        this.loadDemandesEnAttente();
      },
      error: () => this.showMessage('Erreur chargement des formations', 'danger')
    });
  }
  get specialitesDispo(): string[] {
    const s = new Set(this.formations.map(f => f.specialite).filter(Boolean));
    return Array.from(s).sort();
  }

  get formationsFiltrees() {
    if (!this.filtreSpecialite) return this.formations;
    return this.formations.filter(f => f.specialite === this.filtreSpecialite);
  }

  changerPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loadFormations();
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  estDejaInscrit(formationId: number): boolean {
    return this.mesInscriptions.some(i =>
      Number(i.formation_id) === Number(formationId) &&
      (i.statut_paiement === 'payé' || i.statut_inscription === 'confirmé')
    ) || this.demandesEnAttente.some(i => Number(i.formation_id) === Number(formationId));
  }

  get aFormationActive(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.mesInscriptions.some(f => {
      if (f.statut_inscription === 'Terminée') return false;
      if (f.status === 'terminée' || f.status === 'archivée') return false;
      if (!f.date_fin) return false;
      return new Date(f.date_fin) >= today;
    });
  }

  estEnAttenteApprobation(formationId: number): boolean {
    return this.demandesEnAttente.some(i => Number(i.formation_id) === Number(formationId));
  }

  peutPayer(formationId: number): boolean {
    return this.mesInscriptions.some(i =>
      Number(i.formation_id) === Number(formationId) &&
      i.statut_inscription === 'confirmé' &&
      i.statut_paiement === 'en_attente' &&
      Number(i.montant) > 0 &&
      i.status !== 'en_cours' &&
      i.status !== 'terminée' &&
      i.status !== 'archivée'
    );
  }

  getInscriptionPourFormation(formationId: number): any {
    return this.mesInscriptions.find(i => Number(i.formation_id) === Number(formationId));
  }

  payerMaintenant(formationId: number) {
    const insc = this.getInscriptionPourFormation(formationId);
    if (!insc) return;
    this.paiementEnCours = true;
    this.externeService.lancerPaiement(insc.id).subscribe({
      next: (res: any) => {
        this.paiementEnCours = false;
        if (res.payUrl) {
          window.location.href = res.payUrl;
        } else {
          this.showMessage('Erreur lors du lancement du paiement', 'danger');
        }
      },
      error: (err) => {
        this.paiementEnCours = false;
        this.showMessage(err?.error?.message || 'Erreur lors du paiement', 'danger');
      }
    });
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

  // ===== Paiement =====
  paiementEnCours = false;

  ouvrirPaiement(formation: any) {
    if (this.aFormationActive) {
      this.showMessage("Vous avez déjà une formation en cours. Terminez-la avant de vous inscrire à une autre.", 'danger');
      return;
    }
    this.formationPaiement = formation;
    this.showPaiementModal = true;
  }

  fermerModal() {
    this.showPaiementModal = false;
    this.formationPaiement = null;
    this.paiementEnCours = false;
  }

  confirmerPaiement() {
    if (!this.externeId || !this.formationPaiement || this.paiementEnCours) return;
    this.paiementEnCours = true;

    this.externeService.initierPaiement(this.externeId, this.formationPaiement.id).subscribe({
      next: (res: any) => {
        this.paiementEnCours = false;
        this.fermerModal();
        if (res.pending) {
          this.showMessage('Demande envoyée ✅ — En attente d\'approbation par l\'administrateur.');
          this.loadDemandesEnAttente();
          this.loadFormations();
        }
      },
      error: (err) => {
        this.paiementEnCours = false;
        this.showMessage(err?.error?.message || 'Erreur lors de la demande d\'inscription', 'danger');
      }
    });
  }

  // ===== Mes inscriptions =====
  loadMesInscriptions() {
    if (!this.externeId) return;
    this.externeService.getMesInscriptions(this.externeId).subscribe({
      next: data => { this.mesInscriptions = data; this.loadEligibilites(data); },
      error: () => {}
    });
  }

  loadDemandesEnAttente() {
    if (!this.externeId) return;
    this.externeService.getMesDemandes(this.externeId).subscribe({
      next: data => this.demandesEnAttente = data,
      error: () => {}
    });
  }

  getStatutFormation(i: any): string {
    if (i.status === 'en_cours') return 'En cours';
    if (i.status === 'terminée' || i.statut_inscription === 'Terminée') return 'Terminée';
    if (i.status === 'published') return 'À venir';
    if (!i.date_debut) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const toLocal = (d: string) => new Date(d.substring(0, 10) + 'T00:00:00');
    const debut = toLocal(i.date_debut);
    const fin = i.date_fin ? toLocal(i.date_fin) : null;
    if (debut > today) return 'À venir';
    if (fin && fin < today) return 'Terminée';
    return 'En cours';
  }

  getStatutFormationBadge(statut: string): string {
    const map: any = {
      'À venir' : 'bg-info',
      'En cours': 'bg-success',
      'Terminée': 'bg-secondary'
    };
    return map[statut] || 'bg-secondary';
  }

  getStatutBadgeClass(statut: string): string {
    const map: any = {
      'payé': 'badge-paye',
      'en_attente': 'badge-attente',
      'remboursé': 'badge-rembourse',
      'confirmé': 'badge-confirme',
      'annulé': 'badge-annule'
    };
    return map[statut] || 'badge-attente';
  }

  loadEligibilites(inscriptions: any[]) {
    if (!this.externeId) return;
    inscriptions.filter(i => i.statut_paiement === 'payé').forEach(i => {
      const fid = i.formation_id;
      this.externeService.getEligibiliteAttestation(this.externeId!, fid).subscribe({
        next: data => this.eligibiliteMap = { ...this.eligibiliteMap, [fid]: data },
        error: () => {}
      });
      this.chargerMaNote(fid);
    });
  }

  // ===== Progression =====
  chargerProgression() {
    if (!this.externeId) return;
    this.externeService.getProgression(this.externeId).subscribe({
      next: data => this.progression = data?.progression || 0,
      error: () => {}
    });
  }

  get formationsTerminees(): number {
    return this.mesInscriptions.filter(i => i.statut_paiement === 'payé').length;
  }

  getProgressColor(): string {
    if (this.progression >= 75) return '#28a745';
    if (this.progression >= 40) return '#ffc107';
    return '#dc3545';
  }

  voirProgressionFormation(inscription: any) {
    if (!this.externeId) return;
    this.formationProgressionSelectionnee = inscription;
    this.showProgressionModal = true;
    this.externeService.getProgressionModules(this.externeId, inscription.formation_id).subscribe({
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

  // ===== Notation =====
  chargerMaNote(formationId: number) {
    if (!this.externeId) return;
    this.externeService.getMaNote(this.externeId, formationId).subscribe({
      next: data => { if (data?.note) this.mesNotes[formationId] = data.note; },
      error: () => {}
    });
  }

  setNoteHover(formationId: number, note: number) { this.noteHover[formationId] = note; }
  clearNoteHover(formationId: number) { delete this.noteHover[formationId]; }

  noterFormation(formationId: number, note: number) {
    if (!this.externeId) return;
    this.externeService.noter(this.externeId, formationId, note).subscribe({
      next: () => { this.mesNotes[formationId] = note; this.showMessage('Formation notée ' + '⭐'.repeat(note)); },
      error: () => this.showMessage('Erreur lors de la notation', 'danger')
    });
  }

  getNoteAffichee(formationId: number): number {
    return this.noteHover[formationId] ?? this.mesNotes[formationId] ?? 0;
  }

  // ===== Présences =====
  voirMesPresences(inscription: any) {
    if (!this.externeId) return;
    this.presencesFormation = inscription;
    this.presencesData = null;
    this.showPresencesModal = true;
    this.externeService.getMesPresences(this.externeId, inscription.formation_id).subscribe({
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

  // ===== Justificatifs =====
  ouvrirJustificatif(seanceId: number) { this.justifSeanceId = seanceId; this.justifMotif = ''; }
  fermerJustificatif() { this.justifSeanceId = null; this.justifMotif = ''; }

  soumettreJustificatif() {
    if (!this.externeId || !this.justifSeanceId || !this.justifMotif.trim()) {
      this.showMessage('Veuillez rédiger un motif', 'danger'); return;
    }
    this.externeService.soumettreJustificatif(this.externeId, this.justifSeanceId, this.justifMotif).subscribe({
      next: () => {
        this.showMessage('Justificatif envoyé ✅');
        this.fermerJustificatif();
        if (this.presencesFormation) this.voirMesPresences(this.presencesFormation);
      },
      error: () => this.showMessage("Erreur lors de l'envoi", 'danger')
    });
  }

  // ===== Attestation =====
  ouvrirAttestation(inscription: any) {
    this.formationAttestation = inscription;
    this.attestationData = null;
    this.attestationLoading = true;
    this.activeSection = 'attestation';
    this.externeService.getAttestationData(this.externeId!, inscription.formation_id).subscribe({
      next: data => { this.attestationData = data; this.attestationLoading = false; },
      error: () => { this.attestationLoading = false; }
    });
  }

  imprimerAttestation() { window.print(); }

  telechargerAttestation(formationId: number) {
    if (!this.externeId) return;
    this.externeService.genererAttestation(this.externeId, formationId).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attestation_formation_${formationId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showMessage('Erreur lors du téléchargement de l\'attestation', 'danger')
    });
  }

  getTodayStr(): string {
    return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ===== Liste d'attente =====
  loadEnAttente() {
    if (!this.externeId) return;
    this.externeService.getEnAttente(this.externeId).subscribe({
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
    if (!this.externeId) return;
    this.externeService.rejoindreListeAttente(this.externeId, formationId).subscribe({
      next: () => { this.showMessage("Vous avez rejoint la liste d'attente ✅"); this.loadEnAttente(); },
      error: (err) => this.showMessage(err?.error?.error || 'Erreur', 'danger')
    });
  }

  quitterListeAttente(formationId: number) {
    if (!this.externeId) return;
    this.externeService.quitterListeAttente(this.externeId, formationId).subscribe({
      next: () => { this.showMessage("Retiré de la liste d'attente"); this.loadEnAttente(); },
      error: () => this.showMessage('Erreur', 'danger')
    });
  }


  // ===== Supports =====
  voirSupports(inscription: any) {
    if (!this.externeId) return;
    this.formationSelectionnee = inscription;
    this.activeSection = 'supports';
    this.externeService.getSupports(this.externeId, inscription.formation_id).subscribe({
      next: data => this.supports = data,
      error: () => this.showMessage('Accès refusé ou aucun support disponible', 'danger')
    });
  }

  getIconSupport(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return '📄';
    if (t.includes('vidéo') || t.includes('video')) return '🎬';
    if (t.includes('image')) return '🖼️';
    if (t.includes('zip')) return '📦';
    if (t.includes('doc')) return '📝';
    if (t.includes('ppt')) return '📊';
    return '📎';
  }

  getLienSupport(fichier: string): string {
    if (!fichier) return '#';
    if (fichier.startsWith('/uploads/')) return `${environment.baseUrl}${fichier}`;
    return fichier;
  }

  // ===== Profil =====
  loadProfilComplet() {
    this.authService.getProfile().subscribe({
      next: (data: any) => {
        this.profileTelephone = data.telephone || '';
        this.profileEntreprise = data.entreprise || '';
        this.profileSpecialite = data.specialite || '';
        this.profileDateNaissance = data.date_naissance ? data.date_naissance.substring(0, 10) : '';
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
      nom: this.profileNom,
      email: this.profileEmail,
      telephone: this.profileTelephone,
      entreprise: this.profileEntreprise,
      specialite: this.profileSpecialite,
      date_naissance: this.profileDateNaissance
    }).subscribe({
      next: () => {
        this.user.nom = this.profileNom;
        this.user.email = this.profileEmail;
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
    if (this.nouveauMdp.length < 8) {
      this.showMessage('Mot de passe trop court (min 8 caractères)', 'danger'); return;
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
      next: () => { notif.lu = 1; this.unreadCount = Math.max(0, this.unreadCount - 1); },
      error: () => {}
    });
  }

  marquerToutLu() {
    if (!this.user?.id) return;
    this.notifService.marquerToutLu(this.user.id).subscribe({
      next: () => { this.notifications.forEach(n => n.lu = 1); this.unreadCount = 0; },
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

  openNotifications() {
    this.activeSection = 'notifications';
    this.loadNotifications();
  }

  getNotifIcon(type: string): string { return type; }

  stripNotifEmoji(msg: string): string {
    if (!msg) return '';
    return msg.replace(/^[\u{1F300}-\u{1F9FF}✅❌⚠️]️?\s*/u, '');
  }

  // ===== Messagerie =====
  loadUnreadMessages() {
    if (!this.user?.id) return;
    this.msgService.getUnreadCount(this.user.id).subscribe({
      next: data => this.unreadMessages = data?.count || 0,
      error: () => {}
    });
  }

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

  // ===== Programme =====
  programmeFormation: any = null;
  programmeData: any = null;
  programmeLoading = false;

  voirProgramme(f: any) {
    this.programmeFormation = f;
    this.programmeData = null;
    this.programmeLoading = true;
    const formationId = f.formation_id || f.id;
    this.externeService.getProgramme(formationId).subscribe({
      next: (res: any) => { this.programmeData = res; this.programmeLoading = false; },
      error: () => { this.programmeLoading = false; this.showMessage('Erreur chargement du programme', 'danger'); }
    });
  }

  fermerProgramme() {
    this.programmeFormation = null;
    this.programmeData = null;
  }

  // Calculs dashboard
  get inscriptionsPayees(): number {
    return this.mesInscriptions.filter(i => i.statut_paiement === 'payé').length;
  }

  get totalDepense(): number {
    return this.mesInscriptions
      .filter(i => i.statut_paiement === 'payé')
      .reduce((sum, i) => sum + (parseFloat(i.montant) || 0), 0);
  }

  // ===== Quiz =====
  nbQuizDisponibles(): number {
    return this.mesInscriptions
      .filter(i => i.statut_paiement === 'payé')
      .filter(f => {
        const e = this.eligibiliteMap[f.formation_id];
        return f.status === 'terminée' && e?.has_quiz && !e?.quiz_ok && e?.progression === 100 && (e?.quiz_tentatives || 0) < (e?.nb_tentatives_max || 3);
      }).length;
  }

  ouvrirSectionQuiz() {
    this.activeSection = 'quiz';
    this.message = '';
    this.quizSectionLoading = true;
    this.quizStatuts = {};
    const inscriptions = this.mesInscriptions.filter(i => i.statut_paiement === 'payé');
    if (!inscriptions.length) { this.quizSectionLoading = false; return; }
    let loaded = 0;
    inscriptions.forEach(f => {
      this.externeService.getQuizScore(this.externeId!, f.formation_id).subscribe({
        next: data => {
          this.quizStatuts[f.formation_id] = data;
          loaded++;
          if (loaded === inscriptions.length) this.quizSectionLoading = false;
        },
        error: () => {
          loaded++;
          if (loaded === inscriptions.length) this.quizSectionLoading = false;
        }
      });
    });
  }

  ouvrirQuiz(f: any) {
    this.quizFormationId = f.formation_id;
    this.quizData = null;
    this.quizReponses = {};
    this.quizResultat = null;
    this.quizLoading = true;
    this.showQuizModal = true;
    this.externeService.getQuiz(f.formation_id).subscribe({
      next: data => { this.quizData = data; this.quizLoading = false; },
      error: () => { this.quizLoading = false; this.showMessage('Erreur chargement du quiz', 'danger'); }
    });
  }

  soumettreQuiz() {
    if (!this.externeId || !this.quizData) return;
    const reponses = Object.entries(this.quizReponses).map(([question_id, reponse_id]) => ({
      question_id: Number(question_id), reponse_id: Number(reponse_id)
    }));
    if (reponses.length < this.quizData.questions.length) {
      this.showMessage('Veuillez répondre à toutes les questions', 'danger'); return;
    }
    this.quizSubmitting = true;
    this.externeService.soumettreQuiz({
      externe_id: this.externeId,
      quiz_id: this.quizData.id,
      reponses
    }).subscribe({
      next: res => {
        this.quizResultat = res;
        this.quizSubmitting = false;
        if (this.quizFormationId) {
          this.externeService.getEligibiliteAttestation(this.externeId!, this.quizFormationId).subscribe({
            next: data => this.eligibiliteMap = { ...this.eligibiliteMap, [this.quizFormationId!]: data },
            error: () => {}
          });
        }
      },
      error: (err) => {
        this.quizSubmitting = false;
        this.showMessage(err?.error?.error || 'Erreur lors de la soumission', 'danger');
      }
    });
  }

  fermerQuizApresResultat() {
    const wasSuccessful = this.quizResultat?.reussi;
    const fid = this.quizFormationId;
    this.showQuizModal = false;
    this.quizData = null;
    this.quizReponses = {};
    this.quizResultat = null;
    this.quizFormationId = null;
    if (wasSuccessful) this.loadMesInscriptions();
    if (fid) {
      this.externeService.getQuizScore(this.externeId!, fid).subscribe({
        next: data => this.quizStatuts[fid] = data,
        error: () => {}
      });
    }
  }
}
