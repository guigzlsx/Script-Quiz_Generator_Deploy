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

// Ne servir que le dossier parent "public" (ici la racine frontend) au lieu de tout le repo
// Remarque: assure-toi que les fichiers statiques front sont bien dans le dossier racine du projet.
app.use(express.static(path.join(__dirname, "..")));

// Utiliser CORS
app.use(cors()); // Ajouter cette ligne pour activer CORS

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

// Fonction pour lire un fichier PDF et le convertir en texte
const readPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
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
   • Vrai ou Faux (argument court, max 80 caractères), la bonne reponse peut etre soit "Vrai" soit "Faux".
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
        model: "gpt-5",
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
