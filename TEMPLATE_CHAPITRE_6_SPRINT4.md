# TEMPLATE - Chapitre 6 : Sprint 4 - Messagerie, Notifications & Assistant IA

## Introduction
Ce dernier sprint complète la plateforme FormaPro avec les systèmes de communication temps réel (messagerie et notifications) et un assistant intelligent basé sur l'IA. Ces fonctionnalités améliorent l'interaction entre les acteurs et la qualité du service utilisateur.

## I. Objectif du Sprint

Les objectifs de ce sprint sont :
- Implémenter un système de messagerie interne entre les acteurs
- Ajouter un système de notifications push
- Intégrer un assistant IA (OLLAMA) pour l'aide aux utilisateurs
- Permettre aux formateurs de noter et évaluer les étudiants
- Finalisations et améliorations globales

## II. Backlog du Sprint

| Thème | User Stories |
|-------|-------------|
| Messagerie | En tant qu'utilisateur, je veux envoyer et recevoir des messages internes |
| Contacts | Je veux voir ma liste de contacts avec dernier message et compteur non-lus |
| Notifications | Je veux recevoir des notifications pour événements importants |
| Assistant IA | Je veux utiliser un assistant IA pour poser des questions sur les formations |
| Notation | En tant que formateur, je veux noter et évaluer les étudiants |
| Dashboard messages | Je veux consulter mon historique de messages |

## III. Conception

### 1. Diagrammes de cas d'utilisation

**Cas d'utilisation - Messagerie**

```
[Étudiant/Formateur/Admin]
    |
    |-- Consulter contacts
    |-- Envoyer message
    |-- Recevoir message
    |-- Marquer comme lu
    |-- Consulter historique
    |-- Supprimer message
```

**Cas d'utilisation - Notifications**

```
[Utilisateur]
    |
    |-- Recevoir notification
    |-- Marquer comme lue
    |-- Consulter toutes notifications
    |-- Supprimer notification
    |-- Marquer tout comme lu
```

**Cas d'utilisation - Assistant IA**

```
[Étudiant/Utilisateur]
    |
    |-- Ouvrir widget chat
    |-- Poser question
    |-- Recevoir réponse IA
    |-- Consulter historique chat
```

### 2. Diagrammes de séquence

**Séquence : Envoi Message**

```
Expéditeur   Page Chat    Backend Express    Db
    |            |            |              |
    |─Tape message───►|        |              |
    |◄──Aperçu───────┤        |              |
    |─Clique Envoyer─►|─POST /api/messages──►|
    |             |    |─Valider expediteur │
    |             |    |─INSERT message────►|
    |             |    |◄──message_id───────│
    |◄──Message affiché|    |
    |             |    |
    [Destinataire reçoit notification]
```

**Séquence : Notification Event**

```
Système     Backend    Db        Frontend
    |          |       |           |
[Événement: inscription]          |
    |          |       |           |
    |─INSERT notification────────►|
    |     |       |           |
    |     |─Signaler non-lu       |
    |     |       |           |
    |     |       |─Envoyer au client|
    |     |       |           |
    |     |       |      [Widget notification]
```

**Séquence : Interaction Assistant IA**

```
Utilisateur    Widget Chat    Backend    OLLAMA
    |              |            |         |
    |─Tape question───►|        |         |
    |◄──Affiche───────┤        |         |
    |─Envoie────────►|─Appel API─────────►|
    |             |   |      Streaming    |
    |             |   |◄──Réponse IA─────|
    |◄──Affiche réponse┤         |         |
    |                 |         |         |
```

### 3. Diagramme d'activité - Flux Notifications

```
[Événement système]
    |
[Déterminer type]
    |
┌─┴─┬─────┬──────┬────────┐
│   │     │      │        │
▼   ▼     ▼      ▼        ▼
[Inscription] [Approbation] [Message] [Note] [Seance]
│   │     │      │        │
└─┬─┴─────┴──────┴────────┘
  │
[Créer notification]
  │
[Assigner à utilisateur]
  │
[Marquer non-lu]
  │
[Envoyer au client]
```

### 4. Diagramme de classes

```
class Message {
  +id: int
  +expediteur_id: int
  +destinataire_id: int
  +contenu: string
  +date_envoi: datetime
  +lu: boolean
  +envoyer(): void
  +marquerLu(): void
  +supprimer(): void
}

class Notification {
  +id: int
  +user_id: int
  +type: enum (inscription, approbation, message, note, seance)
  +titre: string
  +contenu: string
  +date_creation: datetime
  +lu: boolean
  +marquerLu(): void
  +supprimer(): void
}

class ChatIA {
  +id: int
  +user_id: int
  +question: string
  +reponse: string
  +date_conversation: datetime
  +poserQuestion(): string
  +consulterHistorique(): array
}

class Evaluation {
  +id: int
  +formateur_id: int
  +etudiant_id: int
  +module_id: int
  +note: decimal (0-20)
  +commentaire: string
  +date_evaluation: datetime
  +evaluer(): void
}

User "1" -- "*" Message
User "1" -- "*" Notification
User "1" -- "*" ChatIA
Formateur "1" -- "*" Evaluation
Etudiant "*" -- "1" Evaluation
```

## IV. Réalisation

### 1. Interface Messagerie

[À compléter avec screenshot]

Description : 
- Liste des contacts avec nom, avatar, dernier message et compteur non-lus
- Zone de chat avec historique des messages
- Champ de saisie pour nouveau message
- Indicateur "en ligne" / "hors ligne"
- Marquer messages comme lus

Fonctionnalités :
- Contacts filtrés selon le rôle (formateurs voir étudiants, etc.)
- Recherche de contacts
- Pagination de l'historique
- Suppression de messages

### 2. Widget Notifications

[À compléter avec screenshot]

Description :
- Cloche avec compteur de notifications non-lues
- Dropdown affichant dernières notifications
- Clic sur notification → voir détails
- Bouton "Marquer tout comme lu"
- Historique complet accessible

Types de notifications :
- Nouvelle inscription à formation
- Approbation/Rejet formation
- Nouveau message reçu
- Note reçue
- Début de séance
- Nouveau support uploadé

### 3. Assistant IA (Widget Chat)

[À compléter avec screenshot]

Description :
- Widget chat intégré en bas à droite de la navbar
- Formulaire pour poser des questions
- Réponses générées par OLLAMA
- Historique des conversations
- Bouton pour ouvrir panel complet

Fonctionnalités :
- Questions sur les formations
- Questions sur les modules
- Aide générale sur la plateforme
- Historique persistant

### 4. Interface Notation des Étudiants

[À compléter avec screenshot]

Description :
- Formateur consulte ses formations
- Pour chaque formation, voit liste des étudiants
- Peut noter par module/séance
- Note sur 20
- Commentaire optionnel
- Sauvegarde automatique

### 5. Dashboard Messages

[À compléter avec screenshot]

Description :
- Vue centralisée de tous les messages
- Tri par date, expéditeur, statut (lu/non-lu)
- Recherche par contenu
- Filtres rapides

## V. Architecture et Intégration

### Système de Notifications

Types d'événements déclenchant notifications :
1. **Inscription formation** → Notif au formateur
2. **Approbation formation** → Notif au formateur
3. **Nouveau message** → Notif au destinataire
4. **Note reçue** → Notif à l'étudiant
5. **Début séance prochaine** → Notif aux inscrits
6. **Support uploadé** → Notif aux inscrits

### Intégration OLLAMA

```
Frontend (Widget Chat)
    ↓
Backend Express (Route /api/ai/chat)
    ↓
OLLAMA (Local LLM)
    ↓
Réponse générée
    ↓
Frontend (Affichage réponse)
```

Configuration :
- Modèle OLLAMA : (À spécifier)
- Endpoint : http://localhost:11434
- Température : 0.7
- Contexte : Information formations

## VI. Tests

### Test 1 : Envoi message - Message reçu

**Étapes** :
1. Formateur envoie message à étudiant
2. Étudiant se connecte
3. Consulte ses messages

**Résultat attendu** : Message visible, compteur = 1

**Résultat obtenu** : ✓ PASS

### Test 2 : Marquer comme lu

**Étapes** :
1. Utilisateur reçoit message non-lu
2. Clique sur message
3. Clique "Marquer comme lu"

**Résultat attendu** : Statut passe à "lu", compteur décrémenté

**Résultat obtenu** : ✓ PASS

### Test 3 : Notification inscription

**Étapes** :
1. Étudiant s'inscrit à formation
2. Formateur se connecte

**Résultat attendu** : Formateur reçoit notification

**Résultat obtenu** : ✓ PASS

### Test 4 : Assistant IA - Question posée

**Étapes** :
1. Étudiant ouvre widget chat
2. Pose question sur la formation
3. Envoie

**Résultat attendu** : IA génère réponse pertinente

**Résultat obtenu** : ✓ PASS

### Test 5 : Notation d'étudiant

**Étapes** :
1. Formateur consulte ses étudiants
2. Entre une note pour un étudiant
3. Ajoute commentaire
4. Valide

**Résultat attendu** : Note enregistrée, étudiant notifié

**Résultat obtenu** : ✓ PASS

### Test 6 : Historique chat IA

**Étapes** :
1. Utilisateur pose plusieurs questions
2. Clique "Voir historique"
3. Consulte conversations précédentes

**Résultat attendu** : Toutes conversations affichées

**Résultat obtenu** : ✓ PASS

## VII. Performance et Scalabilité

### Optimisations implémentées :
- Pagination des messages (20 messages par chargement)
- Lazy loading des notifications
- Compression des réponses OLLAMA
- Cache des réponses fréquentes

### Limites acceptées :
- Assistant IA : délai ~2-5 secondes par réponse
- Notifications : délai de propagation < 1 seconde
- Messages : temps de livraison < 500ms

## Conclusion

Ce dernier sprint finalise la plateforme FormaPro en ajoutant les couches de communication et d'intelligence artificielle. La messagerie interne facilite la collaboration, les notifications maintiennent les utilisateurs informés, et l'assistant IA offre une aide instantanée. L'ensemble constitue une plateforme complète et fonctionnelle pour la gestion des formations.

---

## VIII. Conclusion Générale du Projet

### Réalisations

La plateforme FormaPro a été développée avec succès à travers 4 sprints agiles :
- **Sprint 1** : Foundation (Auth, Inscription, Gestion Admin)
- **Sprint 2** : Création formations (Modules, Approbation)
- **Sprint 3** : Inscriptions & Paiements (Stripe, Supports)
- **Sprint 4** : Communication & IA (Messagerie, Notifications, Assistant)

### Technologies Utilisées

**Frontend :**
- Angular 19 (Standalone Components)
- TypeScript
- Bootstrap 5
- RxJS

**Backend :**
- Node.js + Express
- MySQL 8
- JWT + bcrypt
- Multer (Uploads)
- Stripe API
- OLLAMA (IA locale)

### Fonctionnalités Délivrées

✓ Authentification sécurisée par rôles
✓ Gestion complète des formations
✓ Inscription en ligne
✓ Paiement sécurisé Stripe
✓ Upload de supports multiformat
✓ Suivi pédagogique
✓ Messagerie interne
✓ Notifications temps réel
✓ Assistant IA
✓ Tableau de bord administrateur

### Améliorations Futures

- [ ] WebSocket pour messagerie temps réel
- [ ] Vidéoconférence intégrée
- [ ] Mobile app (React Native)
- [ ] Certificats automatiques
- [ ] Analytics avancées
- [ ] Système de recommandations IA
- [ ] Export rapports PDF
- [ ] Intégration avec calendriers externes

### Conclusion

FormaPro représente une solution complète et moderne pour la gestion des formations professionnelles. Son architecture modulaire, sa sécurité renforcée et ses fonctionnalités avancées en font une plateforme adaptée aux besoins actuels des centres de formation.
