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

    // Add role context once at the start of each user message if history is short
    const contextualHistory: OllamaMessage[] = this.history.length === 1 && this.role
      ? [{ role: 'user', content: `[Contexte: je suis un ${this.role}, mon nom est ${this.userName || 'inconnu'}] ${text}` }]
      : this.history;

    this.aiService.chat(contextualHistory).subscribe({
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
