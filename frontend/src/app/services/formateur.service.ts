import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Formation {
  titre: string;
  description: string;
  specialite?: string;
  nb_places?: number;
  status?: 'draft' | 'pending_approval' | 'accepted' | 'published';
  formateur_id: number;
  photo?: string;
  module_count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormateurService {

  private api = `${environment.apiUrl}/formateur`;

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

  getInscriptionsEnAttente(formateurId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/inscriptions-en-attente/${formateurId}`);
  }

  getListeAttenteFormateur(formateurId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/liste-attente/${formateurId}`);
  }

  // 🔹 Récupérer les supports d'une formation
  getSupports(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/supports/${formationId}`);
  }

  // 🔹 Créer une formation
  creerFormation(data: FormData): Observable<any> {
    return this.http.post(`${this.api}/creer-formation`, data);
  }

  // 🔹 Mettre à jour une formation
  modifierFormation(formationId: number, data: FormData): Observable<any> {
    return this.http.put(`${this.api}/formations/${formationId}`, data);
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

  // 🔹 Valider la présence d'un participant (étudiant ou externe)
  mettreAJourStatutInscription(inscriptionId: number, statut: string, typeParticipant: string = 'étudiant'): Observable<any> {
    return this.http.put(`${this.api}/inscriptions/${inscriptionId}/status`, { statut, type_participant: typeParticipant });
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

  // 🔹 Progression modulaire
  getProgression(formationId: number, etudiantId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/progression/${formationId}/${etudiantId}`);
  }

  updateProgression(formationId: number, etudiantId: number, moduleId: number, statut: string): Observable<any> {
    return this.http.put(`${this.api}/progression/${formationId}/${etudiantId}/${moduleId}`, { statut });
  }

  getProgressionExterne(formationId: number, externeId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/progression-externe/${formationId}/${externeId}`);
  }

  updateProgressionExterne(formationId: number, externeId: number, moduleId: number, statut: string): Observable<any> {
    return this.http.put(`${this.api}/progression-externe/${formationId}/${externeId}/${moduleId}`, { statut });
  }

  // 🔹 Modules d'une formation (pour le sélecteur dans le formulaire séance)
  getFormationModules(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/formation-modules/${formationId}`);
  }

  // 🔹 Séances
  getSeances(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/seances/${formationId}`);
  }
  creerSeance(data: any): Observable<any> {
    return this.http.post(`${this.api}/seances`, data);
  }
  modifierSeance(seanceId: number, data: any): Observable<any> {
    return this.http.put(`${this.api}/seances/${seanceId}`, data);
  }
  supprimerSeance(seanceId: number): Observable<any> {
    return this.http.delete(`${this.api}/seances/${seanceId}`);
  }

  // 🔹 Présences
  getFeuillePresence(seanceId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/presences/${seanceId}`);
  }
  enregistrerPresence(seanceId: number, etudiantId: number, statut: string): Observable<any> {
    return this.http.put(`${this.api}/presences/${seanceId}/${etudiantId}`, { statut });
  }
  enregistrerPresenceExterne(seanceId: number, externeId: number, statut: string): Observable<any> {
    return this.http.put(`${this.api}/presences/${seanceId}/externe/${externeId}`, { statut });
  }

  // Justificatifs
  getJustificatifs(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/justificatifs/${formationId}`);
  }
  traiterJustificatif(justifId: number, statut: 'accepté' | 'refusé'): Observable<any> {
    return this.http.put(`${this.api}/justificatifs/${justifId}`, { statut });
  }

  // Programme et modules
  getProgramme(formationId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/formations/${formationId}/programme`);
  }
  saveProgramme(formationId: number, data: { description_globale?: string; objectifs?: string; prerequis?: string }): Observable<any> {
    return this.http.put(`${this.api}/formations/${formationId}/programme`, data);
  }
  addModule(formationId: number, data: { titre: string; description?: string | null; duree_heures?: number | null; ordre?: number | null }): Observable<any> {
    return this.http.post(`${this.api}/formations/${formationId}/modules`, data);
  }
  updateModule(formationId: number, moduleId: number, data: { titre: string; description?: string | null; duree_heures?: number | null; ordre?: number | null }): Observable<any> {
    return this.http.put(`${this.api}/formations/${formationId}/modules/${moduleId}`, data);
  }
  deleteModule(formationId: number, moduleId: number): Observable<any> {
    return this.http.delete(`${this.api}/formations/${formationId}/modules/${moduleId}`);
  }

  creerQuiz(formationId: number, data: {
    titre: string;
    seuil_reussite: number;
    nb_tentatives: number;
    questions: { question: string; reponses: { reponse: string; est_correcte: boolean }[] }[];
  }): Observable<any> {
    return this.http.post(`${this.api}/formations/${formationId}/quiz`, data);
  }

  getQuiz(formationId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/formations/${formationId}/quiz`);
  }
}
