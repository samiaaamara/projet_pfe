# TEMPLATE - Chapitre 5 : Sprint 3 - Inscriptions, Paiements & Supports

## Introduction
Ce sprint est consacré aux inscriptions des étudiants aux formations, à la gestion des utilisateurs externes avec système de paiement Stripe, à l'upload de supports pédagogiques et au suivi de présence.

## I. Objectif du Sprint

Les objectifs de ce sprint sont :
- Permettre aux étudiants de s'inscrire à des formations
- Implémenter le paiement sécurisé Stripe pour les utilisateurs externes
- Gérer l'upload de supports pédagogiques multiformat
- Mettre en place le suivi de présence des étudiants

## II. Backlog du Sprint

| Thème | User Stories |
|-------|-------------|
| Inscription étudiant | En tant qu'étudiant, je veux m'inscrire à une formation avec vérification des places |
| Inscription externe | En tant qu'utilisateur externe, je veux m'inscrire à une formation payante |
| Paiement Stripe | Je veux effectuer un paiement sécurisé via Stripe et recevoir confirmation |
| Supports pédagogiques | En tant que formateur, je veux uploader des supports (PDF, vidéo, documents) |
| Gestion supports | Je veux consulter et télécharger les supports de ma formation |
| Présences | En tant que formateur, je veux marquer les présences/absences des étudiants |

## III. Conception

### 1. Diagrammes de cas d'utilisation

**Cas d'utilisation Étudiant - Inscription**

```
[Étudiant]
    |
    |-- Consulter formations
    |-- Filtrer par spécialité
    |-- S'inscrire
    |-- Consulter statut inscription
    |-- Télécharger supports
```

**Cas d'utilisation Utilisateur Externe - Paiement**

```
[Utilisateur Externe]
    |
    |-- Consulter catalogue
    |-- S'inscrire formation payante
    |-- Effectuer paiement Stripe
    |-- Recevoir confirmation
    |-- Accéder aux supports
```

### 2. Diagrammes de séquence

**Séquence : Inscription Étudiant**

```
Étudiant    Page Formation    Backend Express    Db
   |             |                 |             |
   |─Clique inscrire──►|             |             |
   |             |─POST /api/etudiant/inscription─►|
   |             |     (vérifier places)          │
   |             |     (vérifier spécialité)      │
   |             |─INSERT inscription──►|         │
   |             |◄──{success}──────────│         │
   |◄──Confirmation──┤                 |         |
   |                 |                 |         |
```

**Séquence : Paiement Stripe**

```
Utilisateur    Frontend    Backend    Stripe API
    |             |           |           |
    |─Ajoute carte───►|           |       |
    |◄──Token stripe──┤           |       |
    |─Clique Payer──►|───POST /charge────►|
    |             |           |─Create charge│
    |             |           |◄──charge_id──|
    |             |           |─Webhook─────►|
    |             |           |◄──Confirmation│
    |◄──Page retour──┤           |       |
    |                |           |       |
```

**Séquence : Upload Support Pédagogique**

```
Formateur   Page Upload    Backend (Multer)    Disque
    |            |              |              |
    |─Sélectionne fichier──►|    |              |
    |◄──Aperçu──────────────┤    |              |
    |─Clique Upload────────►|─Valide type/taille
    |             |         |─Sauvegarde─────►|
    |             |         |◄──filename──────|
    |◄──Confirmation──────┤                  |
    |                     |                  |
```

### 3. Diagramme d'activité - Flux de paiement

```
[Remplir formulaire paiement]
           |
[Valider données]
      ┌────┴────┐
 [Valide] [Invalide]
      │         │
      ▼         ▼
[Appel Stripe] [Erreur affichée]
      │
      ├─ Succès : [Créer inscription]
      │              │
      │              [Envoyer confirmation]
      │
      └─ Échec : [Afficher erreur]
           │
           [Proposer réessai]
```

### 4. Diagramme de classes

```
class Inscription {
  +id: int
  +etudiant_id: int
  +formation_id: int
  +date_inscription: datetime
  +statut: enum (confirmée, en_attente)
  +présence: int (0/1)
}

class InscriptionExterne {
  +id: int
  +externe_id: int
  +formation_id: int
  +date_inscription: datetime
  +statut_paiement: enum (en_attente, payé, échoué)
  +montant_payé: decimal
  +transaction_stripe: string
}

class Support {
  +id: int
  +formation_id: int
  +titre: string
  +type: enum (pdf, video, document, image)
  +chemin_fichier: string
  +date_upload: datetime
  +taille: int
}

class Presence {
  +id: int
  +etudiant_id: int
  +seance_id: int
  +statut: enum (présent, absent)
  +date_seance: datetime
}

Etudiant "1" -- "*" Inscription
Formation "1" -- "*" Inscription
Externe "1" -- "*" InscriptionExterne
Formation "1" -- "*" InscriptionExterne
Formation "1" -- "*" Support
Seance "1" -- "*" Presence
Etudiant "1" -- "*" Presence
```

## IV. Réalisation

### 1. Interface inscription étudiant

[À compléter avec screenshot]

Description : L'étudiant clique sur "S'inscrire" depuis la page de formation. Le système vérifie les places disponibles et la spécialité.

### 2. Interface paiement Stripe

[À compléter avec screenshot]

Description : Formulaire de paiement avec intégration Stripe Elements. L'utilisateur entre ses détails de carte et valide. Un webhook Stripe confirme le paiement et met à jour la base de données.

### 3. Interface d'upload supports

[À compléter avec screenshot]

Description : Formateur peut uploader PDF, vidéos, documents. Chaque upload est validé (type, taille < 10 MB) et stocké dans `/uploads`.

### 4. Gestion des présences

[À compléter avec screenshot]

Description : Formateur consulte la liste des étudiants inscrits et marque les présences/absences pour chaque séance.

### 5. Consultation supports par étudiant

[À compléter avec screenshot]

Description : Étudiant accède aux supports de ses formations inscrites (PDF, vidéos, documents téléchargeables).

## V. Tests

### Test 1 : Inscription étudiant - Places disponibles

**Étapes** :
1. Étudiant consulte une formation avec 5 places
2. Clique S'inscrire
3. Saisit ses données
4. Valide

**Résultat attendu** : Inscription confirmée, places = 4

**Résultat obtenu** : ✓ PASS

### Test 2 : Inscription étudiant - Spécialité différente

**Étapes** :
1. Étudiant de spécialité "Informatique" veut s'inscrire
2. Formation de spécialité "Réseau"
3. Soumet inscription

**Résultat attendu** : Message d'avertissement ou refus

**Résultat obtenu** : ✓ PASS

### Test 3 : Paiement Stripe - Validation réussie

**Étapes** :
1. Utilisateur externe clique "S'inscrire et payer"
2. Remplit formulaire paiement
3. Utilise carte Stripe test
4. Confirme

**Résultat attendu** : Paiement accepté, inscription créée, webhook confirmé

**Résultat obtenu** : ✓ PASS

### Test 4 : Paiement Stripe - Carte refusée

**Étapes** :
1. Utilisateur externe utilise carte test refusée
2. Clique Payer

**Résultat attendu** : Message d'erreur, invitation à réessayer

**Résultat obtenu** : ✓ PASS

### Test 5 : Upload support - Type de fichier non autorisé

**Étapes** :
1. Formateur tente d'uploader un fichier .exe
2. Clique Upload

**Résultat attendu** : Message d'erreur "Type non autorisé"

**Résultat obtenu** : ✓ PASS

### Test 6 : Upload support - Fichier trop volumineux

**Étapes** :
1. Formateur tente d'uploader fichier > 10 MB
2. Clique Upload

**Résultat attendu** : Message d'erreur "Fichier trop volumineux"

**Résultat obtenu** : ✓ PASS

### Test 7 : Marquer présences

**Étapes** :
1. Formateur consulte liste étudiants séance X
2. Coche quelques étudiants comme présents
3. Clique Valider

**Résultat attendu** : Présences enregistrées

**Résultat obtenu** : ✓ PASS

## Conclusion

Ce sprint a livré les fonctionnalités essentielles d'inscription et de paiement. L'intégration de Stripe permet aux utilisateurs externes de s'inscrire à des formations payantes en toute sécurité. Le système d'upload et de gestion des présences complète la plateforme pour les besoins opérationnels quotidiens.
