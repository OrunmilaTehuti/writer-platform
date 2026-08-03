import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  FootnoteReferenceRun,
  AlignmentType,
} from "docx";

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

function hasMarks(node: PMNode, type: string) {
  return (node.marks || []).some((m) => m.type === type);
}

// Converts one inline-content array (a paragraph/heading's children) into
// Word runs - plain text runs with bold/italic/underline, citation labels
// as plain text, and footnotes as *real* Word footnote references (so
// they show at the bottom of the page in Word itself, not just as an
// endnotes list).
function inlineToRuns(
  nodes: PMNode[] | undefined,
  footnotes: Record<number, { children: Paragraph[] }>,
  footnoteIdRef: { current: number }
): (TextRun | FootnoteReferenceRun)[] {
  const runs: (TextRun | FootnoteReferenceRun)[] = [];
  for (const node of nodes || []) {
    if (node.type === "text") {
      runs.push(
        new TextRun({
          text: node.text || "",
          bold: hasMarks(node, "bold"),
          italics: hasMarks(node, "italic"),
          underline: hasMarks(node, "underline") ? {} : undefined,
        })
      );
    } else if (node.type === "citation") {
      runs.push(new TextRun({ text: ` ${node.attrs?.label || ""}` }));
    } else if (node.type === "footnote") {
      const id = footnoteIdRef.current++;
      footnotes[id] = {
        children: [new Paragraph({ children: [new TextRun(node.attrs?.note || "")] })],
      };
      runs.push(new FootnoteReferenceRun(id));
    }
  }
  return runs;
}

export async function exportAcademicToDocx(
  doc: { content?: PMNode[] },
  title: string,
  sources: Source[]
): Promise<Blob> {
  const footnotes: Record<number, { children: Paragraph[] }> = {};
  const footnoteIdRef = { current: 1 };
  const citedKeys: string[] = [];
  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
  ];

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
      const level = node.attrs?.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
      paragraphs.push(new Paragraph({ heading: level, children: inlineToRuns(node.content, footnotes, footnoteIdRef) }));
    } else if (node.type === "paragraph") {
      paragraphs.push(
        new Paragraph({ spacing: { line: 480 }, children: inlineToRuns(node.content, footnotes, footnoteIdRef) })
      );
    } else if (node.type === "blockquote") {
      for (const inner of node.content || []) {
        paragraphs.push(
          new Paragraph({
            indent: { left: 720 },
            children: inlineToRuns(inner.content, footnotes, footnoteIdRef).map(
              (r) => (r instanceof TextRun ? new TextRun({ text: (r as any).text, italics: true }) : r)
            ),
          })
        );
      }
    } else if (node.type === "bulletList") {
      for (const item of node.content || []) {
        const para = item.content?.[0];
        paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: inlineToRuns(para?.content, footnotes, footnoteIdRef) }));
      }
    } else if (node.type === "orderedList") {
      (node.content || []).forEach((item, i) => {
        const para = item.content?.[0];
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(`${i + 1}. `), ...inlineToRuns(para?.content, footnotes, footnoteIdRef)],
          })
        );
      });
    }
  }

  const citedSources = sources.filter((s) => citedKeys.includes(s.key));
  if (citedSources.length > 0) {
    paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "References", spacing: { before: 480 } }));
    for (const s of citedSources) {
      paragraphs.push(new Paragraph({ text: `${s.author} (${s.year || "n.d."}). ${s.title}.` }));
    }
  }

  const docx = new Document({
    footnotes,
    sections: [{ children: paragraphs }],
  });

  return Packer.toBlob(docx);
}
