import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Formation {
  titre: string;
  description: string;
  date_debut: string;
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

  // 🔹 Récupérer les inscriptions pour une formation
  getInscriptions(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/inscriptions/${formationId}`);
  }

  // 🔹 Créer une formation
  creerFormation(formation: Formation): Observable<any> {
    return this.http.post(`${this.api}/creer-formation`, formation);
  }

  // 🔹 Ajouter un support à une formation
  ajouterSupport(formationId: number, type: string, fichier: string): Observable<any> {
    return this.http.post(`${this.api}/supports`, {
      formation_id: formationId,
      type,
      fichier
    });
  }
}
