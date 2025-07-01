// Ajout d'un écouteur d'événement pour le formulaire de soumission
document
  .getElementById("textForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Empêche le comportement par défaut de soumission du formulaire
    const text = document.getElementById("textInput").value; // Récupère la valeur du champ de texte
    generateDocx(text); // Appelle la fonction pour générer le document DOCX
  });

// Fonction asynchrone pour générer un document DOCX
async function generateDocx(text) {
  if (!window.docx) {
    alert("La bibliothèque docx n'est pas chargée correctement."); // Alerte si la bibliothèque docx n'est pas chargée
    return;
  }

  // Déstructuration des objets nécessaires de la bibliothèque docx
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
  } = window.docx;

  // Séparer les parties du texte
  const lines = text
    .split("\n") // Sépare le texte en lignes
    .map((line) => line.trim()) // Supprime les espaces en début et fin de chaque ligne
    .filter((line) => line.length > 0); // Retire les lignes vides

  // Éliminer les doublons
  const uniqueLines = [...new Set(lines)];

  const title = uniqueLines[0]; // La première ligne devient le titre
  const keywordsIndex = uniqueLines.findIndex(
    (line) =>
      line.toLowerCase().includes("mots-clés associés") ||
      line.toLowerCase().includes("keywords")
  );

  // Si on trouve des mots-clés, séparer description et mots-clés
  const description =
    keywordsIndex === -1
      ? uniqueLines.slice(1)
      : uniqueLines.slice(1, keywordsIndex);
  const keywords =
    keywordsIndex !== -1 ? uniqueLines.slice(keywordsIndex + 1) : [];

  // Création du document DOCX
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Titre avec le mot [SCRIPT] en gris et le reste en noir et gras
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "[SCRIPT] ",
                bold: true,
                color: "808080", // Gris
                size: 32,
                font: "Arial",
              }),
              new TextRun({
                text: title.replace("[SCRIPT] ", ""),
                bold: true,
                size: 32, // Noir par défaut
                font: "Arial",
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 200 } }), // Espacement après le titre

          // Description sous forme de liste à puces
          ...description.flatMap((line) =>
            line
              .split(".")
              .filter((sentence) => sentence.trim() !== "")
              .map(
                (sentence) =>
                  new Paragraph({
                    bullet: {
                      level: 0,
                    },
                    spacing: { after: 200 },
                    children: [
                      new TextRun({
                        text: sentence.trim() + ".",
                        size: 20, // Taille pour la description
                        font: "Arial",
                      }),
                    ],
                  })
              )
          ),

          new Paragraph({ text: "", spacing: { after: 200 } }), // Espacement après la description

          // Ajouter les mots-clés si présents
          ...(keywords.length > 0
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER, // Centrer le titre des mots-clés
                  children: [
                    new TextRun({
                      text: "MOTS-CLÉS ASSOCIÉS",
                      bold: true,
                      size: 24, // Taille du titre des mots-clés
                      font: "Arial",
                    }),
                  ],
                }),

                // Tableau des mots-clés centré et agrandi
                new Table({
                  width: {
                    size: 70, // Taille du tableau élargie (70% de la largeur)
                    type: "pct", // Utiliser le pourcentage pour la largeur
                  },
                  alignment: AlignmentType.CENTER, // Centrer le tableau sur la page
                  rows: keywords.map(
                    (keyword) =>
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.CENTER, // Centrer les mots-clés dans les cellules
                                children: [
                                  new TextRun({
                                    text: keyword,
                                    size: 18, // Réduire la taille de la police des mots-clés
                                    font: "Arial",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      })
                  ),
                }),
              ]
            : []),
        ],
      },
    ],
  });

  // Générer et télécharger le fichier DOCX
  const blob = await Packer.toBlob(doc); // Convertit le document en blob

  // Extraire le titre du produit
  const productTitle = title.replace("[SCRIPT] ", "").trim();

  // Construire le nom du fichier avec le titre du produit
  const fileName = `Topcoach SCRIPT ${productTitle}.docx`;

  // Créer un lien temporaire pour le téléchargement
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); // Crée une URL pour le blob
  link.download = fileName; // Définit le nom du fichier à télécharger
  document.body.appendChild(link); // Ajoute le lien au document
  link.click(); // Simule un clic sur le lien pour déclencher le téléchargement
  document.body.removeChild(link); // Supprime le lien du document
}
