import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const IN_TO_PT = 72;
const FONT_SIZE = 12;
const LINE_HEIGHT = FONT_SIZE * 2; // double-spaced, the standard academic convention

interface PMNode {
  type?: string;
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, any>;
  content?: PMNode[];
}

interface Source {
  key: string;
  author: string;
  title: string;
  year: string;
}

interface Word {
  text: string;
  bold: boolean;
  italic: boolean;
}

function hasMarks(node: PMNode, type: string) {
  return (node.marks || []).some((m) => m.type === type);
}

// Flattens a paragraph's inline content (text/citation/footnote) into a
// flat list of words, each tagged with its own formatting - lets us word-
// wrap correctly even when bold/italic/plain text is mixed in one line.
function inlineToWords(nodes: PMNode[] | undefined, footnoteNotes: string[]): Word[] {
  const words: Word[] = [];
  for (const node of nodes || []) {
    if (node.type === "text") {
      const bold = hasMarks(node, "bold");
      const italic = hasMarks(node, "italic");
      (node.text || "").split(/\s+/).filter(Boolean).forEach((w) => words.push({ text: w, bold, italic }));
    } else if (node.type === "citation") {
      words.push({ text: node.attrs?.label || "", bold: false, italic: false });
    } else if (node.type === "footnote") {
      footnoteNotes.push(node.attrs?.note || "");
      words.push({ text: `[${footnoteNotes.length}]`, bold: false, italic: false });
    }
  }
  return words;
}

export async function exportAcademicToPdf(
  doc: { content?: PMNode[] },
  title: string,
  sources: Source[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
  };

  const pageWidthPt = 8.5 * IN_TO_PT;
  const pageHeightPt = 11 * IN_TO_PT;
  const marginPt = 1 * IN_TO_PT;
  const maxWidthPt = pageWidthPt - marginPt * 2;

  let page: PDFPage = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
  let y = pageHeightPt - marginPt;
  const footnoteNotes: string[] = [];
  const citedKeys: string[] = [];

  function newPage() {
    page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    y = pageHeightPt - marginPt;
  }
  function ensureRoom() {
    if (y < marginPt + LINE_HEIGHT) newPage();
  }

  function fontFor(w: Word): PDFFont {
    if (w.bold && w.italic) return fonts.boldItalic;
    if (w.bold) return fonts.bold;
    if (w.italic) return fonts.italic;
    return fonts.regular;
  }

  function drawWrapped(words: Word[], indentPt = 0, size = FONT_SIZE) {
    let x = marginPt + indentPt;
    const availableWidth = maxWidthPt - indentPt;
    ensureRoom();
    for (const word of words) {
      const font = fontFor(word);
      const wWidth = font.widthOfTextAtSize(word.text + " ", size);
      if (x + wWidth > marginPt + indentPt + availableWidth && x > marginPt + indentPt) {
        y -= LINE_HEIGHT;
        x = marginPt + indentPt;
        ensureRoom();
      }
      page.drawText(word.text, { x, y, size, font, color: rgb(0, 0, 0) });
      x += wWidth;
    }
    y -= LINE_HEIGHT;
  }

  // Title
  const titleFont = fonts.bold;
  const titleWidth = titleFont.widthOfTextAtSize(title, 16);
  ensureRoom();
  page.drawText(title, { x: (pageWidthPt - titleWidth) / 2, y, size: 16, font: titleFont });
  y -= LINE_HEIGHT * 1.5;

  function collectCited(nodes: PMNode[] | undefined) {
    for (const n of nodes || []) {
      if (n.type === "citation" && n.attrs?.bibKey && !citedKeys.includes(n.attrs.bibKey)) {
        citedKeys.push(n.attrs.bibKey);
      }
      collectCited(n.content);
    }
  }

  for (const node of doc.content || []) {
    collectCited(node.content);

    if (node.type === "heading") {
      const size = node.attrs?.level === 1 ? 15 : 13;
      drawWrapped(inlineToWords(node.content, footnoteNotes).map((w) => ({ ...w, bold: true })), 0, size);
      y -= LINE_HEIGHT * 0.3;
    } else if (node.type === "paragraph") {
      drawWrapped(inlineToWords(node.content, footnoteNotes));
    } else if (node.type === "blockquote") {
      for (const inner of node.content || []) {
        drawWrapped(inlineToWords(inner.content, footnoteNotes).map((w) => ({ ...w, italic: true })), 36);
      }
    } else if (node.type === "bulletList") {
      for (const item of node.content || []) {
        const para = item.content?.[0];
        drawWrapped([{ text: "•", bold: false, italic: false }, ...inlineToWords(para?.content, footnoteNotes)], 18);
      }
    } else if (node.type === "orderedList") {
      (node.content || []).forEach((item, i) => {
        const para = item.content?.[0];
        drawWrapped(
          [{ text: `${i + 1}.`, bold: false, italic: false }, ...inlineToWords(para?.content, footnoteNotes)],
          18
        );
      });
    }
  }

  const citedSources = sources.filter((s) => citedKeys.includes(s.key));

  if (footnoteNotes.length > 0) {
    y -= LINE_HEIGHT * 0.5;
    drawWrapped([{ text: "Notes", bold: true, italic: false }]);
    footnoteNotes.forEach((note, i) => {
      drawWrapped([{ text: `${i + 1}.`, bold: false, italic: false }, { text: note, bold: false, italic: false }]);
    });
  }

  if (citedSources.length > 0) {
    y -= LINE_HEIGHT * 0.5;
    drawWrapped([{ text: "References", bold: true, italic: false }]);
    for (const s of citedSources) {
      drawWrapped(
        `${s.author} (${s.year || "n.d."}). ${s.title}.`.split(/\s+/).map((t) => ({ text: t, bold: false, italic: false }))
      );
    }
  }

  return pdfDoc.save();
}
