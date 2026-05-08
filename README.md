# Plateforme de Gestion des Formations

Application web complète de gestion des formations professionnelles, développée dans le cadre d'un projet de fin d'études (PFE).

## Description

La plateforme permet de gérer l'ensemble du cycle de vie des formations : création, publication, inscription, suivi de présence, progression pédagogique et paiement. Elle prend en charge quatre types d'utilisateurs avec des espaces dédiés : administrateur, formateur, étudiant et participant externe.

## Fonctionnalités

### Administrateur
- Gestion des comptes utilisateurs (étudiants, formateurs, externes)
- Validation et publication des formations
- Suivi des statistiques globales (inscriptions, présences, revenus)
- Messagerie interne

### Formateur
- Création et gestion des formations (modules, séances, supports)
- Suivi de la présence et de la progression des étudiants
- Notation et questions/réponses
- Messagerie interne

### Étudiant
- Inscription aux formations disponibles
- Suivi de sa progression et de ses présences
- Accès aux supports pédagogiques
- Messagerie et assistant IA intégré

### Participant externe
- Inscription aux formations avec paiement en ligne (Stripe)
- Suivi de ses formations
- Messagerie et assistant IA intégré

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 20 (standalone components) + Bootstrap 5 |
| Backend | Express.js 5 + Node.js |
| Base de données | MySQL / MariaDB |
| Authentification | JWT (jsonwebtoken + bcrypt) |
| Paiement | Stripe |
| IA | Ollama (modèle Mistral en local) |

## Structure du projet

```
projet_pfe/
├── backend/                  # API REST Express.js
│   ├── routes/               # Routes par domaine
│   │   ├── auth.routes.js
│   │   ├── admin.routes.js
│   │   ├── formateur.routes.js
│   │   ├── etudiant.routes.js
│   │   ├── externe.routes.js
│   │   ├── formation.routes.js
│   │   ├── messages.routes.js
│   │   ├── notifications.routes.js
│   │   └── questions.routes.js
│   ├── middleware/           # JWT auth middleware
│   ├── uploads/              # Fichiers uploadés (ignoré par git)
│   ├── server.js             # Point d'entrée
│   └── .env                  # Variables d'environnement (non versionné)
│
├── frontend/                 # Application Angular 20
│   ├── src/app/
│   │   ├── pages/            # Composants de page
│   │   │   ├── home/
│   │   │   ├── login/
│   │   │   ├── inscription/
│   │   │   ├── admin/
│   │   │   ├── formateur/
│   │   │   ├── etudiant/
│   │   │   └── externe/
│   │   ├── components/       # Composants partagés (navbar, chat-widget)
│   │   ├── services/         # Services Angular
│   │   └── guards/           # Guards de navigation
│   └── ...
│
└── gestion_formations.sql    # Dump de la base de données
```

## Installation

### Prérequis

- Node.js 18+
- MySQL 8 ou MariaDB 10.4+
- Angular CLI 20 : `npm install -g @angular/cli`
- [Ollama](https://ollama.com) (optionnel, pour l'assistant IA)

### Base de données

```sql
CREATE DATABASE gestion_formations;
```

Importer le dump :
```bash
mysql -u root -p gestion_formations < "gestion_formations (1).sql"
```

### Backend

```bash
cd backend
npm install
```

Créer le fichier `.env` :
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=gestion_formations
JWT_SECRET=your_secret_key_32_chars_minimum
CORS_ORIGIN=http://localhost:4200
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=eur
BACKEND_URL=http://localhost:3000
APP_URL=http://localhost:4200
```

Démarrer le serveur :
```bash
npm start
```
L'API sera disponible sur `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm start
```
L'application sera disponible sur `http://localhost:4200`.

## Assistant IA (Ollama)

L'assistant IA est intégré dans les dashboards étudiant et externe. Il fonctionne avec Ollama en local.

**Installation et démarrage :**

```powershell
# 1. Installer Ollama : https://ollama.com/download

# 2. Télécharger le modèle
ollama pull mistral

# 3. Démarrer le serveur avec CORS activé (Windows PowerShell)
$env:OLLAMA_ORIGINS = "*"
ollama serve
```

Ollama écoute sur `http://localhost:11434`.

## Rôles et accès

| Rôle | URL de connexion |
|------|-----------------|
| Administrateur | `/admin-login` |
| Formateur | `/login` |
| Étudiant | `/login` |
| Externe | `/login` |

## Auteur

Projet de fin d'études — Samiaa Amara
