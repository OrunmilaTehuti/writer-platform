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
      label: { default: "[?]" },
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

/**
 * Footnote node. The note text is stored directly on the node as an
 * attribute (rather than a separate document section), so the marker and
 * its content always travel together and can't drift out of sync. The
 * editor renders a live "Footnotes" list below the document by walking
 * the doc for these nodes in order - see FootnoteList in the app.
 */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      note: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-type=footnote]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "footnote", class: "academic-footnote-ref" }),
      "•",
    ];
  },
});

export const academicExtensions = [Citation, Footnote];

export const citationStyles = ["apa", "mla", "chicago", "ieee"] as const;
