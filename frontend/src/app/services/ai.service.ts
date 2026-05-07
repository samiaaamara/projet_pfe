import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {

  readonly ollamaUrl = 'http://localhost:11434/api/chat';
  model = 'mistral'; // change to your installed model (e.g. llama3, phi3, gemma2)

  readonly systemPrompt = `Tu es un assistant IA intégré dans une plateforme de gestion de formations professionnelles.
Tu aides les utilisateurs (étudiants, formateurs, externes, administrateurs) avec leurs questions sur :
- Les formations disponibles et les inscriptions
- La progression dans les modules de formation
- Les séances, présences et justificatifs
- L'utilisation de la plateforme
Réponds toujours en français, de manière concise, claire et bienveillante.`;

  constructor(private http: HttpClient) {}

  chat(history: OllamaMessage[]): Observable<string> {
    const messages: OllamaMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...history
    ];

    return this.http.post<any>(this.ollamaUrl, {
      model: this.model,
      messages,
      stream: false
    }).pipe(
      map(res => res.message?.content ?? 'Aucune réponse reçue.'),
      catchError(() => of(
        '⚠️ Je ne peux pas me connecter à Ollama. Assurez-vous que le service est démarré avec `ollama serve` et que le modèle est installé.'
      ))
    );
  }

  // kept for backward compatibility
  sendMessage(message: string): Observable<string> {
    return this.chat([{ role: 'user', content: message }]);
  }
}
