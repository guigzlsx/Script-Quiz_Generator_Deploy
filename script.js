document
  .getElementById("uploadButton")
  .addEventListener("click", envoyerRequete);

// darkModeToggle removed from UI - dark mode will be set by default or from localStorage

document
  .getElementById("clearScriptButton")
  .addEventListener("click", clearScript);

// Bouton 'Supprimer tout' : efface le script, le quiz et masque les résultats
const clearAllBtn = document.getElementById("clearAllButton");
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", () => {
    // Effacer le stockage local
    localStorage.removeItem("generatedScript");
    // Vider les éléments d'affichage
    const scriptOutput = document.getElementById("scriptOutput");
    const resultDiv = document.getElementById("result");
    const quizOutput = document.getElementById("quizOutput");
    if (scriptOutput) scriptOutput.textContent = "";
    if (quizOutput) quizOutput.innerText = "";
    if (resultDiv) resultDiv.style.display = "none";
    // Masquer le bouton après suppression
    clearAllBtn.style.display = "none";
  });
}

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

  // Ajouter info complémentaire (facultatif)
  const extraInfoEl = document.getElementById("extraInfo");
  if (extraInfoEl && extraInfoEl.value.trim()) {
    formData.append("extraInfo", extraInfoEl.value.trim());
  } else {
    formData.append("extraInfo", "");
  }

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
      // Afficher le bouton Supprimer tout
      const clearAllBtn = document.getElementById("clearAllButton");
      if (clearAllBtn) clearAllBtn.style.display = "block";
    } else {
      scriptOutput.textContent = "Aucun script généré.";
      quizOutput.innerText = "";
    }

    resultDiv.style.display = "block"; // Afficher le résultat

    // ➡ Au lieu de scroller directement, on sauvegarde un indicateur et on recharge la page
    localStorage.setItem("scrollToResult", "true");
    location.reload();
  } catch (error) {
    console.error("Erreur:", error);
    alert("Une erreur s'est produite : " + error.message);
  } finally {
    loader.style.display = "none"; // Masquer le loader
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const burgerIcon = document.querySelector(".burger-icon");
  const menuItems = document.querySelector(".menu-items");

  if (burgerIcon && menuItems) {
    burgerIcon.addEventListener("click", function (e) {
      // Prevent the document click handler from immediately closing the menu
      e.stopPropagation();
      burgerIcon.classList.toggle("active");
      menuItems.classList.toggle("active");
    });

    // Prevent clicks inside the menu from closing it
    menuItems.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

  // Fermer le menu si on clique en dehors
  document.addEventListener("click", function (event) {
    if (!burgerIcon || !menuItems) return;
    if (!burgerIcon.contains(event.target) && !menuItems.contains(event.target)) {
      burgerIcon.classList.remove("active");
      menuItems.classList.remove("active");
    }
  });

  // ...existing code...

  // Support du mode sombre existant: set dark mode by default if not set
  if (!localStorage.getItem('darkMode')) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const dropZone = document.querySelector(".file-upload-container");
  const fileInput = document.getElementById("fileInput");

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

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

  dropZone.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;

    const fileName = files[0] ? files[0].name : "Choisir un fichier";
    const label = document.querySelector(".custom-file-upload");
    label.textContent = fileName;
  }
});

document.getElementById("fileInput").addEventListener("change", function () {
  const fileName = this.files[0] ? this.files[0].name : "Choisir un fichier";
  const label = document.querySelector(".custom-file-upload");
  label.textContent = fileName;
});

function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark-mode");

  const isDarkMode = body.classList.contains("dark-mode");
  saveDarkModeToLocalStorage(isDarkMode);
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

    // Si on vient de recharger après génération, scroller avec délai
    if (localStorage.getItem("scrollToResult") === "true") {
      setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: "smooth" });
        localStorage.removeItem("scrollToResult");
      }, 300);
    }

    window._lastQuizText = "";
    const quizMatch = savedScript.match(/\[QUIZ\][\s\S]*/);
    if (quizMatch) {
      window._lastQuizText = quizMatch[0].trim();
    }
  }

  const isDarkMode = loadDarkModeFromLocalStorage();
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
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

    if (
      line.startsWith("Les asterisques") ||
      line.startsWith("les #1") ||
      line.startsWith("Les #1")
    ) {
      return;
    }

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

  worksheet.columns = [
    { header: "ID", key: "id", width: 20 },
    { header: "Question et Réponses", key: "question", width: 80 },
  ];

  quizJson.questions.forEach((item) => {
    const questionRow = worksheet.addRow({
      id: item.id,
      question: item.question,
    });

    item.answers.forEach((answer) => {
      const answerRow = worksheet.addRow({
        id: "",
        question: answer,
      });

      if (/#1|\*/.test(answer)) {
        const cell = worksheet.getCell(`B${answerRow.number}`);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "8CF09F" },
        };
      }
    });

    const emptyRow = worksheet.addRow({
      id: "",
      question: "",
    });

    worksheet.mergeCells(`A${questionRow.number}:A${emptyRow.number}`);

    const totalHeight = (item.answers.length + 1) * 30;
    questionRow.height = totalHeight;

    const questionCell = worksheet.getCell(`B${questionRow.number}`);
    questionCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9D9D9" },
    };
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 14, name: "Arial" };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFAA" },
  };

  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    row.height = 60;
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

      if (!cell.fill) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFF" },
        };
      }

      if (rowNumber !== 1) {
        cell.font = { size: 12, name: "Arial" };
      }
    });
  });

  const productTitle = quizJson.quizTitle;
  const productTitle1 = productTitle.replace("[QUIZ] ", "").trim();
  const fileName = `Topcoach QUIZ ${productTitle1}.xlsx`;

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

function getCleanScriptText() {
  const scriptOutput = document.getElementById("scriptOutput");
  return scriptOutput.innerText.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

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
