# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server with HMR
npm run build     # production build
npm run preview   # preview production build locally
npm run lint      # run oxlint
npm test          # run Jest tests
npm run test:watch  # Jest in watch mode
```

## Debugging in Chrome

A VS Code launch config exists at `.vscode/launch.json`. Start the dev server first (`npm run dev`), then launch **Debug in Chrome** from the Run and Debug panel (`Cmd+Shift+D`). Vite emits source maps in dev mode so breakpoints in `src/` work directly.

## Architecture

A from-scratch rich text editor built with React 19 + Vite. It does **not** use `contenteditable` in the conventional way or any existing editor framework — the browser's `contentEditable` div is used as an input surface only, with all state living in a custom immutable document tree.

### Layer overview

```
App
└── Editor (src/editor/Editor.jsx)        — contentEditable host, DOM → model selection bridge
    ├── useEditor (src/editor/useEditor.js) — React state: doc, selection, history; editor API
    ├── eventHandlers (src/editor/eventHandlers.js) — keyboard/input/paste → editor API calls
    └── Renderer (src/editor/Renderer.jsx) — model tree → React elements
```

The model layer (`src/model/`) is pure JS with no React dependency.

### Document model (`src/model/`)

**`types.js`** — documentation-only (no exports). The full node shape contract:
- `DocumentNode` → `BlockNode[]` → `InlineNode[]` → `TextNode`
- Block types: `paragraph`, `heading` (attrs: `{ level: 1|2|3 }`), `blockquote`, `code_block` (attrs: `{ language }`), `table`, `embed` (void)
- Table nodes: `table` → `table_row` → `table_cell` (attrs: `{ header: bool }`) → `paragraph`
- Inline types: `text` (marks array), `link` (href, children)
- Marks: `bold | italic | underline | code | strikethrough`
- `Point` = `{ path: number[], offset: number }` — path is child indices from root (e.g. `[0, 2]`)
- `Selection` = `{ anchor: Point, focus: Point } | null`

**`utils.js`** — pure tree helpers:
- `getNodeAtPath(doc, path)` — throws on bad paths (intentional: bad path = upstream bug)
- `setNodeAtPath(doc, path, newNode)` — immutable update with structural sharing
- `normaliseSelection(sel)` — ensures anchor is always before focus in document order
- `getMarksAtSelection` / `isMarkActive` / `isBlockActive` — toolbar state helpers

**`operations.js`** — atomic document mutations, all immutable:
- `applyOperation(doc, op)` — handles `insert_text`, `remove_text`, `set_node`, `insert_node`, `remove_node`, `split_node`, `merge_node`
- `invertOperation(op)` — returns the inverse op for undo. Note: `split_node` at index `i` inverts to `merge_node` at `i+1` (not `i`), and `merge_node` at `i` inverts to `split_node` at `i-1`

**`history.js`** — undo/redo stack:
- Each history entry: `{ ops, selectionBefore, selectionAfter }`
- `pushHistory` clears the redo stack (standard linear undo model)
- `undo` / `redo` return `{ doc, history, selection }` or `null`

**`testDoc.js`** — the `initialDoc` fixture used as the editor's starting state (heading, paragraphs, blockquote, code block, table).

### Editor layer (`src/editor/`)

**`useEditor.js`** — the central React hook. Owns `doc`, `selection`, and `history` state. Exposes:
- `apply(ops, selectionBefore, selectionAfter)` — applies a batch of ops as one undoable action
- `insertText`, `deleteBackward`, `splitBlock` — direct editing operations
- `toggleMark(mark)`, `setBlockType(type, attrs)` — formatting operations (currently use `require()` to import utils — a known inconsistency to fix)
- `undo()`, `redo()`

`EditorContext` is exported so any component inside `<Editor>` can call `useEditorContext()` for the full editor API without prop drilling.

**`Editor.jsx`** — mounts the `contentEditable` div. Bridges DOM selection → model selection via a `selectionchange` listener that reads `data-path` attributes from the DOM. Text input is fully intercepted via `onBeforeInput` (no characters ever reach the DOM natively).

**`Renderer.jsx`** — pure render: walks the model tree and returns React elements. Every rendered element carries a `data-path` attribute (e.g. `data-path="0,1"`) that encodes its model path — this is how `Editor.jsx` maps DOM positions back to model coordinates.

**`eventHandlers.js`** — keyboard shortcuts and input routing:
- `Cmd/Ctrl+Z` → undo, `+Shift` or `Ctrl+Y` → redo
- `Cmd/Ctrl+B/I/U` → toggle bold/italic/underline
- `Enter` → `splitBlock`, `Backspace` → `deleteBackward`, `Tab` → insert 4 spaces
- `handleBeforeInput` intercepts all typed characters; `handlePaste` strips HTML and inserts plain text only

### Key design principles

- **Immutable document tree**: never mutate nodes directly. `setNodeAtPath` creates new objects only along the changed path; all other nodes are shared references (structural sharing makes undo/redo cheap).
- **Paths over references**: nodes have no IDs. Everything is addressed by `path` arrays from the root.
- **DOM as output only**: the browser never writes to the DOM — all input is intercepted and routed through the model first.
- **`data-path` as the DOM↔model bridge**: `Renderer` stamps every element with its model path; `Editor` reads it back on selection change.
- **Plain JavaScript** (no TypeScript) — `types.js` is the type contract.

### Linting

oxlint (`.oxlintrc.json`) with React hooks rules and `only-export-components` warning. No ESLint. Prettier is installed for formatting.
