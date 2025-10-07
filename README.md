# 📜 Script & Quiz Generator

Bienvenue dans le dépôt **Script & Quiz Generator** — une application légère qui permet d'importer des fichiers (.txt, .pdf, .docx), d'en extraire le contenu, puis de générer automatiquement un script de présentation et un quiz à partir de ce contenu.

Ce document décrit comment lancer le projet localement, où trouver les pages importantes (dont la page `PDF Tools`) et quelles options OCR sont disponibles si vous souhaitez ajouter de la reconnaissance de texte.

---

## Arborescence importante

- `index.html` — page principale (Générateur de Script & Quiz)
- `pdf_tools.html` — page dédiée aux outils PDF (fusion / conversion / aperçu)
- `style.css` — styles partagés
- `script.js` — logique du générateur principal (frontend)
- `pdf_tools.js` — logique de la page PDF Tools (frontend)
- `generateur_script_quiz_backend/` — backend Node.js (endpoints d'upload, merge, conversion)

Vérifiez le dossier `generateur_script_quiz_backend` pour les dépendances et le fichier `server.js` si vous souhaitez démarrer le serveur.

---

## Installer et lancer en local (Windows / PowerShell)

1. Clonez le dépôt :

```powershell
git clone <votre-repository-url>
cd Script-Quiz_Generator_Deploy
```

1. Installer / lancer le backend (si vous utilisez le backend fourni) :

```powershell
cd generateur_script_quiz_backend
npm install
# définir la variable d'environnement si vous utilisez l'API OpenAI (voir note plus bas)
$env:OPENAI_API_KEY = "votre_cle"
node server.js
```

Le backend expose les endpoints utilisés par la page `pdf_tools.html` (ex: `/merge`). Si vous ne souhaitez pas démarrer le backend, vous pouvez tester l'interface statique localement en ouvrant `index.html` et `pdf_tools.html` dans le navigateur (certaines actions serveur seront inactives).

1. Ouvrir l'interface

- Ouvrez `index.html` dans votre navigateur (double-clic local ou `Live Server` dans VS Code).
- Pour les fonctionnalités de fusion / conversion, utilisez `pdf_tools.html` (ou via le bouton "PDF Tools" sur la page principale).

---

## Pages clés et fonctionnalités

- `index.html` : importer un fichier (.txt, .pdf, .docx), cliquer sur "Générer" pour obtenir le script et le quiz. Les résultats peuvent être exportés (DOCX pour le script, XLSX pour le quiz).
- `pdf_tools.html` : page dédiée pour drag & drop de fichiers PDF/DOCX/TXT, prévisualisation, réorganisation (drag & drop) et fusion. Elle utilise `pdf.js` pour l'aperçu et `SortableJS` pour le réordonnancement.

**Notes UX importantes :**

- Taille max de fichier côté client : 10 MB (contrainte dans le code frontend).
- La fusion fait un POST vers `/merge` sur le backend et retourne un PDF fusionné en téléchargement.

---

---

## Déploiement & notes importantes

- Si vous déployez sur Render / Vercel / un VPS :

  - Le backend nécessite Node.js. Si vous voulez utiliser OCRmyPDF ou des binaires (tesseract, poppler), préférez un container Docker où vous installez ces dépendances.
  - Important : `server.js` utilise (dans la version fournie) le client OpenAI. Si `OPENAI_API_KEY` n'est pas défini au démarrage et que le code instancie le client au niveau module, le serveur peut échouer au démarrage. Deux solutions :

    1. Définir `OPENAI_API_KEY` dans les variables d'environnement du service (Render, etc.).
    2. Modifier `server.js` pour instancier le client OpenAI de façon paresseuse (quand nécessaire) afin d'éviter une erreur au démarrage.

---

## Conseils de sécurité & limites

- Bloquez la taille de fichier côté serveur et limitez le nombre de requêtes pour éviter l'abus.
- Si vous traitez des fichiers sensibles, évitez d'utiliser des services externes (cloud OCR) ou chiffrez/transmettez avec précaution.

---

## Contribuer

- Vos contributions sont bienvenues : ouvrir une issue, proposer une PR pour améliorer l'UI, ajouter la prise en charge d'OCRmyPDF via Dockerfile, etc.
- Pour un développement local fluide, utilisez VS Code et l'extension Live Server pour visualiser les pages HTML.

---

## Ressources utiles

- [pdf.js](https://mozilla.github.io/pdf.js/)
- [SortableJS](https://sortablejs.github.io/Sortable/)


