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

app.use(express.static(path.join(__dirname, "..")));

// Utiliser CORS
app.use(cors()); // Ajouter cette ligne pour activer CORS

// Configurer l'API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Utiliser la clé depuis les variables d'environnement
});

// Configurer multer pour gérer les fichiers uploadés
const upload = multer({ dest: "uploads/" });

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

    // Définir la limite de tokens
    const maxTokens = 16385;
    const tokens = data.split(" ").length; // Compte des mots

    // Troncature des données si nécessaire
    let truncatedData = data;
    if (tokens > maxTokens) {
      truncatedData = data.split(" ").slice(0, maxTokens).join(" ");
    }

    const inEnglish = req.body.inEnglish === "true";

    // Préparer le prompt
    const prompt = `
    Voici un document :\n${truncatedData}\n
   ${inEnglish ? "JE VEUX QUE LE TOUT SOIT EN ANGLAIS\n" : ""}
     Rédige un script de 290 à 310 mots (TRES TRES IMPORTANT LE NOMBRE DE MOTS) en mettant en avant 5 points clés importants, en adoptant 
     un ton promotionnel et fluide, semblable à cet exemple de structure :


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



IMPORTANT : L’exemple fourni est uniquement là pour comprendre le ton et la structure. 
Tu NE DOIS PAS réutiliser les mêmes phrases, ni la même introduction, ni les mêmes formulations. 
Chaque phrase doit être originale et adaptée au produit. 
Le style attendu est fluide, conversationnel, comme une vidéo YouTube, mais avec des expressions différentes. 
Évite absolument de commencer par "Salut à tous, aujourd'hui on va parler de…" ou "qu'est-ce qu'il a dans le ventre ce petit bijou de technologie ?". 
Inspire-toi du ton, pas du texte.
Ne mets pas de points devant les phrases 
Donc redige moi le script comme demandé au dessus (ce n'est qu'un exemple), a chaque debut de phrase reviens a la ligne, c'est tres important.
Enumere moi ensuite les 5 mots clef (le nom de l'appareil ne doit pas etre un mot clef) tout en sachant que ces mots clef doivent etre présent dans le script.

Ensuite, génère un quiz de 10 questions ORIENTE USAGE AU MAXIMUM avec les formats suivants (Ces 3 formats doivent etre obligatoirement présent dans le quiz) : 
     qcm (minimum une fausse réponse,4 propositions par question, entre 1 et 3 bonnes reponses) +
     vrai ou faux (en argumentant la bonne reponse si necessaire, jusqu'a 80 caracteres max) + texte à trou (avec un seul trou, 4 propositions dont 1 vraie) 
     en utilisant les documents suivants ainsi que les arguments clés.Ces 3 formats sont evidemment à inclure a chaque fois. 
     Pour ces 10 questions indique moi la bonne reponse à chaque fois
     TRES IMPORTANT : JE VEUX QUE LE QUIZZ SOIT ORIENTÉ USAGE, ET QUE LES QUESTIONS SOIENT PERTINENTES POUR LE PRODUIT, METS EN AVANT LES BÉNÉFICES CONCRETS DES CARACTÉRISTIQUES 
     TECHNIQUES DANS DES SCÉNARIOS RÉELS (VOYAGES, SOIRÉES, SPORT, TRAVAIL, DÉTENTE) DANS CHACUNE DES QUESTIONS.


     Je te soumets un exemple de format de quiz que je souhaite obtenir, pour la mise en forme et le fond:
     [QUIZ] XIAOMI 14T et 14T Pro

[QUIZ] XIAOMI 14T et 14T Pro

Q1  L’appareil photo principal du Xiaomi 14T capte plus de lumière, même en faible luminosité, pour des photos plus nettes. Que ne permet-il pas de faire ?
  *Photographier de nuit
  *Réussir ses portraits en intérieur
  *Capturer un coucher de soleil
   Plonger en mer

Q2  Les Xiaomi 14T et 14T Pro disposent de la même durée de recharge.
   Vrai, tous deux se chargent en 45mins.
  *Faux. Le Xiaomi 14T se recharge en 19 minutes tandis que le 14T Pro se recharge en 45 minutes. 

Q3  Avec ses 50 MP, l’appareil photo principal du Xiaomi 14T vous permet de…
   Flouter vos photos
   Agrandir sans perdre en détails
   Avoir uniquement des clichés en noir et blanc
  *Immortaliser chaque détail avec précision

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



Les asterisques (*) indiquent les bonnes réponses. Assure-toi de les inclure dans le quiz.
les #1 indiquent les bonnes reponses uniquement sur les textes a trou.
Cette structure est primordiale pour la génération du quiz.

Le texte doit etre dans la polisse calibri 
JE VEUX EXACTEMENT LE MEME FORMAT DE QUIZ QUE CELUI CI-DESSUS, HYPER HYPER IMPORTANT, IL YA 1 TABULATION ENTRE LE NUMERO DE LA QUESTION ET SON ENONCé 
RESPECTE LES ESPACES ET LES TABULATIONS, JE VEUX EXACTEMENT LES MEME QUE SUR L'EXEMPLE CI-DESSUS C'EST PRIMORDIAL
EVITE LES REDIS ET REPETITIONS DANS LE QUIZ, CHAUQE QUESTION DOIT ETRE UNIQUE, AUCUNE RESSAMBLANCE AVEC UNE AUTRE QUESTION
ET SURTOUT N'INVENTE RIEN DANS LE SCRIPT ET LE QUIZ, TU DOIS TE BASER SUR LE DOCUMENT QUE JE T'AI FOURNI
NE PARLE JAMAIS DE PRIX DANS LE SCRIPT ET LE QUIZ
RESPECTE LES TABULATIONS IL YA 1 TABULATION ENTRE LE NUMERO DE LA QUESTION ET SON ENONCé
Evite a tout prix les redondances
LE QUIZ DOIT ETRE PLUS BASE SUR DES QUESTIONS QUE POURRAIT SE POSER UN CLIENT, IL FAUT QUE LE QUIZ SOIT REALISTE ET UTILISABLE PAR UN CLIENT
LE SCRIPT DOIT PLUS INCARNER LE PRODUIT, ETRE PLUS VIVANT CAR IL EST DESTINé A L'ELABORATION D'UNE VIDEO.
LE SCRIPT DOIT CONTENIR 290 à 310 MOTS

VOICI LE STYLE DE SCRIPT QUE JE VEUX OBTENIR :
Rédige-moi un script de type vidéo YouTube, à la première personne, comme si je parlais directement à ma communauté. Le ton doit être naturel, 
fluide, dynamique, avec des expressions orales ("bon bah", "clairement", "franchement", etc.), un style un peu conversationnel et enthousiaste. 
Le script doit présenter [nom du produit] en décrivant d’abord l'expérience globale, puis les points forts et les défauts, sans être trop technique mais en restant précis. 
Termine par une conclusion qui aide le spectateur à savoir si le produit est fait pour lui.
Je veux que le script soit dans le style des vidéastes tech comme STEVEN, TheiCollection, Jojol, Nowtech ou Brandon Le Proktor : un peu critique, mais objectif, 
passionné et accessible. Fais attention à ne pas juste réciter une fiche technique.






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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
