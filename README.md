# Writer Platform

A writing tool (screenplay / blog / academic formatting + proofreading) combined
with a social feed for writers. Monorepo managed with Turborepo + pnpm workspaces.

## Structure

```
apps/
  web/                  Next.js app (feed, editor pages, API routes)
    server/collab-server.js   Standalone Yjs WebSocket server for real-time collab
packages/
  db/                   Prisma schema + shared client (Postgres)
  editor/               Shared Tiptap + Yjs editor, with one "format mode"
                         per document type (screenplay / blog / academic)
```

## Why this shape

- **One editor core, three format modes.** `packages/editor/src/formats/*`
  each export a set of Tiptap nodes specific to that writing type
  (e.g. scene headings + character cues for screenplay, citation nodes for
  academic). They share the same Yjs-backed collaborative core in
  `useCollaborativeEditor`, so real-time collab, undo/redo, and cursors work
  identically across all three - only the allowed content differs.
- **The collab server is separate from the Next.js app.** WebSocket
  connections need to stay open; Next's API routes (and most serverless
  hosts) aren't built for that. Run it as its own small long-running process
  (a cheap VM, Fly.io, Railway, Render - not Vercel/Netlify for this part).
- **Document content is stored as ProseMirror JSON** (`Document.content` in
  the Prisma schema), with the last Yjs binary state cached alongside it
  (`yjsState`) so a document can be reloaded and re-joined without losing
  collaborative history.

## Getting started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
# point DATABASE_URL at a real Postgres instance, then:
pnpm db:push        # creates tables from packages/db/prisma/schema.prisma

# two terminals:
pnpm collab:server  # starts the Yjs WebSocket server on :1234
pnpm dev            # starts Next.js on :3000
```

Open `http://localhost:3000/editor/demo-doc` in two browser tabs to see
real-time collaborative editing. Add `?format=SCREENPLAY` or
`?format=ACADEMIC` to try the other modes.

## Proofreading

Not wired up yet. Recommended approach: run
[LanguageTool](https://github.com/languagetool-org/languagetool) (self-hosted
via Docker, or their hosted API) and call it from a debounced API route as
the user types, surfacing suggestions as inline decorations in the editor.
`LANGUAGETOOL_API_URL` is already in `.env.example` for this.

## Next steps (not yet built)

- Auth (NextAuth/Auth.js recommended - integrates cleanly with the `User`
  model already in the Prisma schema)
- The social feed UI (posts, follows, comments, likes) - schema exists in
  `packages/db/prisma/schema.prisma`, no routes/UI yet
- PDF export per format (screenplay margins are defined in
  `packages/editor/src/formats/screenplay.ts` as a starting point)
- Proofreading integration (see above)
- Visual design pass - current pages are intentionally unstyled scaffolding
