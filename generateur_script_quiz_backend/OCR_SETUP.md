# Configuration OCR (Optionnel)

L'outil détecte automatiquement les PDF scannés (peu de texte natif) et applique l'OCR si disponible.

## Installation des dépendances OCR

### 1. Installer Tesseract OCR (moteur)

**Windows:**
- Télécharger: https://github.com/UB-Mannheim/tesseract/wiki
- Installer `tesseract-ocr-w64-setup-5.x.x.exe`
- Ajouter au PATH: `C:\Program Files\Tesseract-OCR`

**Vérifier:**
```bash
tesseract --version
```

### 2. Installer Poppler (pour pdf2image)

**Windows:**
- Télécharger: https://github.com/oschwartz10612/poppler-windows/releases
- Extraire dans `C:\Program Files\poppler`
- Ajouter au PATH: `C:\Program Files\poppler\Library\bin`

### 3. Installer les packages Python

```bash
pip install pdf2image pytesseract pillow
```

### 4. Tester l'OCR

```bash
python ocr_helper.py chemin/vers/test.pdf
```

## Utilisation

Une fois configuré, l'OCR est **automatique** :
- Si PDF avec texte natif → extraction directe (rapide)
- Si PDF scanné (< 500 caractères) → OCR automatique (plus lent mais complet)

## Désactivation

Pour désactiver l'OCR, supprimez simplement le fichier `ocr_helper.py`.
L'outil continuera de fonctionner en mode texte natif uniquement.
