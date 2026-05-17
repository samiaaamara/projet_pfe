# TEMPLATE - Chapitre 4 : Sprint 2 - Gestion des Formations

## Introduction
Ce chapitre présente le deuxième sprint de FormaPro, focalisé sur la création et la gestion des formations par les formateurs, ainsi que sur le processus d'approbation et de publication par les administrateurs.

## I. Objectif du Sprint
Les objectifs de ce sprint sont :
- Permettre aux formateurs de créer et gérer des formations
- Implémenter un système de modules et de séances
- Mettre en place un workflow d'approbation des formations
- Permettre à l'administrateur de publier les formations validées

## II. Backlog du Sprint

### PBI 12-15 : Gestion formations Formateur

| Thème | User Stories |
|-------|-------------|
| Création formation | En tant que formateur, je veux créer une formation avec titre, description, durée, prix, places disponibles |
| Modules & Programme | En tant que formateur, je veux ajouter des modules et définir le programme pédagogique |
| Séances | En tant que formateur, je veux créer des séances avec date, heure, durée |
| Soumission approbation | En tant que formateur, je veux soumettre ma formation à l'approbation de l'admin |
| Approbation admin | En tant qu'admin, je veux approuver ou rejeter les formations en attente |
| Publication | En tant qu'admin, je veux publier les formations approuvées dans le catalogue |

### PBI 22 : Gestion formations Admin (US30-32)

| Thème | User Stories |
|-------|-------------|
| Consulter formations | US29 : En tant qu'admin, je veux consulter toutes les formations |
| Créer formation directement | US30 : En tant qu'admin, je veux créer une formation directement et assigner un formateur |
| Modifier formation | US31 : En tant qu'admin, je veux modifier les détails d'une formation |
| Supprimer formation | US32 : En tant qu'admin, je veux supprimer une formation |

## III. Conception

### 1. Diagrammes de cas d'utilisation

**Cas d'utilisation Formateur - Gestion des formations (Sprint 1)**

```
[Formateur]
    |
    |-- Créer formation (brouillon)
    |-- Ajouter modules
    |-- Gérer séances
    |-- Uploader supports
    |-- Soumettre pour approbation
    |-- Consulter statut
```

**Cas d'utilisation Administrateur - Gestion formations (Sprint 2)**

```
[Administrateur]
    |
    |-- Consulter formations
    |-- Créer formation directement ← NOUVEAU
    |-- Assigner formateur ← NOUVEAU
    |-- Modifier formation
    |-- Supprimer formation
    |-- Approuver/Rejeter formation
    |-- Publier formation
    |-- Consulter statistiques
```

**Figure 4.1 : Cas d'utilisation - Admin Crée Formation**

[À insérer : Sprint2_Admin_CasUtilisation_CreerFormation.png]

Ce diagramme illustre les étapes pour qu'un administrateur crée directement une formation dans le système. Contrairement aux formateurs qui créent des formations en brouillon puis demandent approbation, l'administrateur peut créer une formation entièrement formée et directement assigner un formateur responsable.

### 2. Diagrammes de séquence

**Figure 4.2a : Séquence - Création formation par Formateur**

```
Formateur   Page Création   Backend Express   Base Données
    |           |               |                 |
    |─Clique───►|               |                 |
    |◄──Form───┤               |                 |
    |─Soumet───►|─POST /api/formations────────────►|
    |           |               |─INSERT formation|
    |           |               |◄──formation_id──|
    |           |◄──{success}───|                 |
    |◄──Redirect┤               |                 |
```

**Figure 4.2b : Séquence - Création formation par Admin**

[À insérer : Sprint2_Admin_Sequence_CreerFormation.png]

Ce diagramme détaille l'interaction entre l'administrateur, le frontend et le backend lors de la création d'une formation. Le processus débute quand l'administrateur clique sur "Créer Formation". Le frontend reçoit la liste des formateurs disponibles via un appel API `GET /api/admin/formateurs`. L'administrateur remplit le formulaire et sélectionne un formateur. À la soumission, le backend valide les données, crée l'entrée dans la table `formations` avec `formateur_id` assigné, crée automatiquement un enregistrement dans `programme_formations`, et retourne un message de succès.

### 3. Diagramme de classes (Mise à jour)

```
class Formation {
  +id: int
  +formateur_id: int
  +titre: string
  +description: string
  +specialite: string
  +durée: int
  +prix: decimal
  +places_disponibles: int
  +date_debut: datetime
  +date_fin: datetime
  +status: enum (brouillon, en_attente, approuvée, publiée)
  +créé_par_admin: boolean
  +créer()
  +modifier()
  +soumettre()
  +approuver()
  +publier()
}

class Module {
  +id: int
  +formation_id: int
  +titre: string
  +description: string
  +objectifs: string
  +durée: int
  +ordre: int
}

class Seance {
  +id: int
  +module_id: int
  +date: datetime
  +durée: int
  +salle: string
  +heure_debut: time
  +heure_fin: time
}

class Programme {
  +id: int
  +formation_id: int
  +description_globale: text
  +objectifs: text
  +prerequis: text
}

Formation "1" -- "*" Module
Formation "1" -- "1" Programme
Module "1" -- "*" Seance
```

**Figure 4.3 : Diagramme d'Activité - Admin Crée Formation**

[À insérer : Sprint2_Admin_Activite_CreerFormation.png]

Ce diagramme représente le flux d'exécution du processus de création de formation par l'administrateur. Il montre les décisions critiques et les étapes clés : validation des données, vérification du formateur, création en base de données, et affichage du message de succès.

## IV. Réalisation

### 1. Interface de création de formation (Formateur)

[À compléter avec screenshot]

Description : L'interface permet au formateur de créer une formation avec tous les détails nécessaires. Les champs incluent titre, description, spécialité, durée, prix, places disponibles et dates. La formation est créée avec statut "brouillon" et doit être soumise à l'approbation de l'administrateur.

Validation :
- Titre : obligatoire, max 255 caractères
- Description : obligatoire
- Prix : doit être >= 0
- Places : doit être > 0
- Dates : date_fin > date_début
- Spécialité : obligatoire

### 1b. Interface de création de formation (Admin)

[À compléter avec screenshot]

Description : L'interface permet à l'administrateur de créer une formation directement pour n'importe quel formateur. Contrairement aux formateurs, l'admin peut choisir le formateur responsable parmi une liste déroulante. La formation est créée directement avec le statut "brouillon" et ne nécessite pas d'approbation.

Fonctionnalités spécifiques :
- Liste déroulante pour sélectionner le formateur responsable
- Même champs que le formateur (titre, description, prix, places, dates, spécialité)
- Création directe en base de données
- Notification au formateur assigné

### 2. Interface de gestion des modules

[À compléter avec screenshot]

Description : L'interface permet d'ajouter et de gérer les modules d'une formation, ainsi que de définir le programme pédagogique.

### 3. Interface d'approbation (Admin)

[À compléter avec screenshot]

Description : L'administrateur peut consulter la liste des formations en attente, voir les détails, et les approuver ou rejeter avec commentaires.

### 4. Interface de publication

[À compléter avec screenshot]

Description : Les formations approuvées s'affichent avec la possibilité de les publier dans le catalogue public.

## V. Tests

### Test 1 : Formateur crée une formation avec données valides

**Étapes** :
1. Formateur se connecte
2. Clique sur "Créer une formation"
3. Remplit tous les champs (titre, description, prix, places, dates, spécialité)
4. Clique "Soumettre"

**Résultat attendu** : Formation créée avec statut "brouillon"

**Résultat obtenu** : ✓ PASS

### Test 2 : Soumettre sans remplir champs obligatoires

**Étapes** :
1. Formateur tente de créer une formation sans titre
2. Soumet le formulaire

**Résultat attendu** : Message d'erreur sur le champ "Titre"

**Résultat obtenu** : ✓ PASS

### Test 3 : Admin approuve une formation

**Étapes** :
1. Admin se connecte
2. Consulte formations en attente
3. Clique "Approuver"
4. Remplit les commentaires
5. Confirme

**Résultat attendu** : Statut passe à "approuvée"

**Résultat obtenu** : ✓ PASS

### Test 4 : Admin crée une formation directement

**Étapes** :
1. Admin se connecte au dashboard
2. Va à "Gestion Formations"
3. Clique "Créer une nouvelle formation"
4. Le système affiche formulaire avec liste de formateurs
5. Admin remplit : titre, description, prix, places, dates, spécialité
6. Admin sélectionne un formateur dans la liste déroulante
7. Clique "Créer formation"

**Résultat attendu** : Formation créée avec statut "brouillon", formateur assigné, programme_formations créé automatiquement

**Résultat obtenu** : ✓ PASS

### Test 5 : Admin crée formation sans sélectionner formateur

**Étapes** :
1. Admin tente de créer une formation sans sélectionner de formateur
2. Clique "Créer formation"

**Résultat attendu** : Message d'erreur "Veuillez sélectionner un formateur"

**Résultat obtenu** : ✓ PASS

### Test 6 : Vérification que formateur est assigné

**Étapes** :
1. Admin crée une formation et assigne formateur "Ahmed Ben"
2. Formateur "Ahmed Ben" se connecte
3. Consulte ses formations

**Résultat attendu** : La nouvelle formation apparaît dans sa liste, avec statut "brouillon"

**Résultat obtenu** : ✓ PASS

## VI. Comparaison Formateur vs Admin

| Aspect | Formateur | Admin |
|--------|-----------|-------|
| **Qui crée** | Formateur (lui-même) | Admin (pour n'importe quel formateur) |
| **Statut initial** | "brouillon" | "brouillon" |
| **Approbation requise** | OUI (par admin) | NON (création directe) |
| **Peut assigner formateur** | NON (auto-assigné) | OUI (parmi liste) |
| **Accès** | Page formateur | Dashboard admin |
| **Permission** | role='formateur' | role='admin' |
| **Prochaine étape** | Soumettre pour approbation | Ajouter modules directement |

## VII. API Endpoints

### Admin crée formation

```http
POST /api/admin/formations
Authorization: Bearer {token_admin}

Body :
{
  "titre": "Angular Avancé",
  "description": "Formation complète Angular 19",
  "specialite": "Informatique",
  "formateur_id": 1,
  "prix": 500.00,
  "places_disponibles": 30,
  "date_debut": "2026-06-01",
  "date_fin": "2026-07-01"
}

Response 200 OK :
{
  "success": true,
  "message": "Formation créée avec succès",
  "formation": {
    "id": 15,
    "titre": "Angular Avancé",
    "formateur_id": 1,
    "status": "brouillon"
  }
}
```

### Admin récupère liste formateurs

```http
GET /api/admin/formateurs
Authorization: Bearer {token_admin}

Response 200 OK :
[
  {"id": 1, "nom": "Ahmed Ben", "specialite": "Informatique"},
  {"id": 2, "nom": "Fatima Slim", "specialite": "Réseaux"},
  {"id": 3, "nom": "Mohamed Ali", "specialite": "Gestion"}
]
```

## Conclusion

Ce sprint a permis de mettre en place le cœur du système de gestion des formations avec le workflow d'approbation. Les formateurs peuvent créer et structurer leurs formations en attente d'approbation, tandis que les administrateurs disposent de deux modes de gestion :

1. **Mode validation** : Approuver ou rejeter les formations soumises par les formateurs
2. **Mode création directe** : Créer des formations directement et assigner les formateurs responsables

Cette flexibilité permet à l'administration d'avoir un contrôle complet sur le catalogue des formations.
