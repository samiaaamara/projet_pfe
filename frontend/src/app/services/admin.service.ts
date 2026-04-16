import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private apiUrl = 'http://localhost:3000/api/admin';

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

}