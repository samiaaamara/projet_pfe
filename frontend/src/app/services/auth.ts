import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class Auth {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = localStorage.getItem('token') || '';
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  login(data: any) { return this.http.post(`${this.apiUrl}/login`, data); }
  register(data: any) { return this.http.post(`${this.apiUrl}/register`, data); }
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('role'); }

  getProfile() { return this.http.get(`${this.apiUrl}/profile`, this.authHeaders()); }
  updateProfile(data: any) { return this.http.put(`${this.apiUrl}/profile`, data, this.authHeaders()); }
  changePassword(data: { ancien_mdp: string; nouveau_mdp: string }) {
    return this.http.put(`${this.apiUrl}/change-password`, data, this.authHeaders());
  }
}