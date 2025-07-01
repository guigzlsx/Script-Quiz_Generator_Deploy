# 📜 Script & Quiz Generator

Bienvenue dans le **Script & Quiz Generator** ! Ce projet vous permet de télécharger des fichiers, de générer des scripts et des quiz à partir de ces fichiers, et de convertir les résultats en onglets Excel. 🚀

## 📂 Structure du Projet

- **index.html** : La page principale de l'application.
- **style.css** : Les styles CSS pour la mise en page et l'apparence.
- **script.js** : Le script JavaScript pour la logique de l'application.

## 🚀 Fonctionnalités

1. **Téléchargement de Fichiers** 📁
   - Téléchargez des fichiers au format `.txt`, `.pdf`, ou `.docx`.

    ```html
    <input type="file" id="fileInput" accept=".txt, .pdf, .docx">
    <label for="fileInput" class="custom-file-upload">
        Choisir un fichier
    </label>
    ```

2. **Génération de Scripts et Quiz** 📝
   - Cliquez sur le bouton "Envoyer" pour générer le script et le quiz.

    ```html
    <button class="btn-8" id="uploadButton">Envoyer</button>
    ```

3. **Chargement** ⏳
   - Une barre de progression et un message de chargement s'affichent pendant la génération.

    ```html
    <div id="loader" class="loader" style="display: none;">
        <div class="progress">
            <div id="progressBar" class="progress-bar"></div>
        </div>
        <div id="Chargement">Votre script et votre quiz chargent</div>
    </div>
    ```

4. **Résultats** 📊
   - Les résultats générés sont affichés dans la section "Script Généré".

    ```html
    <div id="result" class="result" style="display: none;">
        <h2>Script Généré :</h2>
        <pre id="scriptOutput"></pre> 
        <div id="quizOutput"></div> 
        <ul class="horizontal-list">
            <li><a href="C:\Users\glesaux\Documents\Code\Excel\index.html">Convert to Excel tab</a></li>
        </ul>
    </div>
    ```

5. **Script JavaScript** 📜
   - Le script JavaScript pour la logique de l'application est inclus à la fin du fichier.

    ```html
    <script src="script.js"></script>
    ```

## 🛠️ Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/votre-utilisateur/script-quiz-generator.git
   
## 📋 Utilisation

1. **Télécharger un fichier** :
   - Cliquez sur le bouton "Choisir un fichier" pour télécharger un fichier.

    ```html
    <input type="file" id="fileInput" accept=".txt, .pdf, .docx">
    <label for="fileInput" class="custom-file-upload">
        Choisir un fichier
    </label>
    ```

2. **Générer le script et le quiz** :
   - Cliquez sur le bouton "Envoyer" pour générer le script et le quiz.

    ```html
    <button class="btn-8" id="uploadButton">Envoyer</button>
    ```

3. **Voir les résultats** :
   - Les résultats seront affichés dans la section "Script Généré".

    ```html
    <div id="result" class="result" style="display: none;">
        <h2>Script Généré :</h2>
        <pre id="scriptOutput"></pre> 
        <div id="quizOutput"></div> 
        <ul class="horizontal-list">
            <li><a href="C:\Users\glesaux\Documents\Code\Excel\index.html">Convert to Excel tab</a></li>
        </ul>
    </div>
    ```

4. **Convertir en Excel** :
   - Cliquez sur le lien "Convert to Excel tab" pour convertir les résultats en onglets Excel.

    ```html
    <ul class="horizontal-list">
        <li><a href="C:\Users\glesaux\Documents\Code\Excel\index.html">Convert to Excel tab</a></li>
    </ul>
    ```

## 🌑 Mode Sombre

- Activez le mode sombre en cliquant sur le bouton "Dark mode" en haut à droite de la page.

## 📷 Aperçu

<img width="958" alt="image" src="https://github.com/user-attachments/assets/9bf4cf26-0123-4dfa-9b0d-3a0769cc8ae8">


