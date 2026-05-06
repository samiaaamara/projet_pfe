import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ExterneService {
  private apiUrl = 'http://localhost:3000/api/externe';

  constructor(private http: HttpClient) {}

  getFormations(page = 1) {
    return this.http.get<any>(`${this.apiUrl}/formations?page=${page}`);
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
}
