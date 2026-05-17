import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExterneService {
  private apiUrl = `${environment.apiUrl}/externe`;

  constructor(private http: HttpClient) {}

  getFormations(externeId: number | null, page = 1) {
    const params = externeId ? `?page=${page}&externeId=${externeId}` : `?page=${page}`;
    return this.http.get<any>(`${this.apiUrl}/formations${params}`);
  }

  getMesInscriptions(externeId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/mes-inscriptions/${externeId}`);
  }

  initierPaiement(externeId: number, formationId: number) {
    return this.http.post<any>(`${this.apiUrl}/initier-paiement`, {
      externe_id: externeId,
      formation_id: formationId,
    });
  }

  confirmerPaiement(paymentRef: string) {
    return this.http.get<any>(`${this.apiUrl}/confirmer-paiement?payment_ref=${paymentRef}`);
  }

  getSupports(externeId: number, formationId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/supports/${externeId}/${formationId}`);
  }

  getProfil(userId: number) {
    return this.http.get<any>(`${this.apiUrl}/profil/${userId}`);
  }

  getProgramme(formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/formations/${formationId}/programme`);
  }

  getProgression(externeId: number) {
    return this.http.get<any>(`${this.apiUrl}/progression/${externeId}`);
  }

  getProgressionModules(externeId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/progression-modules/${externeId}/${formationId}`);
  }

  noter(externeId: number, formationId: number, note: number, commentaire?: string) {
    return this.http.post<any>(`${this.apiUrl}/notation`, { externe_id: externeId, formation_id: formationId, note, commentaire });
  }

  getMaNote(externeId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/notation/${externeId}/${formationId}`);
  }

  getMesPresences(externeId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/mes-presences/${externeId}/${formationId}`);
  }

  soumettreJustificatif(externeId: number, seanceId: number, motif: string) {
    return this.http.post<any>(`${this.apiUrl}/justificatifs`, { externe_id: externeId, seance_id: seanceId, motif });
  }

  getMesJustificatifs(externeId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/mes-justificatifs/${externeId}`);
  }

  getEligibiliteAttestation(externeId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/eligibilite-attestation/${externeId}/${formationId}`);
  }

  getAttestationData(externeId: number, formationId: number) {
    return this.http.get<any>(`${this.apiUrl}/attestation-data/${externeId}/${formationId}`);
  }

  rejoindreListeAttente(externeId: number, formationId: number) {
    return this.http.post<any>(`${this.apiUrl}/liste-attente`, { externe_id: externeId, formation_id: formationId });
  }

  quitterListeAttente(externeId: number, formationId: number) {
    return this.http.delete<any>(`${this.apiUrl}/liste-attente/${externeId}/${formationId}`);
  }

  getEnAttente(externeId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/en-attente/${externeId}`);
  }
}
