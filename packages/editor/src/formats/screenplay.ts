import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Screenplay elements follow the Fountain conventions:
 * https://fountain.io/syntax
 *
 * Each element is its own block-level node so we can apply the correct
 * margins/casing/centering per Hollywood-standard formatting rules, and
 * so export-to-PDF can walk the doc tree element-by-element.
 *
 * Each node defines its own Enter behavior ("addKeyboardShortcuts") so
 * pressing Enter reliably starts a genuinely new line/node - and, like
 * real screenplay software, auto-advances to the sensible next element
 * type (e.g. Character -> Dialogue) instead of repeating the same type.
 * Without this, Enter has no defined behavior for these custom node
 * types and text from separate "lines" ends up merged into one node.
 */

function enterAdvancesTo(nextType: string) {
  return function (this: { editor: any }) {
    return this.editor.chain().splitBlock().setNode(nextType).run();
  };
}

export const SceneHeading = Node.create({
  name: "sceneHeading",
  group: "block",
  content: "text*",
  parseHTML() {
    return [{ tag: "div[data-type=scene-heading]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "scene-heading",
        class: "screenplay-scene-heading",
      }),
      0,
    ];
  },
  addKeyboardShortcuts() {
    return { Enter: enterAdvancesTo("action").bind(this) };
  },
});

export const Action = Node.create({
  name: "action",
  group: "block",
  content: "text*",
  parseHTML() {
    return [{ tag: "div[data-type=action]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "action", class: "screenplay-action" }),
      0,
    ];
  },
  addKeyboardShortcuts() {
    // Action is often several lines/paragraphs in a row, so Enter stays in Action.
    return { Enter: enterAdvancesTo("action").bind(this) };
  },
});

export const Character = Node.create({
  name: "character",
  group: "block",
  content: "text*",
  parseHTML() {
    return [{ tag: "div[data-type=character]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "character", class: "screenplay-character" }),
      0,
    ];
  },
  addKeyboardShortcuts() {
    return { Enter: enterAdvancesTo("dialogue").bind(this) };
  },
});

export const Parenthetical = Node.create({
  name: "parenthetical",
  group: "block",
  content: "text*",
  parseHTML() {
    return [{ tag: "div[data-type=parenthetical]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "parenthetical",
        class: "screenplay-parenthetical",
      }),
      0,
    ];
  },
  addKeyboardShortcuts() {
    return { Enter: enterAdvancesTo("dialogue").bind(this) };
  },
});

export const Dialogue = Node.create({
  name: "dialogue",
  group: "block",
  content: "text*",
  parseHTML() {
    return [{ tag: "div[data-type=dialogue]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "dialogue", class: "screenplay-dialogue" }),
      0,
    ];
  },
  addKeyboardShortcuts() {
    return { Enter: enterAdvancesTo("action").bind(this) };
  },
});

export const screenplayExtensions = [SceneHeading, Action, Character, Parenthetical, Dialogue];

// Industry-standard margins in inches, for the PDF export renderer.
// (12pt Courier, US Letter, per the widely-used screenplay convention.)
export const screenplayLayout = {
  page: { width: 8.5, height: 11 },
  margins: { top: 1, bottom: 1, left: 1.5, right: 1 },
  elementIndent: {
    sceneHeading: 0,
    action: 0,
    character: 2.2,
    parenthetical: 1.8,
    dialogue: 1.0,
  },
};
