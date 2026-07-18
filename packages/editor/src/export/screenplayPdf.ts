import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { screenplayLayout } from "../formats/screenplay";

const IN_TO_PT = 72;
const FONT_SIZE = 12;
// 6 lines per inch is the standard screenplay convention for 12pt Courier -
// it's also *why* one script page reliably equals about one minute of
// screen time, which is the whole reason screenplays use this format.
const LINE_HEIGHT = IN_TO_PT / 6;

type ScreenplayNodeType = "sceneHeading" | "action" | "character" | "parenthetical" | "dialogue";

interface PMTextNode {
  type: string;
  text?: string;
  content?: PMTextNode[];
}

// Elements that stay tight against the one before them (no blank line) -
// e.g. a parenthetical or dialogue line right after a character cue.
const TIGHT_AFTER: Partial<Record<ScreenplayNodeType, ScreenplayNodeType[]>> = {
  parenthetical: ["character"],
  dialogue: ["character", "parenthetical"],
};

// Max text width per element type, in inches, before wrapping - narrower
// for dialogue/character/parenthetical since those form a centered column,
// full-width for action and scene headings.
const MAX_WIDTH_IN: Record<ScreenplayNodeType, number> = {
  sceneHeading: 6,
  action: 6,
  character: 3.5,
  parenthetical: 2,
  dialogue: 3.5,
};

const UPPERCASE_TYPES: ScreenplayNodeType[] = ["sceneHeading", "character"];

function extractText(node: PMTextNode): string {
  if (node.type === "text") return node.text || "";
  return (node.content || []).map(extractText).join("");
}

// Courier is monospace, but we still measure with the real font metrics
// rather than assuming a fixed character width - safer across any Courier
// variant pdf-lib substitutes.
function wrapText(text: string, font: PDFFont, maxWidthPt: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, FONT_SIZE) > maxWidthPt && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Renders a Tiptap/ProseMirror JSON document (using the screenplay node
 * types from formats/screenplay.ts) into an industry-standard-formatted
 * screenplay PDF: 8.5x11 page, Courier 12pt, correct margins and per-element
 * indents, with automatic pagination.
 */
export async function exportScreenplayToPdf(doc: {
  content?: PMTextNode[];
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const pageWidthPt = screenplayLayout.page.width * IN_TO_PT;
  const pageHeightPt = screenplayLayout.page.height * IN_TO_PT;
  const marginLeftPt = screenplayLayout.margins.left * IN_TO_PT;
  const marginRightPt = screenplayLayout.margins.right * IN_TO_PT;
  const marginTopPt = screenplayLayout.margins.top * IN_TO_PT;
  const marginBottomPt = screenplayLayout.margins.bottom * IN_TO_PT;

  let page: PDFPage = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
  let y = pageHeightPt - marginTopPt;
  let pageNumber = 1;
  let previousType: ScreenplayNodeType | null = null;

  function newPage() {
    page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    y = pageHeightPt - marginTopPt;
    pageNumber += 1;
    // Screenplay convention: page numbers appear top-right starting page 2.
    if (pageNumber > 1) {
      page.drawText(`${pageNumber}.`, {
        x: pageWidthPt - marginRightPt - font.widthOfTextAtSize(`${pageNumber}.`, 10),
        y: pageHeightPt - marginTopPt + 20,
        size: 10,
        font,
      });
    }
  }

  function ensureRoom() {
    if (y < marginBottomPt + LINE_HEIGHT) newPage();
  }

  for (const node of doc.content || []) {
    const type = node.type as ScreenplayNodeType;
    if (!(type in screenplayLayout.elementIndent)) continue; // skip unknown/non-screenplay nodes

    let text = extractText(node);
    if (UPPERCASE_TYPES.includes(type)) text = text.toUpperCase();

    const indentPt = screenplayLayout.elementIndent[type] * IN_TO_PT;
    const x = marginLeftPt + indentPt;
    const maxWidthPt = MAX_WIDTH_IN[type] * IN_TO_PT;
    const useBold = type === "sceneHeading";

    // Blank line before this element, unless it's meant to sit tight
    // against the previous one (e.g. dialogue right after a character cue).
    const tightList = TIGHT_AFTER[type];
    const isTight = previousType !== null && tightList?.includes(previousType);
    if (previousType !== null && !isTight) {
      y -= LINE_HEIGHT;
      ensureRoom();
    }

    const lines = wrapText(text, useBold ? fontBold : font, maxWidthPt);
    for (const line of lines) {
      ensureRoom();
      page.drawText(line, {
        x,
        y,
        size: FONT_SIZE,
        font: useBold ? fontBold : font,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
    }

    previousType = type;
  }

  return pdfDoc.save();
}
