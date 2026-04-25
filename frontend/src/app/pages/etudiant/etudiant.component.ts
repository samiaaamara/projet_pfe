import { Component, OnInit , OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EtudiantService } from '../../services/etudiant.service';
import { Auth } from '../../services/auth';
import { NotificationsService } from '../../services/notifications.service';
@Component({
  selector: 'app-etudiant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './etudiant.component.html',
  styleUrl: './etudiant.component.css',
})
export class EtudiantComponent implements OnInit, OnDestroy {

  user: any = null;
  etudiantId: number | null = null;

  formations: any[] = [];
  page = 1;
  totalPages = 1;
  totalFormations = 0;
  recherche = '';
  filtreNiveau = '';
  niveaux = ['Débutant', 'Intermédiaire', 'Avancé'];

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
  ancienMdp = '';
  nouveauMdp = '';
  confirmMdp = '';

  // Attestation
  formationAttestation: any = null;
// Notifications
notifications: any[] = [];
unreadCount = 0;
private pollingInterval: any;

  message = '';
  messageType: 'success' | 'danger' = 'success';
  activeSection: 'accueil' | 'formations' | 'mesFormations' | 'supports' | 'progression' | 'profil' | 'attestation' | 'notifications' = 'accueil';
  notifService: any;

 
  constructor(
    private etudiantService: EtudiantService,
    private authService: Auth,
    private notificationsService: NotificationsService,
    private router: Router
  ) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (!stored) { this.router.navigate(['/login']); return; }

    this.user = JSON.parse(stored);
    if (this.user.role !== 'etudiant' || !this.user.etudiantId) {
      this.router.navigate(['/login']); return;
    }
    this.etudiantId = this.user.etudiantId;
    this.loadFormations();
    this.loadMesFormations();
    this.chargerProgression();
    this.loadUnreadCount();
this.pollingInterval = setInterval(() => this.loadUnreadCount(), 30000);
  }

  setSection(section: any) {
    this.activeSection = section;
    this.message = '';
  }

  showMessage(msg: string, type: 'success' | 'danger' = 'success') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  loadFormations() {
    if (!this.etudiantId) return;
    this.etudiantService.getFormations(this.etudiantId, this.page)
      .subscribe({
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
        ? (f.titre + ' ' + f.description).toLowerCase().includes(this.recherche.toLowerCase())
        : true;
      const matchNiveau = this.filtreNiveau ? f.niveau === this.filtreNiveau : true;
      return matchRecherche && matchNiveau;
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

  inscrire(formationId: number) {
    if (!this.etudiantId) return;
    this.etudiantService.inscrire(this.etudiantId, formationId)
      .subscribe({
        next: () => {
          this.showMessage('Inscription réussie ! La formation a été ajoutée à votre espace.');
          this.loadMesFormations();
          this.loadFormations();
        },
        error: (err) => {
          this.showMessage(err?.error?.message || "Erreur lors de l'inscription", 'danger');
        }
      });
  }

  estDejaInscrit(formationId: number): boolean {
    return this.mesFormations.some(f => f.formation_id === formationId);
  }

  loadMesFormations() {
    if (!this.etudiantId) return;
    this.etudiantService.getMesFormations(this.etudiantId)
      .subscribe({
        next: data => this.mesFormations = data,
        error: () => this.showMessage('Erreur chargement de vos formations', 'danger')
      });
  }

  getStatutBadge(statut: string): string {
    const map: any = {
      'Inscrit': 'bg-primary',
      'Présent': 'bg-success',
      'Absent': 'bg-danger',
      'Terminé': 'bg-secondary'
    };
    return map[statut] || 'bg-secondary';
  }

  voirSupports(formation: any) {
    this.formationSelectionnee = formation;
    this.activeSection = 'supports';
    const id = formation.formation_id || formation.id;
    this.etudiantService.getSupports(id)
      .subscribe({
        next: data => this.supports = data,
        error: () => this.showMessage('Erreur chargement des supports', 'danger')
      });
  }

  getIconSupport(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return '📄';
    if (t.includes('vidéo') || t.includes('video') || t.includes('mp4')) return '🎬';
    if (t.includes('image') || t.includes('img')) return '🖼️';
    if (t.includes('zip') || t.includes('archive')) return '📦';
    if (t.includes('doc') || t.includes('word')) return '📝';
    if (t.includes('ppt') || t.includes('présentation')) return '📊';
    return '📎';
  }

  getLienSupport(fichier: string): string {
    if (!fichier) return '#';
    if (fichier.startsWith('/uploads/')) return `http://localhost:3000${fichier}`;
    return fichier;
  }

  chargerProgression() {
    if (!this.etudiantId) return;
    this.etudiantService.getProgression(this.etudiantId)
      .subscribe({
        next: data => this.progression = data?.progression || 0,
        error: () => {}
      });
  }

  get formationsTerminees(): number {
    return this.mesFormations.filter(f => f.statut === 'Présent' || f.statut === 'Terminé').length;
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
    if (!this.etudiantId) return;
    this.etudiantService.getMaNote(this.etudiantId, formationId).subscribe({
      next: data => { if (data?.note) this.mesNotes[formationId] = data.note; },
      error: () => {}
    });
  }

  setNoteHover(formationId: number, note: number) { this.noteHover[formationId] = note; }
  clearNoteHover(formationId: number) { delete this.noteHover[formationId]; }

  noterFormation(formationId: number, note: number) {
    if (!this.etudiantId) return;
    this.etudiantService.noter(this.etudiantId, formationId, note).subscribe({
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

  // ===== Attestation =====
  ouvrirAttestation(f: any) {
    this.formationAttestation = f;
    this.activeSection = 'attestation';
  }

  imprimerAttestation() { window.print(); }

  getTodayStr(): string {
    return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // ===== Profil =====
  sauvegarderProfil() {
    if (!this.profileNom || !this.profileEmail) {
      this.showMessage('Nom et email sont requis', 'danger'); return;
    }
    this.authService.updateProfile({ nom: this.profileNom, email: this.profileEmail }).subscribe({
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
  ngOnDestroy() {
  if (this.pollingInterval) clearInterval(this.pollingInterval);
}

loadUnreadCount() {
  if (!this.user?.id) return;
  this.notifService.getUnreadCount(this.user.id).subscribe({
    next: (data: { count: number; }) => this.unreadCount = data?.count || 0,
    error: () => {}
  });
}

loadNotifications() {
  if (!this.user?.id) return;
  this.notifService.getNotifications(this.user.id).subscribe({
    next: (data: any[]) => {
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

getNotifIcon(type: string): string {
  const icons: any = { inscription:'📚', approbation:'✅', rejet:'❌', presence:'🏆', info:'ℹ️' };
  return icons[type] || '🔔';
}

openNotifications() {
  this.activeSection = 'notifications';
  this.loadNotifications();
}
}
