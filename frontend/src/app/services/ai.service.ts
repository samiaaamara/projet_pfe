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
  model = 'gemma3:1b';

  readonly systemPrompt = `Tu es un assistant IA d'une plateforme de gestion de formations professionnelles. Réponds en français, de façon concise.

RÈGLES :
- Si le message contient un bloc [CONTEXTE UTILISATEUR:...], utilise ces données pour répondre. Ce sont les vraies données de l'utilisateur.
- Ne jamais inventer de formations, dates ou statistiques qui ne sont pas dans le contexte.
- Si une information n'est pas dans le contexte, dis-le clairement et redirige vers la section de la plateforme.`;

  constructor(private http: HttpClient) {}

  chat(history: OllamaMessage[], context?: string): Observable<string> {
    const fullSystem = context
      ? `${this.systemPrompt}\n\nDONNÉES RÉELLES DE L'UTILISATEUR (utilise ces données pour répondre aux questions spécifiques) :\n${context}`
      : this.systemPrompt;

    const messages: OllamaMessage[] = [
      { role: 'system', content: fullSystem },
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
