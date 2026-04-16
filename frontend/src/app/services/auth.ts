import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = 'http://localhost:3000/api/auth';
   constructor(private http: HttpClient) {}

  login(data: any) {
    return this.http.post(`${this.apiUrl}/login`, data);
}
register(data: any) {
  return this.http.post(`${this.apiUrl}/register`, data);
}
logout() {
  localStorage.removeItem('token'); // أو userId
  localStorage.removeItem('role');
}
}