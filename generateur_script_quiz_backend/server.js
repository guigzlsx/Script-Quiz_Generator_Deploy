const express = require("express");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config(); // Charger les variables d'environnement
const OpenAI = require("openai");
const cors = require("cors"); // Importer CORS
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require("path");


const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies for endpoints that accept raw text
app.use(express.json());

// Ne servir que le dossier parent "public" (ici la racine frontend) au lieu de tout le repo
// Remarque: assure-toi que les fichiers statiques front sont bien dans le dossier racine du projet.
app.use(express.static(path.join(__dirname, "..")));

// Utiliser CORS with proper configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Electron)
    // or from the same origin in production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      process.env.FRONTEND_URL // Set this in Render environment variables if needed
    ];
    
    if (!origin || allowedOrigins.includes(origin) || !origin.includes('http')) {
      callback(null, true);
    } else {
      // In production on Render, allow same origin
      callback(null, true);
    }
  },
  credentials: true
}));

// Configurer l'API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Utiliser la clé depuis les variables d'environnement
});

// Configurer multer pour gérer les fichiers uploadés avec limites et filtrage
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // préserver l'extension
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, "_");
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Type de fichier non supporté"));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter,
});

// Utilitaires PDF : pdf-lib pour manipuler/merger
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { execFile } = require('child_process');

// Fonction pour lire un fichier PDF et le convertir en texte (extraction maximale)
const readPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer, {
    // Options pour maximiser l'extraction
    max: 0, // Pas de limite de pages
    version: 'v2.0.550' // Version optimale
  });
  
  // Extraire TOUT le texte possible
  let fullText = data.text || '';
  
  // Ajouter les métadonnées si disponibles (titre, sujet, mots-clés)
  if (data.info) {
    const meta = [];
    if (data.info.Title) meta.push('Titre: ' + data.info.Title);
    if (data.info.Subject) meta.push('Sujet: ' + data.info.Subject);
    if (data.info.Keywords) meta.push('Mots-clés: ' + data.info.Keywords);
    if (data.info.Author) meta.push('Auteur: ' + data.info.Author);
    if (meta.length > 0) {
      fullText = meta.join('\n') + '\n\n' + fullText;
    }
  }
  
  // ⚠️ OCR AUTOMATIQUE si le texte est insuffisant (scan ou image)
  const MIN_TEXT_LENGTH = 500; // Seuil en caractères
  if (fullText.length < MIN_TEXT_LENGTH) {
    console.log('[readPDF] Texte insuffisant (' + fullText.length + ' chars), tentative OCR...');
    try {
      // Appeler le script Python pour OCR
      const { execSync } = require('child_process');
      const ocrResult = execSync(`python ocr_helper.py "${filePath}"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 120000 // 2 minutes timeout
      });
      
      const ocrData = JSON.parse(ocrResult);
      if (ocrData.success && ocrData.text) {
        console.log('[readPDF] OCR réussi: ' + ocrData.characters + ' caractères extraits de ' + ocrData.pages + ' pages');
        fullText = ocrData.text;
      } else {
        console.log('[readPDF] OCR échoué:', ocrData.error);
      }
    } catch (err) {
      console.log('[readPDF] Erreur OCR (dépendances manquantes?):', err.message);
      console.log('[readPDF] Pour activer l\'OCR: pip install pdf2image pytesseract pillow');
    }
  }
  
  // Nettoyer les espaces excessifs mais garder la structure
  fullText = fullText
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n') // Max 3 sauts de ligne consécutifs
    .trim();
  
  console.log('[readPDF] Extracted', fullText.length, 'characters,', data.numpages, 'pages');
  return fullText;
};

// Fonction pour lire un fichier Word et le convertir en texte
const readDOCX = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
};

// Route pour recevoir le fichier
app.post("/upload", upload.single("document"), async (req, res) => {
  const filePath = req.file.path;
  // Debug: afficher les champs reçus pour vérifier la présence de extraInfo
  try {
    console.log("POST /upload body keys:", Object.keys(req.body || {}));
    console.log("POST /upload extraInfo (raw):", req.body ? req.body.extraInfo : undefined);
  } catch (err) {
    console.log("Erreur lors du logging debug du body:", err);
  }

  try {
    let data;
    if (req.file.mimetype === "application/pdf") {
      console.log("Fichier PDF détecté, conversion en texte...");
      data = await readPDF(filePath);
    } else if (
      req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      console.log("Fichier Word détecté, conversion en texte...");
      data = await readDOCX(filePath);
    } else if (req.file.mimetype === "text/plain") {
      console.log("Fichier texte détecté, lecture du contenu...");
      data = fs.readFileSync(filePath, "utf8");
    } else {
      return res.status(400).send("Type de fichier non supporté");
    }

    // Récupérer et limiter les informations complémentaires envoyées par le client
    const extraInfoRaw = req.body && req.body.extraInfo ? String(req.body.extraInfo) : "";
    const extraInfo = extraInfoRaw.trim().slice(0, 1000); // limiter à 1000 caractères
    if (extraInfo) console.log("Informations complémentaires reçues (tronquées si nécessaire):", extraInfo);


    // Définir la limite de tokens
    const maxTokens = 16385;
    const tokens = data.split(" ").length; // Compte des mots

    // Troncature des données si nécessaire
    let truncatedData = data;
    if (tokens > maxTokens) {
      truncatedData = data.split(" ").slice(0, maxTokens).join(" ");
    }

    const inEnglish = req.body.inEnglish === "true";

    // Préparer bloc d'informations complémentaires à ajouter au prompt si présent
    const extraBlock = extraInfo ? `\n\nInformations complémentaires fournies par l'utilisateur :\n${extraInfo}\n` : "";

    // Si extraInfo est présent, créer un bloc prioritaire et explicite pour forcer le modèle
    const extraPriority = extraInfo
      ? `\n\n=== INFORMATIONS SUPPLÉMENTAIRES (À PRENDRE EN COMPTE ET À PRIORISER) ===\n${extraInfo}\n=== FIN INFORMATIONS SUPPLÉMENTAIRES ===\n\n`
      : "";

    // Préparer le prompt
    // On place le bloc prioritaire en tête pour s'assurer qu'il soit pris en compte.
    const prompt = `
     ${extraPriority}Voici un document :\n${truncatedData}${extraBlock}
    ${inEnglish ? "TOUT DOIT ÊTRE RÉDIGÉ EN ANGLAIS.\n" : ""}

   
==================================================
INSTRUCTIONS GÉNÉRALES
==================================================
1. Tu dois produire deux parties distinctes :
   - Un SCRIPT vidéo (290 à 310 mots, très important).
   - Un QUIZ de 10 questions parfaitement formaté.
2. Tu dois te baser uniquement sur le document fourni.
3. Interdiction d’inventer des informations.
4. Interdiction de parler du prix.
5. Respect absolu de la mise en forme donnée en exemple.
6. Police à utiliser : Calibri (important pour export Word/Excel).
7. Si une information nécessaire n’est pas présente dans le document fourni, tu es autorisé à aller la chercher UNIQUEMENT sur le site officiel du constructeur du produit concerné.
8. Interdiction d’utiliser d’autres sources (sites de presse, forums, comparateurs…).
9. Si plusieurs produits ou modèles sont mentionnés dans le document, considère qu'il s'agit d'une gamme et traite TOUS les produits de manière équilibrée, en comparant si nécessaire.
==================================================
PARTIE 1 – SCRIPT
==================================================
- Rédige un script de 290 à 310 mots, pas plus.
- Titre obligatoire : [SCRIPT] [Nom du produit]
- Le script doit être écrit à la première personne, comme une vidéo YouTube.
- Style fluide, conversationnel, naturel, enthousiaste.
- Inspiré de vidéastes tech (Steven, TheiCollection, Jojol, Nowtech, Brandon Le Proktor).
- Ne parles jamais de points négatifs.
- Pas de lecture de fiche technique : fais vivre le produit, mets en avant l’expérience utilisateur.
- Structure :
   1. Accroche / intro dynamique
   2. Présentation de l’expérience globale
   3. Mise en avant de 5 points clés (positifs uniquement)
   4. Conclusion engageante ("est-ce fait pour vous ?")
- Chaque phrase doit être suivie d’un retour à la ligne (très important).
- Ne dis pas "Alors, est-ce fait pour vous ?" dans le script
- Après le script, écris la section :
   MOTS-CLÉS ASSOCIÉS
   (énumère les 5 mots clés utilisés dans le texte, pas de puces, pas de ponctuation, retur a la ligne a chaque mot clef)
- Je te soumets un exemple ci-dessous:

[SCRIPT] GOOGLE PIXEL 10

Salut à tous ! Aujourd'hui, on va parler du Google Pixel 10, le dernier né de la gamme Pixel.
Alors, qu'est-ce qu'il a dans le ventre ce petit bijou de technologie ? C'est ce qu'on va voir ensemble.
Premier point, le design.
On a ici un boîtier en aluminium de qualité aérospatiale, avec au moins 11% de matériau recyclé.
C'est solide, c'est durable, et c'est éco-responsable.
Le dos est en verre Corning Gorilla Glass Victus 2, poli pour un rendu ultra premium.
Et cerise sur le gâteau, il est résistant à l'eau et à la poussière avec une certification IP68.
Deuxième point, l'écran.
On a un écran Actua de 6,3 pouces avec une luminosité max de 3000 nits.
C'est clair, c'est net, et ça s'adapte à votre environnement grâce à une fréquence d'actualisation de 60 à 120 Hz.
Troisième point, les performances.
Le Pixel 10 est équipé du processeur Google Tensor G5, avec une RAM de 12 Go et un stockage de 128 ou 256 Go.
C'est puissant, c'est rapide, et ça vous permet de faire tourner toutes vos applications sans aucun ralentissement.
Quatrième point, la batterie.
On a une capacité de 4970 mAh, avec une autonomie de plus de 24h en usage normal et jusqu'à 100h en mode ultra économiseur.
Et pour la recharge, on a du sans fil rapide Qi2 Pixelsnap jusqu'à 15W, et du filaire rapide.
Enfin, cinquième point, la photo.
Le Pixel 10 est équipé d'un triple capteur avancé, avec un grand angle de 48 Mpx, un ultra grand angle de 12 Mpx et un téléobjectif de 10,8 Mpx.
Ajoutez à cela des fonctions IA comme la retouche magique, et vous avez un véritable studio photo dans votre poche.
En conclusion, le Google Pixel 10 est un smartphone haut de gamme, performant et polyvalent, qui saura satisfaire les plus exigeants d'entre vous.
Alors, prêt à faire le grand saut ?.

MOTS-CLÉS ASSOCIÉS
Design durable
Écran Actua
Performances
Autonomie
Photo avancée


==================================================
PARTIE 2 – QUIZ
==================================================
- Titre obligatoire : [QUIZ] [Nom du produit]
- 10 questions au total.
- Les formats obligatoires :
   • QCM (au moins une fausse réponse, 4 propositions, entre 1 et 3 bonnes réponses correctes possibles).
   • Vrai ou Faux (argument court, max 80 caractères). Les bonnes réponses doivent alterner entre “Vrai” et “Faux”, sans jamais répéter plus de deux fois de suite la même bonne réponse.
   • Texte à trou (un seul trou, 4 propositions dont 1 vraie).
- Les trois formats doivent obligatoirement être inclus dans le quiz.
- Les bonnes réponses doivent toujours mettre en avant l’usage concret pour l’utilisateur. 
   Exemple : ne dis pas seulement "Mise au point macro 5 cm", mais "Mise au point macro 5 cm pour capturer des détails de près".
- Aucune fausse information ne doit être utilisée.
- Éviter les contextes trop spécifiques ou anecdotiques (ex. "en location de vacances", "pendant une croisière", "dans un chalet de montagne").
- Chaque question doit être formulée autour d’un usage clair et généralisable : maison, famille, travail, loisirs, entretien quotidien.
- Penses a mettre un point à chaque fin de questions et non dans les reponses (point d'interrogation considéré comme un point).
- Structure stricte à respecter (espaces, tabulations, retours à la ligne) comme dans cet exemple :
- Je te soumets un exemple de format de quiz que je souhaite obtenir, pour la mise en forme et le fond:

[QUIZ] XIAOMI 14T et 14T Pro

Q1  L’appareil photo principal du Xiaomi 14T capte plus de lumière, même en faible luminosité, pour des photos plus nettes. Que ne permet-il pas de faire ?
  *Photographier de nuit
  *Réussir ses portraits en intérieur
  *Capturer un coucher de soleil
   Plonger en mer

Q2  Les Xiaomi 14T et 14T Pro disposent de la même durée de recharge.
   Vrai, tous deux se chargent en 45mins.
  *Faux. Le Xiaomi 14T se recharge en 19 minutes tandis que le 14T Pro se recharge en 45 minutes. 

Q3  Avec ses 50 MP, l’appareil photo principal du Xiaomi 14T vous permet de #1
   Flouter vos photos
   Agrandir sans perdre en détails
   Avoir uniquement des clichés en noir et blanc
  #1Immortaliser chaque détail avec précision

Q4  Que permet la fonctionnalité HyperCharge sur le Xiaomi 14T ?
   Recharger la batterie en 2 heures
   Doubler l’autonomie
  *Faire le plein d’énergie en seulement 19 minutes
   Utiliser le téléphone sans batterie

Q5  Pendant vos tâches de travail, le Xiaomi 14T Pro utilise l’IA.
  *Vrai, il utilise Google Gemini pour améliorer productivité et confort
   Faux

Q6  Quelle marque de technologie photo équipe les Xiaomi 14T et 14T Pro pour des souvenirs de vacances d’exception ?
   Sony
   Canon
  *Leica 
   Nikon

Q7  La finesse de gravure en 3 nm du Xiaomi 14T Pro permet…
   De prendre de meilleures photos sous l’eau
   D’ajouter plus de mémoire
   D’avoir plus de couleurs sur l’écran
  *D’améliorer les performances tout en réduisant la consommation d’énergie

Q8  Le Xiaomi 14T et le 14T Pro offrent-ils un zoom optique x5 ?
  *Vrai, ce qui permet de zoomer sur un match…
   Faux 
Q9  La technologie d’IA intégrée au Xiaomi 14T et 14T Pro s’appelle…
   AI Genius
   AI Craftsmanship
   AI Creativity
  *AI Innovation

Q10 Une plage de focales de 10 à 85 mm sur le Xiaomi 14T permet de…
   Capturer uniquement des paysages
   Capturer uniquement des sujets éloignés
  *Capturer aussi bien de larges paysages que des sujets éloignés
   Prendre uniquement des photos de nuit

Les asterisques (*) indiquent la ou les bonnes réponses. Assure-toi de les inclure dans le quiz.
les #1 indiquent les bonnes reponses uniquement sur les textes a trou.TRES IMPORTANT
Cette structure est primordiale pour la génération du quiz.

- Attention :
   • Une tabulation après le numéro de la question (Q1\t).
   • Aucune répétition entre les questions.
   • Chaque question doit être réaliste, orientée usage concret (voyage, sport, travail, soirée...).
   • Indiquer la/les bonnes réponses avec * ou #1 exactement comme dans l’exemple.
   • Pas d’astérisque ou #1 ailleurs que sur les bonnes réponses.
   • 1 ou 2 bonne réponse pour les textes à trou. LA reponse 1 sera représenté par #1 et la seconde si il y en a une par #2

==================================================
CONTRÔLE QUALITÉ
==================================================
- Vérifie que le script fait bien entre 290 et 310 mots.
- Vérifie que le quiz suit exactement la mise en forme demandée.
- Vérifie que les mots-clés apparaissent dans le script.
- Vérifie qu'il n'y ai pas de fautes (ortographe, etc...).
- Si une règle n’est pas respectée, recommence la génération avant de me donner la réponse.

==================================================
FIN DU PROMPT
==================================================
`;

    try {
      // Envoyer la requête à OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });

      // Renvoyer la réponse de ChatGPT au client
      res.json({ script: response.choices[0].message.content });
    } catch (error) {
      console.error("Erreur avec OpenAI:", error);
      res
        .status(500)
        .send("Erreur lors de la génération du script et du quiz.");
    } finally {
      // Supprimer le fichier temporaire après traitement
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr)
          console.error("Erreur lors de la suppression du fichier:", unlinkErr);
      });
    }
  } catch (error) {
    console.error("Erreur lors de la lecture du fichier:", error);
    res.status(500).send("Erreur lors de la lecture du fichier");
  }
});

// Endpoint : Génération courte de description produit (bullet points)
app.post('/generate-description', upload.single('document'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!filePath) return res.status(400).send('Aucun fichier fourni');

    let data = '';
    if (req.file.mimetype === 'application/pdf') {
      console.log('/generate-description: extraction PDF');
      data = await readPDF(filePath);
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('/generate-description: extraction DOCX');
      data = await readDOCX(filePath);
    } else if (req.file.mimetype === 'text/plain') {
      data = fs.readFileSync(filePath, 'utf8');
    } else {
      return res.status(400).send('Type de fichier non supporté');
    }

    const extraInfoRaw = req.body && req.body.extraInfo ? String(req.body.extraInfo) : '';
    const extraInfo = extraInfoRaw.trim().slice(0, 1000);
    if (extraInfo) console.log('/generate-description extraInfo:', extraInfo);

    // Troncature raisonnable
    const maxWords = 16000;
    const words = data.split(/\s+/);
    let truncated = data;
    if (words.length > maxWords) truncated = words.slice(0, maxWords).join(' ');

    const extraPriority = extraInfo ? `\n\n=== INFORMATIONS SUPPLÉMENTAIRES (À PRENDRE EN COMPTE) ===\n${extraInfo}\n=== FIN ===\n\n` : '';

    const userInstruction = `Analyse la fiche produit ci-dessous et rédige une description très courte, sous forme de bullet points, allant droit au but. Chaque bullet point doit être une phrase simple et concise mettant en avant les principaux bénéfices, caractéristiques clés, accessoires inclus et avantages pratiques. Pas de phrases longues, pas de marketing excessif. Maximum 8 bullet points.`;

    const prompt = `${extraPriority}${userInstruction}\n\nFICHE PRODUIT:\n${truncated}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.choices && response.choices[0] && response.choices[0].message
        ? response.choices[0].message.content
        : '';

      return res.json({ description: content });
    } catch (err) {
      console.error('OpenAI error /generate-description:', err);
      return res.status(500).send('Erreur lors de la génération de la description produit.');
    }
  } catch (err) {
    console.error('Error /generate-description:', err);
    return res.status(500).send('Erreur lors du traitement du fichier');
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
});

// Endpoint : Génération de storyboard à partir d'un script vidéo
app.post('/generate-storyboard', upload.single('document'), async (req, res) => {
  const filePath = req.file && req.file.path;
  try {
    if (!filePath) return res.status(400).send('Aucun fichier fourni');

    let scriptData = '';
    
    // Lecture du fichier script
    if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('[/generate-storyboard] Extraction DOCX');
      scriptData = await readDOCX(filePath);
    } else {
      return res.status(400).send('Format non supporté. Veuillez soumettre un fichier .docx');
    }

    const extraInfoRaw = req.body && req.body.extraInfo ? String(req.body.extraInfo) : '';
    const extraInfo = extraInfoRaw.trim().slice(0, 1000);
    if (extraInfo) console.log('[/generate-storyboard] Extra info:', extraInfo);

    // Troncature
    const maxWords = 16000;
    const words = scriptData.split(/\s+/);
    let truncated = scriptData;
    if (words.length > maxWords) truncated = words.slice(0, maxWords).join(' ');

    const extraPriority = extraInfo ? `\n\n=== INFORMATIONS SUPPLÉMENTAIRES ===\n${extraInfo}\n=== FIN ===\n\n` : '';

    const prompt = `${extraPriority}Tu es un assistant de storyboard professionnel expert.
Ton objectif : générer un storyboard détaillé, structuré et directement lié au script.

SCRIPT VIDÉO:
${truncated}

=== TÂCHES PRIORITAIRES ===
1. Identifie CHAQUE SECTION du script (marquée par "Cadre:" ou "Indications tournage:")
2. Pour chaque section = 1 scène
3. Extrait: cadre (Bureau/Extérieur/Intérieur), action principale, position du protagoniste, détails techniques
4. IMPORTANT: Pour chaque scène, note la SECTION du script d'où elle provient
5. Respecte l'ordre chronologique du script
6. Capture les TRANSITIONS explicites

=== FORMAT JSON STRICTE (ARRAY SEULEMENT) ===
[
  {
    "scene": 1,
    "title": "Titre court de la scène",
    "cadre": "Bureau|Extérieur|Intérieur",
    "shot_type": "wide|medium|close-up",
    "camera_move": "static|pan|tilt|zoom",
    "action": "Description précise de l'action (ex: 'Le protagoniste reçoit le colis dans ses mains')",
    "position": "Position du protagoniste (ex: 'Assis à son bureau', 'Debout en train de courir')",
    "focus": "Ce qu'on doit voir clairement (ex: 'La boîte du produit')",
    "emotion": "Émotion/ambiance (ex: 'Enthousiasme', 'Concentration')",
    "storyboard_focus": "L'idée CLÉ visuelle à montrer",
    "transition": "Type de transition (ex: 'Coupe nette', 'Fondu', 'Aucune') ou null",
    "voix_off_extrait": "Bribes pertinentes de la voix off (optionnel)",
    "notes": "Détails techniques (ex: 'Gros plan sur les écouteurs', 'Son isolé du smartphone')",
    "script_reference": "Section du script d'où provient cette scène (ex: 'Section 1: Bureau - Réception colis')"
  }
]

=== RÈGLES STRICTES ===
- Retourner UNIQUEMENT un JSON array, pas de texte avant ou après
- CHAQUE scène doit référencer exactement où elle provient dans le script
- shot_type: "wide" (plan large) | "medium" (plan moyen) | "close-up" (gros plan)
- camera_move: "static" (fixe) | "pan" (panoramique) | "tilt" (vertical) | "zoom"
- cadre: toujours parmi "Bureau", "Extérieur", "Intérieur" OU autre si spécifié dans le script
- emotion: courte (ex: "enthousiasme", "concentration", "essoufflement")
- storyboard_focus: l'idée CLÉ à montrer visuellement
- notes: détails spécifiques du tournage (ex: "Gros plan sur les écouteurs", "Son isolé")
- transition: "Coupe nette", "Fondu", "Transition", "Aucune", ou null
- script_reference: le numéro ou titre de la section dans le script (TRÈS IMPORTANT)
- GARDER l'ordre du script (pas de réarrangement)
- Nombre de scènes = nombre de sections/cadres distincts dans le script
- JSON VALIDE ET PARSEABLE
`;

    try {
      console.log('[/generate-storyboard] Appel GPT-5 pour générer storyboard JSON...');
      
      const analysis = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [{ role: 'user', content: prompt }]
      });

      const raw = analysis.choices?.[0]?.message?.content || '[]';
      console.log('[/generate-storyboard] Réponse reçue, longueur:', raw.length);

      let scenes;
      try {
        scenes = JSON.parse(raw);
      } catch (e) {
        // Essayer d'extraire le JSON s'il y a du texte autour
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          scenes = JSON.parse(jsonMatch[0]);
        } else {
          console.error('[/generate-storyboard] JSON parse error:', e.message);
          console.error('[/generate-storyboard] Raw response (first 500 chars):', raw.substring(0, 500));
          return res.status(500).json({ 
            error: 'JSON storyboard invalide',
            details: e.message
          });
        }
      }

      if (!Array.isArray(scenes) || scenes.length === 0) {
        return res.status(500).json({ 
          error: 'Aucune scène générée',
          received_type: typeof scenes,
          length: Array.isArray(scenes) ? scenes.length : 'N/A'
        });
      }

      console.log(`[/generate-storyboard] ✅ ${scenes.length} scènes générées`);

      return res.json({
        product_name: scriptData.split('\n')[0] || 'Product',
        scenes: scenes,
        total_scenes: scenes.length
      });

    } catch (err) {
      console.error('[/generate-storyboard] OpenAI error:', err.message);
      return res.status(500).json({ 
        error: 'Erreur lors de la génération du storyboard',
        details: err.message
      });
    }
  } catch (err) {
    console.error('[/generate-storyboard] Error:', err.message);
    return res.status(500).send('Erreur lors du traitement du fichier');
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
});

// Fonction pour parser le storyboard et extraire les scènes
function parseStoryboardScenes(storyboardText) {
  const scenes = [];
  const lines = storyboardText.split('\n');
  let currentScene = null;
  let description = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Détecter le début d'une nouvelle scène
    const sceneMatch = trimmedLine.match(/^(Scène|SCENE|Scene)\s*(\d+)/i);
    
    if (sceneMatch) {
      // Sauvegarder la scène précédente si elle existe
      if (currentScene) {
        scenes.push({
          number: currentScene.number,
          title: currentScene.title,
          description: description.trim()
        });
      }
      
      // Commencer une nouvelle scène
      currentScene = {
        number: sceneMatch[2],
        title: trimmedLine
      };
      description = '';
    } else if (currentScene && trimmedLine) {
      // Collecter la description de la scène (limiter pour ne pas avoir trop de texte)
      if (description.length < 2000) {
        description += trimmedLine + '\n';
      }
    }
  }

  // Ajouter la dernière scène
  if (currentScene) {
    scenes.push({
      number: currentScene.number,
      title: currentScene.title,
      description: description.trim()
    });
  }

  return scenes;
}

// Endpoint : Génération d'image pour une scène de storyboard via DALL-E
app.post('/generate-scene-image', async (req, res) => {
  try {
    const { sceneNumber, sceneDescription } = req.body;

    if (!sceneDescription) {
      return res.status(400).json({ error: 'Description de scène manquante' });
    }

    console.log(`[/generate-scene-image] Génération DALL-E pour scène ${sceneNumber}`);

    const dallePrompt = `Storyboard frame, cinematic pencil sketch, grayscale, white background, black border. Scene ${sceneNumber}. Description: ${sceneDescription}. Include overlays: thick yellow transition arrow, white cartouche top-right 'Cadre: scène ${sceneNumber}', blue zoom/tactile +/- icons, bold centered feature text if mentioned. Clean HD.`;

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural'
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    if (!imageUrl) throw new Error('Pas d\'URL retournée par DALL-E');

    return res.json({ 
      success: true,
      imageUrl: imageUrl,
      sceneNumber: sceneNumber
    });

  } catch (err) {
    console.error('Error /generate-scene-image:', err);
    return res.status(500).json({ 
      error: 'Erreur lors de la génération de l\'image',
      details: err.message 
    });
  }
});

// Endpoint: extraction smartphone -> LLM strict JSON -> validation
app.post('/extract-smartphone', upload.single('document'), async (req, res) => {
  // Rediriger vers la route générique
  req.body.productType = 'smartphone';
  return extractProduct(req, res);
});

// Route générique d'extraction pour tous types de produits
app.post('/extract-product', upload.single('document'), async (req, res) => {
  return extractProduct(req, res);
});

// Fonction générique d'extraction
async function extractProduct(req, res) {
  const filePath = req.file && req.file.path;
  const sourceName = (req.file && req.file.originalname) || req.body.source || 'input';
  const productType = req.body.productType || 'smartphone'; // Par défaut smartphone

  // Configuration des types de produits
  const productConfigs = {
    smartphone: {
      template: 'smartphone_template.json',
      prompt: 'smartphone_prompt.txt',
      validator: 'validate_smartphone.js'
    },
    audio: {
      template: 'audio_template.json',
      prompt: 'audio_prompt.txt',
      validator: 'validate_audio.js'
    },
    tv: {
      template: 'tv_template.json',
      prompt: 'tv_prompt.txt',
      validator: 'validate_tv.js'
    },
    casques: {
      template: 'casques_template.json',
      prompt: 'casques_prompt.txt',
      validator: 'validate_casques.js'
    },
    friteuse: {
      template: 'friteuse_template.json',
      prompt: 'friteuse_prompt.txt',
      validator: 'validate_friteuse.js'
    }
  };

  const config = productConfigs[productType];
  if (!config) {
    return res.status(400).json({ ok: false, error: 'Type de produit non supporté: ' + productType });
  }

  try {
    let extractedText = '';
    if (filePath) {
      if (req.file.mimetype === 'application/pdf') extractedText = await readPDF(filePath);
      else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') extractedText = await readDOCX(filePath);
      else if (req.file.mimetype === 'text/plain') extractedText = fs.readFileSync(filePath, 'utf8');
      else return res.status(400).json({ ok: false, error: 'Type de fichier non supporté' });
    } else if (req.body && req.body.text) {
      extractedText = String(req.body.text);
    } else {
      return res.status(400).json({ ok: false, error: 'Aucun fichier ni texte fourni' });
    }

    console.log(`[/extract-product/${productType}] Extracted text length:`, extractedText.length);

    const promptTemplate = fs.readFileSync(path.join(__dirname, '..', 'templates', config.prompt), 'utf8');

    // Load the full template and generate a JSON skeleton
    const templatePath = path.join(__dirname, '..', 'templates', config.template);
    const templateObj = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    function buildSkeleton(node) {
      if (!node || typeof node !== 'object') return null;
      if (Object.prototype.hasOwnProperty.call(node, 'type')) {
        return null;
      }
      const out = Array.isArray(node) ? [] : {};
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'type')) {
          out[k] = null;
        } else if (v && typeof v === 'object') {
          out[k] = buildSkeleton(v);
        } else {
          out[k] = null;
        }
      }
      return out;
    }
    const schemaSkeleton = buildSkeleton(templateObj);
    const schemaString = JSON.stringify(schemaSkeleton, null, 2);

    // Truncate extracted text if too long
    const maxWords = 30000;
    const words = extractedText.split(/\s+/);
    let truncatedText = extractedText;
    if (words.length > maxWords) {
      truncatedText = words.slice(0, maxWords).join(' ');
      console.log(`[/extract-product/${productType}] Truncated from`, words.length, 'to', maxWords, 'words');
    } else {
      console.log(`[/extract-product/${productType}] Using full text:`, words.length, 'words');
    }

    // Build prompt
    const prompt = `${promptTemplate}\n\nSCHEMA JSON (exact keys and nesting to follow):\n${schemaString}\n\nSOURCE: ${sourceName}\n\nTEXTE COMPLET DU DOCUMENT:\n${truncatedText}\n\n═══════════════════════════════════════════════════════════\n⚠️ IMPÉRATIF: Extrais ABSOLUMENT TOUTES les informations du texte ci-dessus.\n- Lis ligne par ligne, cherche CHAQUE spec\n- Ne saute AUCUNE info, même mineure\n- Si une info ne correspond à aucun champ du schéma, ajoute-la dans "autres_informations.infos_supplementaires"\n- Format pour infos supplémentaires: "Clé: valeur | Clé: valeur"\n- Renvoie UNIQUEMENT l'objet JSON final. Mets null si une donnée est absente.`;

    // Call OpenAI
    let llmResp;
    try {
      llmResp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 16000
      });
    } catch (err) {
      console.error(`OpenAI error /extract-product/${productType}:`, err.message);
      return res.status(500).json({ ok: false, error: 'OpenAI API error: ' + err.message });
    }

    const rawContent = llmResp && llmResp.choices && llmResp.choices[0] && llmResp.choices[0].message ? llmResp.choices[0].message.content : '';

    // Extract JSON
    let jsonText = null;
    try {
      const m = rawContent.match(/\{[\s\S]*\}/);
      if (m) jsonText = m[0];
      else jsonText = rawContent;
    } catch (e) {
      jsonText = rawContent;
    }

    // Save extracted JSON
    const ts = Date.now();
    const extractedFile = path.join(uploadDir, `extracted-${ts}.json`);
    fs.writeFileSync(extractedFile, jsonText, 'utf8');

    // Run validator if exists
    const normalizedFile = path.join(uploadDir, `normalized-${ts}.json`);
    const validatorPath = path.join(__dirname, '..', 'tools', config.validator);
    
    // Vérifier si le validateur existe
    if (!fs.existsSync(validatorPath)) {
      console.log(`[/extract-product/${productType}] Validator not found, returning raw JSON`);
      if (filePath) fs.unlink(filePath, () => {});
      try {
        const parsed = JSON.parse(jsonText);
        return res.json({ ok: true, normalized: parsed, warning: 'no_validator' });
      } catch (e) {
        return res.json({ ok: false, warning: 'parse_failed', raw: rawContent });
      }
    }

    console.log(`[/extract-product/${productType}] Running validator:`, validatorPath);
    execFile(process.execPath, [validatorPath, extractedFile, normalizedFile], { windowsHide: true }, (err, stdout, stderr) => {
      if (filePath) fs.unlink(filePath, () => {});
      if (err) {
        console.error('Validator error:', err, stderr);
        return res.json({ ok: false, warning: 'validation_failed', raw: rawContent });
      }

      // Read normalized result
      try {
        const normalized = fs.readFileSync(normalizedFile, 'utf8');
        const parsed = JSON.parse(normalized);
        // Clean temp files
        fs.unlink(extractedFile, () => {});
        fs.unlink(normalizedFile, () => {});
        return res.json({ ok: true, normalized: parsed });
      } catch (e) {
        console.error('Erreur lecture normalised file:', e);
        return res.json({ ok: false, warning: 'parse_normalized_failed', raw: rawContent });
      }
    });

  } catch (err) {
    console.error('/extract-product error:', err.message, err.stack);
    if (filePath) fs.unlink(filePath, () => {});
    res.status(500).json({ ok: false, error: 'Internal server error: ' + err.message });
  }
}

// Endpoint pour convertir/merger des fichiers en PDF
// Attends plusieurs fichiers (pdf/docx/txt). Retourne un PDF fusionné téléchargeable.
app.post("/merge", upload.array("documents", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("Aucun fichier fourni");
  }

  try {
    // Créer un nouveau document PDF final
    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const p = file.path;
      if (file.mimetype === "application/pdf") {
        // Charger le PDF et copier ses pages
        const existingPdfBytes = fs.readFileSync(p);
        const pdfToAppend = await PDFDocument.load(existingPdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfToAppend, pdfToAppend.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } else if (file.mimetype === "text/plain") {
        // Convertir texte simple en PDF (une page par 1000 caractères environ)
        const text = fs.readFileSync(p, "utf8");
        const page = mergedPdf.addPage();
        const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const { width, height } = page.getSize();
        const margin = 40;
        const maxWidth = width - margin * 2;
        const lines = splitTextToLines(text, font, fontSize, maxWidth);
        let cursorY = height - margin;
        for (const line of lines) {
          if (cursorY < margin + fontSize) {
            // nouvelle page
            cursorY = height - margin;
            mergedPdf.addPage();
          }
          const currentPage = mergedPdf.getPages()[mergedPdf.getPages().length - 1];
          currentPage.drawText(line, {
            x: margin,
            y: cursorY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          cursorY -= fontSize + 4;
        }
      } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // Extraire texte du DOCX avec mammoth puis convertir comme texte
        const result = await mammoth.extractRawText({ path: p });
        const text = result.value || "";
        const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const { width, height } = mergedPdf.addPage().getSize();
        // la précédente addPage crée une page déjà ajoutée; on va remplir les pages par la même logique que pour text
        const maxWidth = width - 40 * 2;
        const lines = splitTextToLines(text, font, fontSize, maxWidth);
        let cursorY = height - 40;
        for (const line of lines) {
          if (cursorY < 40 + fontSize) {
            cursorY = height - 40;
            mergedPdf.addPage();
          }
          const currentPage = mergedPdf.getPages()[mergedPdf.getPages().length - 1];
          currentPage.drawText(line, {
            x: 40,
            y: cursorY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          cursorY -= fontSize + 4;
        }
      }
    }

    const mergedPdfBytes = await mergedPdf.save();

    // Nettoyer les fichiers uploadés
    req.files.forEach((f) => {
      fs.unlink(f.path, (err) => {
        if (err) console.error("Erreur suppression upload:", err);
      });
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=merged-${Date.now()}.pdf`);
    return res.send(Buffer.from(mergedPdfBytes));
  } catch (err) {
    console.error("Erreur merge:", err);
    return res.status(500).send("Erreur lors de la conversion/merge des fichiers");
  }
});

// Utilitaire local pour couper le texte en lignes respectant la largeur
function splitTextToLines(text, font, fontSize, maxWidth) {
  const words = text.replace(/\r\n/g, " \n ").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
    if (word === "\n") {
      lines.push(line);
      line = "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
