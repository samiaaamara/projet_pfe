import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Formation {
  titre: string;
  description: string;
  date_debut: string;
  date_fin?: string;
  duree?: number;
  niveau?: string;
  specialite?: string;
  nb_places?: number;
  status?: 'draft' | 'published';
  formateur_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormateurService {

  private api = 'http://localhost:3000/api/formateur';

  constructor(private http: HttpClient) {}

  // 🔹 Récupérer les formations d’un formateur
  getMesFormations(formateurId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/mes-formations/${formateurId}`);
  }

  // 🔹 Récupérer le profil formateur à partir de l'utilisateur connecté
  getProfil(userId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/profil/${userId}`);
  }

  // 🔹 Récupérer les inscriptions pour une formation
  getInscriptions(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/inscriptions/${formationId}`);
  }

  // 🔹 Récupérer les supports d'une formation
  getSupports(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/supports/${formationId}`);
  }

  // 🔹 Créer une formation
  creerFormation(formation: Formation): Observable<any> {
    return this.http.post(`${this.api}/creer-formation`, formation);
  }

  // 🔹 Mettre à jour une formation
  modifierFormation(formationId: number, formation: Partial<Formation>): Observable<any> {
    return this.http.put(`${this.api}/formations/${formationId}`, formation);
  }

  // 🔹 Soumettre une formation à l'admin pour approbation
  soumettreFormationPourApprobation(formationId: number, formateurId: number): Observable<any> {
    return this.http.put(`${this.api}/formations/${formationId}/submit-for-approval`, { formateur_id: formateurId });
  }

  // 🔹 Supprimer une formation
  supprimerFormation(formationId: number, formateurId: number): Observable<any> {
    return this.http.delete(`${this.api}/formations/${formationId}`, {
      body: { formateur_id: formateurId }
    });
  }

  // 🔹 Récupérer les statistiques du formateur
  getStats(formateurId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/stats/${formateurId}`);
  }

  // 🔹 Valider la présence d'un étudiant
  mettreAJourStatutInscription(inscriptionId: number, statut: string): Observable<any> {
    return this.http.put(`${this.api}/inscriptions/${inscriptionId}/status`, { statut });
  }

  // 🔹 Ajouter un support à une formation


    ajouterSupport(formationId: number, type: string, fichier: string): Observable<any> {
    return this.http.post(`${this.api}/supports`, {
      formation_id: formationId,
      type,
      fichier
    });
  }
  // 🔹 Ajouter un support avec upload de fichier
uploadSupport(formationId: number, type: string, file: File): Observable<any> {
  const formData = new FormData();
  formData.append('formation_id', formationId.toString());
  formData.append('type', type);
  formData.append('fichier', file);
  return this.http.post(`${this.api}/supports`, formData);
}


  // 🔹 Supprimer un support
  supprimerSupport(supportId: number): Observable<any> {
    return this.http.delete(`${this.api}/supports/${supportId}`);
  }
}
