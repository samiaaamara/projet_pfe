import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private apiUrl = 'http://localhost:3000/api/questions';

  constructor(private http: HttpClient) {}

  getQuestionsFormation(formationId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/formation/${formationId}`);
  }

  getMesQuestions(userId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/mes-questions/${userId}`);
  }

  poserQuestion(formation_id: number, etudiant_id: number, question: string) {
    return this.http.post<any>(`${this.apiUrl}`, { formation_id, etudiant_id, question });
  }

  repondre(id: number, reponse: string) {
    return this.http.put<any>(`${this.apiUrl}/${id}/reponse`, { reponse });
  }

  supprimer(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}