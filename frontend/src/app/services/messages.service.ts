
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private apiUrl = 'http://localhost:3000/api/messages';

  constructor(private http: HttpClient) {}

  getContacts(userId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/contacts/${userId}`);
  }

  getConversation(userId: number, otherId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/conversation/${userId}/${otherId}`);
  }

  envoyerMessage(expediteur_id: number, destinataire_id: number, contenu: string) {
    return this.http.post<any>(`${this.apiUrl}/send`, { expediteur_id, destinataire_id, contenu });
  }

  getUnreadCount(userId: number) {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count/${userId}`);
  }
}
