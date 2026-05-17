import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  approveAndPublishFormation(_formationId: number) {
    throw new Error('Method not implemented.');
  }

  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  // ======================
  // USERS
  // ======================

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  // ======================
  // FORMATIONS
  // ======================

  getFormations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formations`);
  }

  addFormation(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/formations`, data);
  }

  updateFormation(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${id}`, data);
  }

  deleteFormation(formationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/formations/${formationId}`);
  }

  publishFormation(id: number) {
    return this.http.put(`${this.apiUrl}/formations/${id}/publish`, {});
  }

  getFormationsPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formations-pending`);
  }

  getFormationsAccepted(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formations-accepted`);
  }

  acceptFormation(formationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/accept`, {});
  }

  publishAcceptedFormation(formationId: number, config: { date_debut: string; date_fin?: string; prix?: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/publish-accepted`, config);
  }

  getFormationSeances(formationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formations/${formationId}/seances`);
  }

  addFormationSeance(formationId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/formations/${formationId}/seances`, data);
  }

  deleteFormationSeance(seanceId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/seances/${seanceId}`);
  }

  rejectFormation(formationId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/reject`, { reason });
  }

  getStats() {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  getFormateurs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formateurs`);
  }

  addFormateur(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/formateurs`, data);
  }

  updateFormateur(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/formateurs/${id}`, data);
  }

  deleteFormateur(formateurId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/formateurs/${formateurId}`);
  }

  // ======================
  // PROGRAMME
  // ======================

  getProgramme(formationId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/formations/${formationId}/programme`);
  }

  getFormationDetails(formationId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/formations/${formationId}/details`);
  }

  saveProgramme(formationId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/programme`, data);
  }

  addModule(formationId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/formations/${formationId}/modules`, data);
  }

  updateModule(formationId: number, moduleId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/modules/${moduleId}`, data);
  }

  deleteModule(formationId: number, moduleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/formations/${formationId}/modules/${moduleId}`);
  }

  // ======================
  // SUPPORTS
  // ======================

  // ======================
  // QUIZ
  // ======================

  getFormationQuiz(formationId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/formations/${formationId}/quiz`);
  }

  saveFormationQuiz(formationId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/formations/${formationId}/quiz`, data);
  }

  deleteFormationQuiz(formationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/formations/${formationId}/quiz`);
  }

  addFormationSupport(formationId: number, data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/formations/${formationId}/supports`, data);
  }

  deleteFormationSupport(supportId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/supports/${supportId}`);
  }
}
