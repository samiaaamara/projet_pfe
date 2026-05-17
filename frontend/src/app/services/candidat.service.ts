import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CandidatService {

  private apiUrl = `${environment.apiUrl}/candidat`;

  constructor(private http: HttpClient) {}

  getFormations(candidatId: number, page = 1, limit = 10) {
    return this.http.get<any>(
      `${this.apiUrl}/formations/${candidatId}?page=${page}&limit=${limit}`
    );
  }

  getMesFormations(candidatId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/mes-formations/${candidatId}`);
  }

  inscrire(candidatId: number, formationId: number) {
    return this.http.post<any>(`${this.apiUrl}/inscription`, {
      candidat_id: candidatId,
      formation_id: formationId
    });
  }

  getProgression(candidatId: number) {
    return this.http.get<any>(`${this.apiUrl}/progression/${candidatId}`);
  }

  getSupports(formationId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/supports/${formationId}`);
  }

  noter(candidatId: number, formationId: number, note: number, commentaire?: string) {
    return this.http.post<any>(`${this.apiUrl}/notation`, {
      candidat_id: candidatId,
      formation_id: formationId,
      note,
      commentaire
    });
  }

  getMaNote(candidatId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/notation/${candidatId}/${formationId}`);
  }

  getNotationsAvg(formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/notations-avg/${formationId}`);
  }

  getProgressionModules(candidatId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/progression-modules/${candidatId}/${formationId}`);
  }

  getMesPresences(candidatId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/mes-presences/${candidatId}/${formationId}`);
  }

  rejoindreListeAttente(candidatId: number, formationId: number) {
    return this.http.post<any>(`${this.apiUrl}/liste-attente`, { candidat_id: candidatId, formation_id: formationId });
  }

  quitterListeAttente(candidatId: number, formationId: number) {
    return this.http.delete<any>(`${this.apiUrl}/liste-attente/${candidatId}/${formationId}`);
  }

  getEnAttente(candidatId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/en-attente/${candidatId}`);
  }

  desinscrire(candidatId: number, formationId: number) {
    return this.http.delete<any>(`${this.apiUrl}/inscription/${candidatId}/${formationId}`);
  }

  soumettreJustificatif(candidatId: number, seanceId: number, motif: string) {
    return this.http.post<any>(`${this.apiUrl}/justificatifs`, { candidat_id: candidatId, seance_id: seanceId, motif });
  }

  getMesJustificatifs(candidatId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/mes-justificatifs/${candidatId}`);
  }

  getAttestationData(candidatId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/attestation-data/${candidatId}/${formationId}`);
  }

  getEligibiliteAttestation(candidatId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/eligibilite-attestation/${candidatId}/${formationId}`);
  }
}
