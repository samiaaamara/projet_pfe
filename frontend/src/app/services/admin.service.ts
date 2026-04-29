import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  approveAndPublishFormation(formationId: number) {
    throw new Error('Method not implemented.');
  }

  private apiUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient) { }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  // ======================
  // USERS
  // ======================

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`, this.getAuthHeaders());
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`, this.getAuthHeaders());
  }

  // ======================
  // FORMATIONS
  // ======================

  getFormations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formations`, this.getAuthHeaders());
  }

  addFormation(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/formations`, data, this.getAuthHeaders());
  }

  updateFormation(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${id}`, data, this.getAuthHeaders());
  }

  deleteFormation(formationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/formations/${formationId}`, this.getAuthHeaders());
  }

  publishFormation(id: number) {
    return this.http.put(`${this.apiUrl}/formations/${id}/publish`, {}, this.getAuthHeaders());
  }

  // 🔔 Formations en attente d'approbation
  getFormationsPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formations-pending`, this.getAuthHeaders());
  }
  getFormationsAccepted(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/formations-accepted`, this.getAuthHeaders());
  }

  acceptFormation(formationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/accept`, {}, this.getAuthHeaders());
  }

  publishAcceptedFormation(formationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/publish-accepted`, {}, this.getAuthHeaders());
  }

  // ❌ Rejeter une formation
  rejectFormation(formationId: number, reason: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/formations/${formationId}/reject`, { reason }, this.getAuthHeaders());
  }

/* STATS */
getStats() {
  return this.http.get<any>(`${this.apiUrl}/stats`, this.getAuthHeaders());
}
getFormateurs(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/formateurs`, this.getAuthHeaders());
}

  addFormateur(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/formateurs`, data, this.getAuthHeaders());
  }

  updateFormateur(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/formateurs/${id}`, data, this.getAuthHeaders());
  }

  deleteFormateur(formateurId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/formateurs/${formateurId}`, this.getAuthHeaders());
  }

}
