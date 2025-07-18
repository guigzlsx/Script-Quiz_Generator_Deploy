// Export Excel (XLSX) stylisé pour le quiz
export async function generateExcel(quizJson) {
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
    const emptyRow = worksheet.addRow({ id: "", question: "" });
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