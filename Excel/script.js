document.addEventListener("DOMContentLoaded", function () {
  const generateExcelButton = document.getElementById("generateExcel");
  const previewExcelButton = document.getElementById("previewExcel");

  if (generateExcelButton) {
    generateExcelButton.addEventListener("click", function () {
      // Lire le contenu de la zone de texte
      const quizText = document.getElementById("quizText").value;

      // Convertir le texte en JSON
      const quizJson = parseQuizText(quizText);

      // Générer le fichier Excel
      generateExcel(quizJson);
    });
  }

  if (previewExcelButton) {
    previewExcelButton.addEventListener("click", function () {
      // Lire le contenu de la zone de texte
      const quizText = document.getElementById("quizText").value;

      // Convertir le texte en JSON
      const quizJson = parseQuizText(quizText);

      // Afficher la prévisualisation
      previewExcel(quizJson);
    });
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
    if (line.startsWith("Q")) {
      if (currentQuestion) {
        quizJson.questions.push(currentQuestion);
      }
      currentQuestion = {
        id: line.split("\t")[0],
        question: line.split("\t")[1],
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

function previewExcel(quizJson) {
  const worksheetData = [["ID", "Question et Réponses"]];

  quizJson.questions.forEach((item) => {
    worksheetData.push([item.id, item.question]);
    item.answers.forEach((answer) => {
      worksheetData.push(["", answer]);
    });
    worksheetData.push(["", ""]); // Ligne vide après les réponses
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz");

  const html = XLSX.utils.sheet_to_html(worksheet);
  const previewContainer = document.getElementById("previewContainer");
  previewContainer.innerHTML = html;

  // Ajouter la classe highlight aux bonnes réponses
  const rows = previewContainer.querySelectorAll("tr");
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    cells.forEach((cell) => {
      if (/#1|\*/.test(cell.innerText)) {
        cell.classList.add("highlight");
      }
    });
  });

  // Ajouter le titre "Topcoach QUIZ"

  const title = document.createElement("h1");
  title.innerText = "Topcoach";
  title.classList.add("quiz-title");
  previewContainer.prepend(title);

  // Appliquer les classes CSS pour le style
  previewContainer.querySelectorAll("table").forEach((table) => {
    table.classList.add("preview-table");
  });
  previewContainer.querySelectorAll("th").forEach((th) => {
    th.classList.add("preview-th");
  });
  previewContainer.querySelectorAll("td").forEach((td) => {
    td.classList.add("preview-td");
  });
}
