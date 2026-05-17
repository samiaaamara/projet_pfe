import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Auth {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(data: any) { return this.http.post(`${this.apiUrl}/login`, data); }
  register(data: any) { return this.http.post(`${this.apiUrl}/register`, data); }
  getSpecialites() { return this.http.get<{id: number; nom: string}[]>(`${this.apiUrl}/specialites`); }
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('role'); }

  getProfile() { return this.http.get(`${this.apiUrl}/profile`); }
  updateProfile(data: any) { return this.http.put(`${this.apiUrl}/profile`, data); }
  changePassword(data: { ancien_mdp: string; nouveau_mdp: string }) {
    return this.http.put(`${this.apiUrl}/change-password`, data);
  }
  uploadProfilePhoto(formData: FormData) {
    return this.http.post(`${this.apiUrl}/profile/photo`, formData);
  }
}
