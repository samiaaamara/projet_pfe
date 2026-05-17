# 📊 Guide d'Utilisation — Diagrammes PlantUML Sprint 1

## ✅ Fichiers Créés

Tous les fichiers PlantUML sont dans : `c:\Users\User\Desktop\projet_pfe\Diagrammes_PlantUML\`

### Liste des diagrammes :

| # | Fichier | Type | Description |
|---|---------|------|-------------|
| 1 | `Sprint1_1_CasUtilisation_Global.puml` | Cas d'utilisation | Vue globale du système Sprint 1 |
| 2 | `Sprint1_2_CasUtilisation_Utilisateur.puml` | Cas d'utilisation | Détail des flows utilisateur |
| 3 | `Sprint1_3_CasUtilisation_Admin.puml` | Cas d'utilisation | Détail des flows admin |
| 4 | `Sprint1_4_Sequence_Authentification.puml` | Séquence | Processus login complet |
| 5 | `Sprint1_5_Sequence_Inscription.puml` | Séquence | Processus inscription complet |
| 6 | `Sprint1_6_Sequence_GestionFormateurs.puml` | Séquence | Création compte formateur |
| 7 | `Sprint1_7_Activite_Authentification.puml` | Activité | Flux décisionnel auth |
| 8 | `Sprint1_8_Classes.puml` | Classes | Structure entités Sprint 1 |
| 9 | `Sprint1_9_Activite_CreationFormateur.puml` | Activité | Flux création formateur |

---

## 🔧 Comment Générer les Diagrammes

### Option 1 : Utiliser PlantUML Online (Rapide ✓)

1. Aller sur : https://www.plantuml.com/plantuml/uml/
2. Copier-coller le contenu d'un fichier `.puml`
3. Cliquer "Generate"
4. Télécharger l'image (PNG)
5. Intégrer dans votre rapport

### Option 2 : Installer PlantUML Localement

#### Prérequis :
- Java 8+ installé
- GraphViz installé (pour les diagrammes)

#### Étapes :

**1. Télécharger PlantUML :**
```bash
# Créer dossier
mkdir C:\PlantUML
cd C:\PlantUML

# Télécharger JAR
curl -o plantuml.jar https://sourceforge.net/projects/plantuml/files/plantuml.jar/download
```

**2. Générer tous les diagrammes en batch :**

Créer un fichier `generate_diagrams.bat` dans le dossier `Diagrammes_PlantUML` :

```batch
@echo off
REM Générer tous les diagrammes PlantUML

set PLANTUML_JAR=C:\PlantUML\plantuml.jar
set OUTPUT_DIR=..\..\..\rapport_images

REM Créer dossier output
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Générer chaque diagramme
echo Génération des diagrammes...

java -jar "%PLANTUML_JAR%" -png Sprint1_1_CasUtilisation_Global.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_2_CasUtilisation_Utilisateur.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_3_CasUtilisation_Admin.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_4_Sequence_Authentification.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_5_Sequence_Inscription.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_6_Sequence_GestionFormateurs.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_7_Activite_Authentification.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_8_Classes.puml -o "%OUTPUT_DIR%"
java -jar "%PLANTUML_JAR%" -png Sprint1_9_Activite_CreationFormateur.puml -o "%OUTPUT_DIR%"

echo Terminé! Les images sont dans %OUTPUT_DIR%
pause
```

### Option 3 : VS Code Extension

1. Installer extension "PlantUML" (jebbs.plantuml)
2. Ouvrir un fichier `.puml`
3. Clic droit → "Preview Current Diagram"
4. Clic droit → "Export Diagram"

---

## 📝 Comment Intégrer dans le Rapport

### Étape 1 : Générer les images (PNG)

Utilisez l'une des options ci-dessus pour obtenir les PNG.

### Étape 2 : Placer les images

```
C:\Users\User\Desktop\projet_pfe\
├── rapport (fichier Word/PDF)
└── images_rapport/
    ├── Sprint1_1_CasUtilisation_Global.png
    ├── Sprint1_2_CasUtilisation_Utilisateur.png
    ├── Sprint1_3_CasUtilisation_Admin.png
    ├── Sprint1_4_Sequence_Authentification.png
    ├── Sprint1_5_Sequence_Inscription.png
    ├── Sprint1_6_Sequence_GestionFormateurs.png
    ├── Sprint1_7_Activite_Authentification.png
    ├── Sprint1_8_Classes.png
    └── Sprint1_9_Activite_CreationFormateur.png
```

### Étape 3 : Intégrer dans Word

1. Ouvrir `rapport.docx`
2. Aller au Chapitre 3 - Sprint 1 - Section Conception
3. Placer le curseur où insérer le diagramme
4. Insérer → Image → Sélectionner PNG
5. Redimensionner (largeur ~12 cm, hauteur proportionnelle)
6. Centrer l'image
7. Ajouter caption : "Figure X : Titre du diagramme"

---

## 🎨 Descriptions pour le Rapport

### Diagramme 1 : Cas d'Utilisation Global (Figure 8)

**Titre :** Diagramme de Cas d'Utilisation Global — Sprint 1

**Description à ajouter dans le rapport :**

Ce diagramme présente une vue générale des acteurs (Utilisateur et Administrateur) et de leurs interactions avec le système FormaPro. Les acteurs "Utilisateur" représentent les étudiants, formateurs et utilisateurs externes. L'administrateur dispose de fonctionnalités dédiées au management de la plateforme. Les relations "include" et "extend" montrent les dépendances entre cas d'utilisation.

---

### Diagramme 2 : Cas d'Utilisation Utilisateur (Figure 9)

**Titre :** Raffinement — Cas d'Utilisation Utilisateur (Étudiant/Formateur/Externe)

**Description :**

Ce diagramme détaille les cas d'utilisation disponibles pour les utilisateurs non-administrateurs. Il montre quatre flux principaux : (1) **Inscription** : accès au formulaire, remplissage et création de compte ; (2) **Authentification** : saisie des identifiants, vérification et redirection ; (3) **Gestion du Profil** : consultation et modification des données personnelles ; (4) **Changement de Mot de Passe** : vérification de l'ancien mot de passe et mise à jour sécurisée.

---

### Diagramme 3 : Cas d'Utilisation Admin (Figure 10)

**Titre :** Raffinement — Cas d'Utilisation Administrateur

**Description :**

Ce diagramme illustre les fonctionnalités accessibles à l'administrateur dans ce sprint. Après authentification via une page dédiée, l'administrateur accède au dashboard avec trois secteurs principaux : (1) **Gestion des Utilisateurs** : consultation avec filtres par rôle et spécialité, suppression d'utilisateurs ; (2) **Gestion des Formateurs** : CRUD complet (création, modification, suppression) ; (3) **Statistiques** : consultation du nombre d'étudiants, formateurs, formations publiées et en attente.

---

### Diagramme 4 : Séquence Authentification (Figure 11)

**Titre :** Diagramme de Séquence — Authentification

**Description :**

Ce diagramme illustre le processus complet d'authentification. L'utilisateur saisit ses identifiants, qui sont envoyés au serveur. Le backend vérifie l'email en base de données, puis compare le mot de passe saisi avec le hash stocké via bcrypt. En cas de succès, un JWT token est généré et renvoyé au client, qui le stocke et redirige l'utilisateur vers son dashboard. En cas d'échec, un message d'erreur est affiché sans révéler si c'est l'email ou le mot de passe qui est incorrect (sécurité).

---

### Diagramme 5 : Séquence Inscription (Figure 12)

**Titre :** Diagramme de Séquence — Inscription Utilisateur

**Description :**

Ce diagramme décrit le processus d'inscription. L'utilisateur sélectionne d'abord son rôle (étudiant, formateur ou externe). Le formulaire s'adapte dynamiquement au rôle choisi. Après validation côté frontend, les données sont envoyées au backend qui : (1) valide les informations ; (2) vérifie l'unicité de l'email ; (3) hache le mot de passe ; (4) crée le compte utilisateur ; (5) crée le profil spécifique au rôle. Un JWT token est généré et l'utilisateur est redirigé vers la page de connexion avec un message de confirmation.

---

### Diagramme 6 : Séquence Gestion Formateurs (Figure 13)

**Titre :** Diagramme de Séquence — Création de Compte Formateur (Admin)

**Description :**

Ce diagramme montre comment l'administrateur crée un compte formateur directement. L'administrateur accède à la section Formateurs, clique sur "Ajouter Formateur" et remplit le formulaire (nom, email, mot de passe, spécialité). Après validation, le backend crée le compte utilisateur avec rôle "formateur" et associe le profil formateur. Un message de confirmation est affiché et la liste des formateurs est mise à jour.

---

### Diagramme 7 : Activité Authentification (Figure 13bis)

**Titre :** Diagramme d'Activité — Authentification et Redirection

**Description :**

Ce diagramme représente le flux d'exécution du processus d'authentification. Il montre les décisions critiques : (1) vérification de l'email ; (2) validation du mot de passe ; (3) détermination du rôle pour redirection appropriée. Chaque branche mène soit à un message d'erreur, soit à la création du JWT et à la redirection vers le dashboard correspondant au rôle (admin, formateur, étudiant ou externe).

---

### Diagramme 8 : Classes Sprint 1 (Figure 14)

**Titre :** Diagramme de Classes — Sprint 1

**Description :**

Ce diagramme présente la structure statique du système Sprint 1. La classe `User` est l'entité centrale contenant les informations communes (id, nom, email, mot de passe hashé, rôle). Cette classe est spécialisée en quatre entités (héritage) : `Etudiant`, `Formateur`, `Externe` et `Admin`, chacune ajoutant des attributs spécifiques. La classe `Admin` gère les utilisateurs via des méthodes CRUD. La classe `Statistics` est consultée par Admin pour les statistiques globales. La classe `Formation` est créée par les formateurs.

---

### Diagramme 9 : Activité Création Formateur (Figure 15)

**Titre :** Diagramme d'Activité — Création de Compte Formateur (Admin)

**Description :**

Ce diagramme de flux décrit les étapes de création d'un compte formateur par l'administrateur. Il montre la validation des champs, la vérification de l'unicité de l'email avec boucles de correction, le hachage du mot de passe, et les insertions en base de données. Le processus se termine par l'affichage d'un message de succès et la mise à jour de la liste des formateurs visibles par l'administrateur.

---

## 📌 Résumé des Diagrammes par Type

### Cas d'Utilisation (3) :
- Global (vue d'ensemble)
- Utilisateur (détail flows utilisateur)
- Admin (détail flows administrateur)

### Séquence (3) :
- Authentification (login process)
- Inscription (signup process)
- Gestion Formateurs (admin create formateur)

### Activité (2) :
- Authentification (flux décisionnel)
- Création Formateur (flux décisionnel)

### Classes (1) :
- Structure entités et relations

---

## ✅ Checklist Intégration

- [ ] Tous les 9 diagrammes générés en PNG
- [ ] Images placées dans un dossier `images_rapport`
- [ ] Images insérées dans le rapport Word
- [ ] Captions (Figures) ajoutées
- [ ] Tailles des images uniformes (~12 cm)
- [ ] Descriptions rédigées pour chaque diagramme
- [ ] Renvois cohérents ("Cf. Figure X")
- [ ] Qualité des images vérifiée (300 DPI)

---

## 🎯 Prochaines Étapes

1. **Générer les images** (Option 1, 2 ou 3)
2. **Intégrer dans le rapport** Word
3. **Rédiger les descriptions** pour chaque diagramme
4. **Vérifier la mise en page** et la cohérence
5. **Procéder aux corrections** finales

**Besoin d'aide pour une étape ?** Demandez-moi ! 🚀
