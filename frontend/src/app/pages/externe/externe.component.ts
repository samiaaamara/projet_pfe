+320 -0
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExterneService } from '../../services/externe.service';
import { Auth } from '../../services/auth';
import { NotificationsService } from '../../services/notifications.service';
import { MessagesService } from '../../services/messages.service';

@Component({
  selector: 'app-externe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './externe.component.html',
  styleUrl: './externe.component.css',
})
export class ExterneComponent implements OnInit {

  user: any = null;
  externeId: number | null = null;

  // Catalogue formations
  formations: any[] = [];
  page = 1;
  totalPages = 1;
  totalFormations = 0;
  recherche = '';
 
  // Mes inscriptions
  mesInscriptions: any[] = [];

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
  ancienMdp = '';
  nouveauMdp = '';
  confirmMdp = '';

  // Notifications
  notifications: any[] = [];
  unreadCount = 0;
  private pollingInterval: any;

  message = '';
  messageType: 'success' | 'danger' = 'success';
  activeSection: 'accueil' | 'formations' | 'mesInscriptions' | 'supports' | 'profil' | 'notifications' | 'messages' = 'accueil';

  // Messagerie
  contacts: any[] = [];
  messagesConversation: any[] = [];
  contactSelectionne: any = null;
  nouveauMessage = '';
  unreadMessages = 0;

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
    this.loadUnreadCount();
    this.pollingInterval = setInterval(() => this.loadUnreadCount(), 30000);
    this.loadUnreadMessages();
    setInterval(() => this.loadUnreadMessages(), 30000);
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
      },
      error: () => this.showMessage('Erreur chargement des formations', 'danger')
    });
  }
  get formationsFiltrees() {
    return this.formations.filter(f => {
      const matchRecherche = this.recherche
        ? (f.titre + ' ' + (f.description || '')).toLowerCase().includes(this.recherche.toLowerCase())
        : true;
      return matchRecherche;});
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
    return this.mesInscriptions.some(i => i.formation_id === formationId && i.statut_paiement === 'payé');
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
        if (res.gratuit) {
          // Formation gratuite : inscription directe
          this.fermerModal();
          this.showMessage('Inscription confirmée ✅');
          this.loadMesInscriptions();
          this.loadFormations();
        } else if (res.payUrl) {
          // Formation payante : rediriger vers Konnect
          this.fermerModal();
          window.location.href = res.payUrl;
        }
      },
      error: (err) => {
        this.paiementEnCours = false;
        this.showMessage(err?.error?.message || 'Erreur lors du paiement', 'danger');
      }
    });
  }

  // ===== Mes inscriptions =====
  loadMesInscriptions() {
    if (!this.externeId) return;
    this.externeService.getMesInscriptions(this.externeId).subscribe({
      next: data => this.mesInscriptions = data,
      error: () => {}
    });
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
    if (fichier.startsWith('/uploads/')) return `http://localhost:3000${fichier}`;
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

  getNotifIcon(type: string): string {
    const icons: any = { 'inscription': '📚', 'approbation': '✅', 'rejet': '❌', 'info': 'ℹ️' };
    return icons[type] || '🔔';
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
    this.externeService.getProgramme(f.id).subscribe({
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
}
