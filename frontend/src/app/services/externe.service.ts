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

  payer(externe_id: number, formation_id: number) {
    return this.http.post<any>(`${this.apiUrl}/payer`, { externe_id, formation_id });
  }

  getSupports(externeId: number, formationId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/supports/${externeId}/${formationId}`);
  }

  getProfil(userId: number) {
    return this.http.get<any>(`${this.apiUrl}/profil/${userId}`);
  }
}