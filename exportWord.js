// Export Word (DOCX) stylisé pour le script
export async function exportScriptToDocx(text) {
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
