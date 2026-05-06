import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {

  sendMessage(message: string): Observable<string> {
    // simulation pour l’instant
    return of("Je suis ton assistant IA 🤖");
  }
}