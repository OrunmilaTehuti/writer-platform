interface PMNode {
  type?: string;
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, any>;
  content?: PMNode[];
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineToHtml(nodes: PMNode[] | undefined): string {
  return (nodes || [])
    .map((node) => {
      if (node.type !== "text") return "";
      let html = escapeHtml(node.text || "");
      for (const mark of node.marks || []) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        if (mark.type === "italic") html = `<em>${html}</em>`;
        if (mark.type === "underline") html = `<u>${html}</u>`;
      }
      return html;
    })
    .join("");
}

function blockToHtml(node: PMNode): string {
  switch (node.type) {
    case "heading": {
      const level = node.attrs?.level || 2;
      return `<h${level}>${inlineToHtml(node.content)}</h${level}>`;
    }
    case "paragraph":
      return `<p>${inlineToHtml(node.content)}</p>`;
    case "blockquote":
      return `<blockquote>${(node.content || []).map(blockToHtml).join("")}</blockquote>`;
    case "bulletList":
      return `<ul>${(node.content || [])
        .map((item) => `<li>${(item.content || []).map(blockToHtml).join("")}</li>`)
        .join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content || [])
        .map((item) => `<li>${(item.content || []).map(blockToHtml).join("")}</li>`)
        .join("")}</ol>`;
    default:
      return "";
  }
}

/**
 * Renders full blog content as an HTML string - used both for the
 * downloadable .html export and for rendering the public read view
 * (via dangerouslySetInnerHTML), so the two always stay in sync.
 */
export function blogToHtml(doc: { content?: PMNode[] }): string {
  return (doc.content || []).map(blockToHtml).join("\n");
}

/**
 * Wraps the rendered content in a minimal standalone HTML document, ready
 * to paste into WordPress/Medium/Ghost or open directly in a browser.
 */
export function exportBlogToHtmlFile(doc: { content?: PMNode[] }, title: string): string {
  const body = blogToHtml(doc);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${body}
</body>
</html>
`;
}
