document
  .getElementById("uploadButton")
  .addEventListener("click", envoyerRequete);

document
  .getElementById("darkModeToggle")
  .addEventListener("click", toggleDarkMode);

document
  .getElementById("clearScriptButton")
  .addEventListener("click", clearScript);

async function envoyerRequete() {
  const fileInput = document.getElementById("fileInput");
  const loader = document.getElementById("loader");
  const scriptOutput = document.getElementById("scriptOutput");
  const quizOutput = document.getElementById("quizOutput");
  const resultDiv = document.getElementById("result");

  // Vérifier si un fichier a été sélectionné
  if (fileInput.files.length === 0) {
    alert("Veuillez sélectionner un fichier.");
    return;
  }

  loader.style.display = "block"; // Afficher le loader
  resultDiv.style.display = "none"; // Masquer le résultat

  const formData = new FormData();
  formData.append("document", fileInput.files[0]);
  formData.append(
    "inEnglish",
    document.getElementById("englishOption").checked
  );

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    // Vérifier si la réponse est OK
    if (!response.ok) {
      throw new Error(
        "Erreur lors du chargement du fichier : " + response.statusText
      );
    }

    const data = await response.json();

    // Vérifier si les données contiennent un script et un quiz
    if (data.script) {
      scriptOutput.textContent = data.script; // Afficher le script
      saveScriptToLocalStorage(data.script); // Sauvegarder le script dans le stockage local
      // Ne plus afficher le quiz en doublon dans #quizOutput
      quizOutput.innerText = "";
    } else {
      scriptOutput.textContent = "Aucun script généré.";
      quizOutput.innerText = "";
    }

    resultDiv.style.display = "block"; // Afficher le résultat

    // Scroll automatique vers le résultat
    resultDiv.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Erreur:", error);
    alert("Une erreur s'est produite : " + error.message); // Afficher un message d'erreur à l'utilisateur
  } finally {
    loader.style.display = "none"; // Masquer le loader
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const burgerIcon = document.querySelector(".burger-icon");
  const menuItems = document.querySelector(".menu-items");

  burgerIcon.addEventListener("click", function () {
    burgerIcon.classList.toggle("active");
    menuItems.classList.toggle("active");
  });

  // Fermer le menu si on clique en dehors
  document.addEventListener("click", function (event) {
    if (
      !burgerIcon.contains(event.target) &&
      !menuItems.contains(event.target)
    ) {
      burgerIcon.classList.remove("active");
      menuItems.classList.remove("active");
    }
  });

  // Support du mode sombre existant
  const darkModeToggle = document.getElementById("darkModeToggle");
  darkModeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const dropZone = document.querySelector(".file-upload-container");
  const fileInput = document.getElementById("fileInput");

  // Empêche le comportement par défaut du navigateur lors du glisser-déposer
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Ajoute visuellement que le drag est sur la zone
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropZone.classList.add("dragover");
  }

  function unhighlight() {
    dropZone.classList.remove("dragover");
  }

  // Gestion du drop
  dropZone.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;

    // Mise à jour du texte du label avec le nom du fichier
    const fileName = files[0] ? files[0].name : "Choisir un fichier";
    const label = document.querySelector(".custom-file-upload");
    label.textContent = fileName;
  }
});

document.getElementById("fileInput").addEventListener("change", function () {
  const fileName = this.files[0] ? this.files[0].name : "Choisir un fichier";
  const label = document.querySelector(".custom-file-upload");
  label.textContent = fileName; // Remplace le texte du label par le nom du fichier
});

function toggleDarkMode() {
  const body = document.body;
  const darkModeToggle = document.getElementById("darkModeToggle");

  body.classList.toggle("dark-mode");

  const isDarkMode = body.classList.contains("dark-mode");
  saveDarkModeToLocalStorage(isDarkMode);

  darkModeToggle.textContent = isDarkMode ? "Light mode" : "Dark mode";
}

function saveDarkModeToLocalStorage(isDarkMode) {
  localStorage.setItem("darkMode", isDarkMode ? "enabled" : "disabled");
}

function loadDarkModeFromLocalStorage() {
  return localStorage.getItem("darkMode") === "enabled";
}

function saveScriptToLocalStorage(script) {
  localStorage.setItem("generatedScript", script);
}

function loadScriptFromLocalStorage() {
  return localStorage.getItem("generatedScript");
}

function clearScript() {
  localStorage.removeItem("generatedScript");
  const scriptOutput = document.getElementById("scriptOutput");
  const resultDiv = document.getElementById("result");
  scriptOutput.textContent = "";
  resultDiv.style.display = "none";
}

window.addEventListener("load", function () {
  const savedScript = loadScriptFromLocalStorage();
  if (savedScript) {
    const scriptOutput = document.getElementById("scriptOutput");
    const resultDiv = document.getElementById("result");
    scriptOutput.textContent = savedScript;
    resultDiv.style.display = "block";
    // Extraction du quiz pour l'export (pas d'affichage)
    window._lastQuizText = "";
    const quizMatch = savedScript.match(/\[QUIZ\][\s\S]*/);
    if (quizMatch) {
      window._lastQuizText = quizMatch[0].trim();
    }
  }
  // Charger l'état du mode sombre
  const isDarkMode = loadDarkModeFromLocalStorage();
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
    document.getElementById("darkModeToggle").textContent = "Light mode";
  }
});

function parseQuizText(quizText) {
  const lines = quizText.split("\n");
  const quizJson = {
    quizTitle: lines[0].trim(),
    questions: [],
  };

  let currentQuestion = null;

  lines.slice(1).forEach((line) => {
    line = line.trim();

    // Ignore les lignes d'instructions
    if (
      line.startsWith("Les asterisques") ||
      line.startsWith("les #1") ||
      line.startsWith("Les #1")
    ) {
      return;
    }

    // Accepte tabulation OU plusieurs espaces comme séparateur
    const questionMatch = line.match(/^(Q\d+)[\t ]+(.+)/);
    if (questionMatch) {
      if (currentQuestion) {
        quizJson.questions.push(currentQuestion);
      }
      currentQuestion = {
        id: questionMatch[1],
        question: questionMatch[2],
        answers: [],
      };
    } else if (line) {
      if (currentQuestion) {
        currentQuestion.answers.push(line);
      }
    }
  });

  if (currentQuestion) {
    quizJson.questions.push(currentQuestion);
  }

  return quizJson;
}

async function generateExcel(quizJson) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Quiz");

  // Définir les colonnes avec une largeur plus grande
  worksheet.columns = [
    { header: "ID", key: "id", width: 20 },
    { header: "Question et Réponses", key: "question", width: 80 },
  ];

  // Ajouter les données
  quizJson.questions.forEach((item) => {
    // Ajouter la question
    const questionRow = worksheet.addRow({
      id: item.id,
      question: item.question,
    });

    // Ajouter les réponses
    item.answers.forEach((answer) => {
      const answerRow = worksheet.addRow({
        id: "",
        question: answer,
      });

      // Appliquer le style pour les bonnes réponses
      if (/#1|\*/.test(answer)) {
        const cell = worksheet.getCell(`B${answerRow.number}`);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "8CF09F" }, // Vert spécifique en RVB (140, 240, 159)
        };
      }
    });

    // Ajouter une ligne vide après les réponses pour créer de l'espace
    const emptyRow = worksheet.addRow({
      id: "",
      question: "",
    });

    // Fusionner les cellules de la colonne ID avec la ligne vide
    worksheet.mergeCells(`A${questionRow.number}:A${emptyRow.number}`);

    // Ajuster la hauteur de la ligne de la question pour correspondre à la hauteur totale des réponses
    const totalHeight = (item.answers.length + 1) * 30; // 30 est la hauteur par défaut d'une ligne
    questionRow.height = totalHeight;

    // Appliquer le style pour les cellules contenant les questions
    const questionCell = worksheet.getCell(`B${questionRow.number}`);
    questionCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9D9D9" }, // Gris spécifique en RVB (217, 217, 217)
    };
  });

  // Appliquer les styles
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 14, name: "Arial" };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFAA" },
  };

  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    row.height = 60; // Augmenter la hauteur des lignes
    row.eachCell({ includeEmpty: false }, function (cell) {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        wrapText: true,
        vertical: "middle",
        horizontal: "left",
      };

      // Appliquer un style de remplissage par défaut si aucun style n'a été appliqué
      if (!cell.fill) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFF" }, // Couleur blanche par défaut
        };
      }

      // Appliquer une taille de police pour les autres cellules que l'en-tête
      if (rowNumber !== 1) {
        cell.font = { size: 12, name: "Arial" };
      }
    });
  });

  // Extraire le titre du produit
  const productTitle = quizJson.quizTitle;
  const productTitle1 = productTitle.replace("[QUIZ] ", "").trim();

  // Construire le nom du fichier avec le titre du produit
  const fileName = `Topcoach QUIZ ${productTitle1}.xlsx`;

  // Générer le fichier Excel
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById("exportQuizExcel").addEventListener("click", async function () {
  let quizText = "";
  // Prend le quiz extrait au chargement si dispo, sinon extrait du script affiché
  if (window._lastQuizText) {
    quizText = window._lastQuizText;
  } else {
    const scriptText = document.getElementById("scriptOutput").innerText.trim();
    const quizMatch = scriptText.match(/\[QUIZ\][\s\S]*/);
    if (quizMatch) {
      quizText = quizMatch[0].trim();
    }
  }
  if (!quizText) {
    alert("Aucun quiz à exporter.");
    return;
  }
  const quizJson = parseQuizText(quizText);
  await generateExcel(quizJson);
});

// Fonction utilitaire pour normaliser le texte du script via un textarea caché
function getCleanScriptText() {
  const scriptOutput = document.getElementById("scriptOutput");
  // Utilise innerText pour conserver les vrais retours à la ligne
  return scriptOutput.innerText.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

// Fonction d'export Word (DOCX) stylisée pour le script
async function exportScriptToDocx(text) {
  if (!window.docx) {
    alert("La bibliothèque docx n'est pas chargée correctement. Vérifiez la connexion internet ou le chargement du script docx.");
    console.error("docx library not loaded: window.docx =", window.docx);
    return;
  }
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

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const uniqueLines = [...new Set(lines)];
  const title = uniqueLines[0];
  const keywordsIndex = uniqueLines.findIndex(
    (line) =>
      line.toLowerCase().includes("mots-clés associés") ||
      line.toLowerCase().includes("keywords")
  );
  const description =
    keywordsIndex === -1
      ? uniqueLines.slice(1)
      : uniqueLines.slice(1, keywordsIndex);
  const keywords =
    keywordsIndex !== -1 ? uniqueLines.slice(keywordsIndex + 1) : [];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "[SCRIPT] ",
                bold: true,
                color: "808080",
                size: 32,
                font: "Arial",
              }),
              new TextRun({
                text: title.replace("[SCRIPT] ", ""),
                bold: true,
                size: 32,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          ...description.flatMap((line) =>
            line
              .split(".")
              .filter((sentence) => sentence.trim() !== "")
              .map(
                (sentence) =>
                  new Paragraph({
                    bullet: { level: 0 },
                    spacing: { after: 200 },
                    children: [
                      new TextRun({
                        text: sentence.trim() + ".",
                        size: 20,
                        font: "Arial",
                      }),
                    ],
                  })
              )
          ),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          ...(keywords.length > 0
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "MOTS-CLÉS ASSOCIÉS",
                      bold: true,
                      size: 24,
                      font: "Arial",
                    }),
                  ],
                }),
                new Table({
                  width: { size: 70, type: "pct" },
                  alignment: AlignmentType.CENTER,
                  rows: keywords.map(
                    (keyword) =>
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                  new TextRun({
                                    text: keyword,
                                    size: 18,
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

  const blob = await Packer.toBlob(doc);
  const productTitle = title.replace("[SCRIPT] ", "").trim();
  const fileName = `Topcoach SCRIPT ${productTitle}.docx`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById("exportScriptDocx").addEventListener("click", async function () {
  console.log("Clic sur le bouton Exporter le script en DOCX");
  let scriptText = getCleanScriptText();
  console.log("Texte récupéré par getCleanScriptText :", scriptText);
  if (!scriptText) {
    alert("Aucun script à exporter.");
    return;
  }
  let scriptOnly = scriptText.split("[QUIZ]")[0].trim();
  await exportScriptToDocx(scriptOnly);
});

console.log("script.js chargé !");
