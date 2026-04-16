import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EtudiantService {

  private apiUrl = 'http://localhost:3000/api/etudiant';

  constructor(private http: HttpClient) {}

  // 📚 Toutes les formations
  getFormations(etudiantId: number) {
  return this.http.get<any[]>(
    `http://localhost:3000/api/etudiant/formations/${etudiantId}`
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
}
