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

  readonly systemPrompt = `Tu es l'assistant de FormaPro, plateforme de gestion de formations professionnelles de l'ISET. Réponds en français, de façon courte et claire.

PLATEFORME : FormaPro gère des formations continues pour 4 types d'utilisateurs : candidat (ISET), externe (professionnel payant), formateur, admin.

RÔLES :
- Candidat : s'inscrit gratuitement, suit modules, passe quiz, télécharge attestation, voit séances/présences, envoie messages au formateur.
- Externe : comme candidat mais paie via Stripe avant d'accéder. Formations gratuites ou payantes.
- Formateur : crée formations (modules, séances, quiz, supports PDF), gère présences, envoie messages.
- Admin : approuve formations et inscriptions, gère utilisateurs, paiements, statistiques. Connexion via /admin-login.

FLUX : formateur crée → admin approuve → candidat/externe s'inscrit → admin approuve (ou paiement confirmé) → participant suit modules → passe quiz → télécharge attestation.

ATTESTATION (important) : nécessite DEUX conditions obligatoires ensemble :
1. Progression = 100% (tous les modules terminés)
2. Quiz réussi (score ≥ seuil configuré, ex: 70%)
Sans l'une des deux = pas d'attestation. Le bouton apparaît automatiquement quand les deux sont remplies.

QUIZ : QCM créé par le formateur, max 3 tentatives par défaut. Score calculé automatiquement.

SPÉCIALITÉS : Informatique, Réseaux, Génie logiciel, Intelligence artificielle, Cybersécurité, Marketing, Finance, Mécanique, Génie civil, Génie électrique.

MESSAGERIE : candidat ↔ formateur, externe ↔ formateur (si payé), formateur ↔ participants + admin.

COMPTE : mot de passe min 8 caractères, reset par email (lien 1h), photo de profil modifiable.

RÈGLES :
- Si [CONTEXTE UTILISATEUR:...] est présent, utilise ces données pour répondre.
- Ne jamais inventer de données absentes du contexte.
- Redirige vers la bonne section de la plateforme si besoin.`;

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
