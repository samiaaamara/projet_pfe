@echo off
REM ============================================================
REM Script de génération des diagrammes PlantUML - Sprint 1
REM ============================================================
REM Assure-toi que Java et GraphViz sont installés
REM ============================================================

setlocal enabledelayedexpansion

REM Chemins
set CURRENT_DIR=%~dp0
set PLANTUML_JAR=C:\PlantUML\plantuml.jar
set OUTPUT_DIR=%CURRENT_DIR%Images_Sprint1

REM Vérifier si PlantUML JAR existe
if not exist "%PLANTUML_JAR%" (
    echo.
    echo ========== ERREUR ==========
    echo Fichier PlantUML non trouvé : %PLANTUML_JAR%
    echo.
    echo Solutions :
    echo 1. Télécharger PlantUML depuis : https://sourceforge.net/projects/plantuml/files/
    echo 2. Placer plantuml.jar dans C:\PlantUML\
    echo 3. Relancer ce script
    echo.
    pause
    exit /b 1
)

REM Créer le dossier output
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
    echo. Dossier créé : %OUTPUT_DIR%
)

echo.
echo ========== GÉNÉRATION DES DIAGRAMMES ==========
echo.
echo Cela peut prendre quelques secondes...
echo.

REM Liste des fichiers à générer
set files[0]=Sprint1_1_CasUtilisation_Global.puml
set files[1]=Sprint1_2_CasUtilisation_Utilisateur.puml
set files[2]=Sprint1_3_CasUtilisation_Admin.puml
set files[3]=Sprint1_4_Sequence_Authentification.puml
set files[4]=Sprint1_5_Sequence_Inscription.puml
set files[5]=Sprint1_6_Sequence_GestionFormateurs.puml
set files[6]=Sprint1_7_Activite_Authentification.puml
set files[7]=Sprint1_8_Classes.puml
set files[8]=Sprint1_9_Activite_CreationFormateur.puml

REM Compteur
set count=0
for /L %%i in (0,1,8) do (
    set file=!files[%%i]!
    if exist "!file!" (
        echo [%%i/9] Génération : !file! ...
        java -jar "%PLANTUML_JAR%" -png "!file!" -o "%OUTPUT_DIR%"
        if !errorlevel! equ 0 (
            echo       ✓ Succès
            set /a count+=1
        ) else (
            echo       ✗ Erreur
        )
    ) else (
        echo [%%i/9] Fichier non trouvé : !file!
    )
)

echo.
echo ========== RÉSULTAT ==========
echo %count%/9 diagrammes générés avec succès
echo.
echo Dossier de sortie : %OUTPUT_DIR%
echo.

REM Optionnel : Ouvrir le dossier
start explorer "%OUTPUT_DIR%"

pause
