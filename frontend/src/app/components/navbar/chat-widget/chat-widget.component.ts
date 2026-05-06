import { Component, ElementRef, ViewChild } from '@angular/core';
import { AiService } from '../../../services/ai.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
interface Message {
  sender: 'user' | 'bot';
  text: string;
}

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent {

  messages: Message[] = [];
  userMessage: string = "";
  isOpen = false;
  isTyping = false;

  @ViewChild('chatBody') chatBody!: ElementRef;

  constructor(private aiService: AiService) {}

  toggleChat() {
    this.isOpen = !this.isOpen;

    // message d'accueil
    if (this.isOpen && this.messages.length === 0) {
      this.messages.push({
        sender: 'bot',
        text: 'Bonjour 👋 Je suis votre assistant IA. Comment puis-je vous aider ?'
      });
    }
  }

  send() {
    if (!this.userMessage.trim()) return;

    // message utilisateur
    this.messages.push({ sender: 'user', text: this.userMessage });

    const messageToSend = this.userMessage;
    this.userMessage = "";

    this.isTyping = true;

    // appel IA (simulation pour l’instant)
    this.aiService.sendMessage(messageToSend).subscribe(res => {
      this.isTyping = false;

      this.messages.push({
        sender: 'bot',
        text: res
      });

      this.scrollToBottom();
    });

    this.scrollToBottom();
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTop =
          this.chatBody.nativeElement.scrollHeight;
      }
    }, 100);
  }
}