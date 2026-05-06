import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EtudiantService {

  private apiUrl = 'http://localhost:3000/api/etudiant';

  constructor(private http: HttpClient) {}

  // 📚 Toutes les formations
  getFormations(etudiantId: number, page = 1, limit = 10) {
  return this.http.get<any>(
    `${this.apiUrl}/formations/${etudiantId}?page=${page}&limit=${limit}`
  );
}


  // ✅ Mes formations
  getMesFormations(etudiantId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/mes-formations/${etudiantId}`
    );
  }

  // 🟢 Inscription
  inscrire(etudiantId: number, formationId: number) {
    return this.http.post<any>(`${this.apiUrl}/inscription`, {
      etudiant_id: etudiantId,
      formation_id: formationId
    });
  }

  // 📈 Progression
  getProgression(etudiantId: number) {
    return this.http.get<any>(
      `${this.apiUrl}/progression/${etudiantId}`
    );
  }

  // 📎 Supports pédagogiques
  getSupports(formationId: number) {
    return this.http.get<any[]>(
      `${this.apiUrl}/supports/${formationId}`
    );
  }

  noter(etudiantId: number, formationId: number, note: number, commentaire?: string) {
    return this.http.post<any>(`${this.apiUrl}/notation`, {
      etudiant_id: etudiantId,
      formation_id: formationId,
      note,
      commentaire
    });
  }

  getMaNote(etudiantId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/notation/${etudiantId}/${formationId}`);
  }

  getNotationsAvg(formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/notations-avg/${formationId}`);
  }

  getProgressionModules(etudiantId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/progression-modules/${etudiantId}/${formationId}`);
  }

  getMesPresences(etudiantId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/mes-presences/${etudiantId}/${formationId}`);
  }

  // Liste d'attente
  rejoindreListeAttente(etudiantId: number, formationId: number) {
    return this.http.post<any>(`${this.apiUrl}/liste-attente`, { etudiant_id: etudiantId, formation_id: formationId });
  }
  quitterListeAttente(etudiantId: number, formationId: number) {
    return this.http.delete<any>(`${this.apiUrl}/liste-attente/${etudiantId}/${formationId}`);
  }
  getEnAttente(etudiantId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/en-attente/${etudiantId}`);
  }
  desinscrire(etudiantId: number, formationId: number) {
    return this.http.delete<any>(`${this.apiUrl}/inscription/${etudiantId}/${formationId}`);
  }

  // Justificatifs
  soumettreJustificatif(etudiantId: number, seanceId: number, motif: string) {
    return this.http.post<any>(`${this.apiUrl}/justificatifs`, { etudiant_id: etudiantId, seance_id: seanceId, motif });
  }
  getMesJustificatifs(etudiantId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/mes-justificatifs/${etudiantId}`);
  }

  // Attestation avec données complètes
  getAttestationData(etudiantId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/attestation-data/${etudiantId}/${formationId}`);
  }
}
