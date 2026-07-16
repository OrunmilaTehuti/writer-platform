import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Inline citation node. Stores a BibTeX key; the bibliography itself lives
 * in Document metadata (or a linked .bib import) and is resolved at render
 * / export time, so re-ordering citations doesn't require editing the text.
 */
export const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      bibKey: { default: null },
      label: { default: "[?]" }, // display fallback until resolved, e.g. "[3]" or "(Smith, 2021)"
    };
  },
  parseHTML() {
    return [{ tag: "span[data-type=citation]" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "citation", class: "academic-citation" }),
      node.attrs.label,
    ];
  },
});

export const academicExtensions = [Citation];

// Supported citation styles for export - resolved against the doc's .bib entries
export const citationStyles = ["apa", "mla", "chicago", "ieee"] as const;
