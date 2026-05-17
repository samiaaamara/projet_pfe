# ✅ FONCTIONNALITÉ MANQUANTE — Admin Crée Formation + Assigne Formateur

## 🎯 Contexte

**Votre rapport oublie une fonctionnalité importante :**

L'administrateur peut **créer directement une formation** et **assigner un formateur** à celle-ci.

C'est documenté dans le backlog :
- **PBI 22** : Gestion formations (CRUD)
  - **US30** : Créer une formation directement
  - **US31** : Modifier une formation
  - **US32** : Supprimer une formation

Planification Sprint :
- **Sprint 2** : Comprend PBI 22 (Gestion formations admin)

---

## 📍 OÙ L'AJOUTER DANS LE RAPPORT

### Localisation
**Chapitre 4 : Sprint 2**
Section : **Conception - Cas d'Utilisation Admin**

### Avant
Actuellement il y a :
- Créer des formations (par formateur)
- Modifier des formations
- Approuver/Rejeter des formations

### À Ajouter
- **Créer des formations DIRECTEMENT par admin** ← NOUVEAU
- Assigner formateur à la formation
- Voir formulaire simplifié par rapport au formateur

---

## 📊 Les 3 Diagrammes PlantUML Créés

### 1️⃣ Cas d'Utilisation (Figure X.1)
**Fichier** : `Sprint2_Admin_CasUtilisation_CreerFormation.puml`

Montre le flux complet :
- Admin se connecte
- Accède au dashboard
- Va section Formations
- Crée nouvelle formation
- Sélectionne formateur
- Confirme création

### 2️⃣ Séquence (Figure X.2)
**Fichier** : `Sprint2_Admin_Sequence_CreerFormation.puml`

Montre l'interaction système :
- Admin clique "Créer Formation"
- Reçoit formulaire avec liste de formateurs
- Soumet données + sélection formateur
- Backend valide formateur
- Crée formation + programme
- Retourne succès

### 3️⃣ Activité (Figure X.3)
**Fichier** : `Sprint2_Admin_Activite_CreerFormation.puml`

Montre la logique décisionnelle :
- Remplissage du formulaire
- Sélection du formateur
- Validations
- Création en base de données

---

## 📝 DESCRIPTION POUR LE RAPPORT

### Cas d'Utilisation

**Titre** : Cas d'Utilisation — Admin Crée une Formation

**Description à ajouter** :

Ce diagramme illustre les étapes pour qu'un administrateur crée directement une formation dans le système. Contrairement aux formateurs qui créent des formations en brouillon puis demandent approbation, l'administrateur peut créer une formation entièrement formée et directement assigner un formateur responsable. Les étapes incluent :

1. Authentification administrative
2. Accès au dashboard administrateur
3. Navigation vers la section Formations
4. Clic sur "Créer une nouvelle formation"
5. Remplissage du formulaire (titre, description, spécialité, prix, places disponibles)
6. Sélection du formateur responsable parmi la liste disponible
7. Validation et création
8. Confirmation et affichage de la formation créée

### Séquence

**Titre** : Diagramme de Séquence — Création Formation par Admin

**Description à ajouter** :

Ce diagramme détaille l'interaction entre l'administrateur, le frontend et le backend lors de la création d'une formation. Le processus débute quand l'administrateur clique sur "Créer Formation". Le frontend reçoit la liste des formateurs disponibles via un appel API `GET /api/admin/formateurs`. L'administrateur remplit le formulaire et sélectionne un formateur. 

À la soumission :
1. Le frontend valide les données localement
2. Envoie une requête POST `/api/admin/formations` avec titre, description, formateur_id, prix, places et spécialité
3. Le backend vérifie l'authentification (admin uniquement)
4. Valide que le formateur existe
5. Crée l'entrée dans la table `formations` avec `formateur_id` assigné
6. Crée automatiquement un enregistrement dans `programme_formations`
7. Retourne un message de succès

La formation est créée avec le statut "brouillon" et est prête à recevoir des modules et des séances.

### Activité

**Titre** : Diagramme d'Activité — Création Formation par Admin

**Description à ajouter** :

Ce diagramme représente le flux d'exécution du processus de création de formation par l'administrateur. Il montre les décisions critiques et les étapes clés :

1. L'administrateur accède au dashboard
2. Clique sur "Créer une nouvelle formation"
3. Le système affiche un formulaire pré-rempli
4. L'admin remplit les champs obligatoires (titre, description, spécialité, prix, places disponibles)
5. **Sélectionne un formateur** parmi ceux disponibles
6. Clique sur "Créer"
7. Le système valide les données
8. **Point de décision** : Les champs sont-ils valides ?
   - Si non : affiche les erreurs, l'admin corrige
   - Si oui : continue
9. Le backend valide que le formateur sélectionné existe
10. **Point de décision** : Le formateur est-il valide ?
    - Si non : affiche erreur "Formateur introuvable"
    - Si oui : continue
11. Crée la formation en base de données
12. Assigne le formateur à la formation
13. Crée le programme de formation
14. Affiche message de succès
15. La formation apparaît dans la liste

---

## 🎬 SCÉNARIOS DE CAS D'UTILISATION

### Scénario Principal : Création Formation Admin

| Aspect | Détail |
|--------|--------|
| **Titre** | Créer une formation directement (Admin) |
| **Acteur** | Administrateur |
| **Objectif** | Créer une nouvelle formation et assigner un formateur responsable |
| **Préconditions** | L'admin est authentifié et connecté au dashboard. Au moins un formateur existe dans le système. |
| **Scénario nominal** | 1. L'admin accède à "Gestion Formations" 2. Clique "Créer une formation" 3. Le système affiche formulaire avec liste formateurs 4. L'admin remplit : titre, description, spécialité, prix, places, date début/fin 5. L'admin sélectionne un formateur 6. Clique "Créer formation" 7. Système valide 8. Formation créée avec statut "brouillon" 9. Formateur assigné 10. Message succès |
| **Scénario alternatif** | 5a. Si champ obligatoire vide : erreur affichée 5b. Si formateur invalide : erreur affichée |
| **Post-condition** | Formation créée en base de données. Formateur peut commencer à ajouter des modules. Admin peut modifier ou supprimer la formation. |

---

## 🗄️ STRUCTURE BASE DE DONNÉES CONCERNÉE

```sql
-- Table formations avec formateur_id
CREATE TABLE formations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  formateur_id      INT NOT NULL,           ← FORMATEUR ASSIGNÉ
  titre             VARCHAR(255) NOT NULL,
  description       TEXT,
  specialite        VARCHAR(100),
  prix              DECIMAL(10,2),
  places_disponibles INT,
  status            ENUM('draft', 'en_attente', 'approuvée', 'publiée'),
  date_debut        DATETIME,
  date_fin          DATETIME,
  FOREIGN KEY (formateur_id) REFERENCES formateurs(id)
);

-- Table programme créée automatiquement
CREATE TABLE programme_formations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  formation_id        INT NOT NULL,
  description_globale TEXT,
  objectifs           TEXT,
  prerequis           TEXT,
  UNIQUE KEY uq_prog_formation (formation_id),
  FOREIGN KEY (formation_id) REFERENCES formations(id)
);
```

---

## 🔌 ENDPOINTS API REQUIS

### GET : Lister les formateurs
```
GET /api/admin/formateurs

Response :
[
  {id: 1, nom: "Ahmed Ben", specialite: "Informatique"},
  {id: 2, nom: "Fatima Slim", specialite: "Réseaux"},
  ...
]
```

### POST : Créer une formation (Admin)
```
POST /api/admin/formations

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

Response :
{
  "success": true,
  "message": "Formation créée avec succès",
  "formation": {id: 15, ...}
}
```

---

## ✅ COMPARAISON : Formation par Formateur vs Formation par Admin

| Aspect | Formateur | Admin |
|--------|-----------|-------|
| **Qui crée** | Formateur (lui-même) | Admin (pour n'importe quel formateur) |
| **Statut initial** | "brouillon" | "brouillon" |
| **Approbation requise** | OUI (par admin) | NON (direct) |
| **Peut assigner formateur** | NON (auto-assigné) | OUI (parmi liste) |
| **Accès** | Page formateur | Dashboard admin |
| **Permission** | role='formateur' | role='admin' |

---

## 📋 CHECKLIST D'INTÉGRATION AU RAPPORT

### Dans Sprint 2 - Conception

- [ ] Ajouter section "Cas d'Utilisation Admin - Gestion Formations"
- [ ] Insérer 3 diagrammes PlantUML (cas d'utilisation, séquence, activité)
- [ ] Ajouter descriptions pour chaque diagramme
- [ ] Ajouter tableau "Backlog du Sprint 2" avec US30, US31, US32
- [ ] Ajouter tableau "Comparaison Formateur vs Admin"

### Dans Sprint 2 - Réalisation

- [ ] Screenshot : Dashboard admin - Section Formations
- [ ] Screenshot : Formulaire création formation (avec liste formateurs)
- [ ] Screenshot : Confirmation création formation
- [ ] Description : "L'admin peut créer des formations pour n'importe quel formateur"

### Dans Sprint 2 - Tests

- [ ] Test 1 : Créer formation avec formateur valide → PASS
- [ ] Test 2 : Créer formation sans formateur → FAIL avec erreur
- [ ] Test 3 : Vérifier que formation a statut "brouillon"
- [ ] Test 4 : Vérifier que formateur est assigné
- [ ] Test 5 : Vérifier que programme_formations est créé

---

## 🎓 CODE BACKEND EXEMPLE

```javascript
// Route : POST /api/admin/formations
router.post('/formations', verifyAdmin, (req, res) => {
  const {titre, description, formateur_id, prix, places_disponibles, specialite, date_debut, date_fin} = req.body;
  
  // Validation
  if (!titre || !formateur_id) {
    return res.status(400).json({error: 'Champs requis manquants'});
  }
  
  // Vérifier formateur existe
  db.query('SELECT id FROM formateurs WHERE id = ?', [formateur_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({error: 'Formateur invalide'});
    }
    
    // Créer formation
    const sql = `INSERT INTO formations (titre, description, formateur_id, prix, places_disponibles, specialite, date_debut, date_fin, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`;
    
    db.query(sql, [titre, description, formateur_id, prix, places_disponibles, specialite, date_debut, date_fin], (err, result) => {
      if (err) return res.status(500).json({error: err.message});
      
      // Créer programme
      db.query('INSERT INTO programme_formations (formation_id) VALUES (?)', [result.insertId], (err) => {
        if (err) return res.status(500).json({error: err.message});
        
        res.json({success: true, message: 'Formation créée', formation_id: result.insertId});
      });
    });
  });
});
```

---

## 🎯 RÉSUMÉ

**AVANT** (Rapport incomplet) :
- Admin gère utilisateurs
- Admin gère formateurs
- Admin approuve/rejette formations

**APRÈS** (Rapport complété) :
- Admin gère utilisateurs ✓
- Admin gère formateurs ✓
- Admin **crée des formations directement** ✅ ← NOUVEAU
- Admin assigne formateur à la formation créée ✅ ← NOUVEAU
- Admin approuve/rejette formations

---

**📌 À FAIRE :**

1. Générer les 3 diagrammes PlantUML
2. Intégrer dans Chapitre 4 - Sprint 2
3. Ajouter descriptions ci-dessus
4. Ajouter screenshots de l'interface
5. Ajouter cas de test

**Vous êtes prêt ! 🚀**
