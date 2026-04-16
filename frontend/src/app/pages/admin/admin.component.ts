import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {

  activeSection: 'accueil' | 'utilisateurs' | 'formations' = 'accueil';

  users: any[] = [];
  formations: any[] = [];
  message: string = '';

  // 🔥 FORM CRUD
  showForm = false;
  editMode = false;

  formData: any = {
    id: null,
    titre: '',
    description: '',
    date_debut: ''
  };

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUsers();
    this.loadFormations();
  }

  // ======================
  // NAVIGATION
  // ======================
  setSection(section: 'accueil' | 'utilisateurs' | 'formations') {
    this.activeSection = section;
  }

  // ======================
  // LOAD DATA
  // ======================
  loadUsers() {
    this.adminService.getUsers().subscribe({
      next: (data) => this.users = data,
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  loadFormations() {
    this.adminService.getFormations().subscribe({
      next: (data) => this.formations = data,
      error: (err) => console.error('Erreur chargement formations', err)
    });
  }

  // ======================
  // FORMATIONS CRUD UI
  // ======================

  openAddForm() {
    this.showForm = true;
    this.editMode = false;

    this.formData = {
      id: null,
      titre: '',
      description: '',
      date_debut: ''
    };
  }

  editFormation(f: any) {
    this.showForm = true;
    this.editMode = true;

    this.formData = { ...f };
  }

  closeForm() {
    this.showForm = false;
  }

  saveFormation() {

    if (this.editMode) {

      this.adminService.updateFormation(this.formData.id, this.formData)
        .subscribe({
          next: () => {
            this.message = 'Formation modifiée ✅';
            this.loadFormations();
            this.showForm = false;
          },
          error: (err) => console.error(err)
        });

    } else {

      this.adminService.addFormation(this.formData)
        .subscribe({
          next: () => {
            this.message = 'Formation ajoutée ✅';
            this.loadFormations();
            this.showForm = false;
          },
          error: (err) => console.error(err)
        });

    }
  }

  deleteFormation(formationId: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette formation ?')) return;

    this.adminService.deleteFormation(formationId).subscribe({
      next: () => {
        this.message = 'Formation supprimée ✅';
        this.loadFormations();
      },
      error: (err) => console.error('Erreur suppression formation', err)
    });
  }

  // ======================
  // DELETE USER
  // ======================
  deleteUser(userId: number) {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;

    this.adminService.deleteUser(userId).subscribe({
      next: () => {
        this.message = 'Utilisateur supprimé ✅';
        this.loadUsers();
      },
      error: (err) => console.error('Erreur suppression utilisateur', err)
    });
  }

  // ======================
  // LOGOUT
  // ======================
  logout() {
    localStorage.removeItem('adminLogged');
    window.location.href = '/admin-login';
  }
}