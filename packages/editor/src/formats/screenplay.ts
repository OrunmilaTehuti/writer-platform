import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Screenplay elements follow the Fountain conventions:
 * https://fountain.io/syntax
 *
 * Each element is its own block-level node so we can apply the correct
 * margins/casing/centering per Hollywood-standard formatting rules, and
 * so export-to-PDF can walk the doc tree element-by-element.
 */

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
