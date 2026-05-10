import { Component, Input, OnChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, OllamaMessage } from '../../../services/ai.service';

interface UIMessage {
  role: 'user' | 'assistant';
  content: string;
  time: Date;
}

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnChanges {

  @Input() role: string = '';
  @Input() userName: string = '';
  @Input() formations: any[] = [];
  @Input() progression: number = 0;

  @ViewChild('chatBody') chatBody!: ElementRef;

  isOpen = false;
  isTyping = false;
  userInput = '';
  uiMessages: UIMessage[] = [];
  history: OllamaMessage[] = [];

  get userInitial(): string {
    return this.userName?.charAt(0)?.toUpperCase() || '?';
  }

  get modelLabel(): string {
    return this.aiService.model;
  }

  constructor(public aiService: AiService) {}

  ngOnChanges() {
    if (this.uiMessages.length === 0) {
      this.initWelcome();
    }
  }

  private initWelcome() {
    const roleLabel: Record<string, string> = {
      etudiant: 'étudiant',
      formateur: 'formateur',
      admin: 'administrateur',
      externe: 'participant externe'
    };
    const label = roleLabel[this.role] || 'utilisateur';
    const name = this.userName ? `, ${this.userName}` : '';
    this.uiMessages = [{
      role: 'assistant',
      content: `Bonjour${name} 👋 Je suis votre assistant IA. En tant que ${label}, je peux vous aider avec vos formations, votre progression, vos inscriptions et plus encore. Que souhaitez-vous savoir ?`,
      time: new Date()
    }];
    this.history = [];
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.uiMessages.length === 0) {
      this.initWelcome();
    }
    if (this.isOpen) {
      this.scrollToBottom();
    }
  }

  send(event?: Event) {
    if (event) event.preventDefault();
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    this.uiMessages.push({ role: 'user', content: text, time: new Date() });
    this.history.push({ role: 'user', content: text });
    this.userInput = '';
    this.isTyping = true;
    this.scrollToBottom();

    // Pour les petits modèles, le contexte est injecté dans le 1er message utilisateur
    const historyToSend: OllamaMessage[] = this.history.length === 1
      ? [{ role: 'user', content: `[CONTEXTE UTILISATEUR:\n${this.buildContext()}\n]\n\nQuestion: ${text}` }]
      : this.history;

    this.aiService.chat(historyToSend, this.buildContext()).subscribe({
      next: (response) => {
        this.isTyping = false;
        this.uiMessages.push({ role: 'assistant', content: response, time: new Date() });
        this.history.push({ role: 'assistant', content: response });
        this.scrollToBottom();
      },
      error: () => {
        this.isTyping = false;
        const errMsg = '⚠️ Impossible de contacter Ollama. Vérifiez que `ollama serve` est démarré.';
        this.uiMessages.push({ role: 'assistant', content: errMsg, time: new Date() });
        this.scrollToBottom();
      }
    });
  }

  private buildContext(): string {
    const lines: string[] = [];
    lines.push(`Rôle de l'utilisateur : ${this.role}`);
    lines.push(`Nom : ${this.userName || 'non renseigné'}`);

    if (this.progression > 0) {
      lines.push(`Progression globale sur la plateforme : ${this.progression}%`);
    }

    if (this.formations && this.formations.length > 0) {
      lines.push(`Formations inscrites (${this.formations.length}) :`);
      this.formations.forEach((f, i) => {
        const titre = f.titre || '(sans titre)';
        const specialite = f.specialite ? ` — Spécialité : ${f.specialite}` : '';
        const debut = f.date_debut ? ` — Début : ${new Date(f.date_debut).toLocaleDateString('fr-FR')}` : '';
        const fin = f.date_fin ? ` — Fin : ${new Date(f.date_fin).toLocaleDateString('fr-FR')}` : '';
        const statut = f.statut ? ` — Statut : ${f.statut}` : '';
        const prix = f.prix != null ? ` — Prix : ${f.prix === 0 ? 'Gratuit' : f.prix + ' EUR'}` : '';
        lines.push(`  ${i + 1}. "${titre}"${specialite}${debut}${fin}${statut}${prix}`);
      });
    } else {
      lines.push('Formations inscrites : aucune pour le moment.');
    }

    return lines.join('\n');
  }

  clearChat() {
    this.initWelcome();
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatBody?.nativeElement) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    }, 80);
  }
}
