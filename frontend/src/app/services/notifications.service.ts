import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(userId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/${userId}`);
  }

  getUnreadCount(userId: number) {
    return this.http.get<any>(`${this.apiUrl}/unread-count/${userId}`);
  }

  marquerLu(notifId: number) {
    return this.http.put(`${this.apiUrl}/${notifId}/lire`, {});
  }

  marquerToutLu(userId: number) {
    return this.http.put(`${this.apiUrl}/lire-tout/${userId}`, {});
  }

  supprimer(notifId: number) {
    return this.http.delete(`${this.apiUrl}/${notifId}`);
  }
}