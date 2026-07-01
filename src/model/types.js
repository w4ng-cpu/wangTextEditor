// This file doesn't export runnable code — it's documentation.
// It describes the shape of every object in your document tree.
// Think of it as the contract the rest of the codebase follows.

// A document is a tree:
//
//   DocumentNode
//     └── BlockNode[]        (paragraphs, headings, tables...)
//           └── InlineNode[] (text runs, links...)
//                 └── TextNode (the actual characters)
//
// Every node has a 'type' field so you can tell them apart.

// TextNode
// --------
// The leaf of the tree. Carries actual characters and a list
// of active marks (bold, italic, etc.)
//
// { type: 'text', text: 'Hello', marks: ['bold', 'italic'] }

// Mark
// ----
// One of: 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough'

// InlineNode
// ----------
// Either a TextNode or a LinkNode:
// { type: 'link', href: 'https://...', children: [TextNode, ...] }

// BlockNode
// ---------
// One of:
//   { type: 'paragraph',   children: [InlineNode, ...] }
//   { type: 'heading',     attrs: { level: 1|2|3 }, children: [InlineNode, ...] }
//   { type: 'blockquote',  children: [ParagraphNode, ...] }
//   { type: 'code_block',  attrs: { language: '' }, children: [TextNode, ...] }
//   { type: 'table',       children: [TableRowNode, ...] }
//   { type: 'embed',       attrs: { src, alt, caption }, children: [], isVoid: true }

// DocumentNode
// ------------
// The root. Always:
// { type: 'doc', children: [BlockNode, ...] }

// Point
// -----
// A position inside the document tree.
// path is an array of child indices from root down to the target node.
// offset is the character position within a text node.
//
// Example: path [0, 1] offset 3
//   → doc.children[0].children[1], at the 3rd character
//
// { path: [0, 1], offset: 3 }

// Selection
// ---------
// Two Points: where the selection started (anchor)
// and where it currently ends (focus).
// null means the cursor isn't in the editor.
//
// { anchor: Point, focus: Point } | null

// This is the single source of truth for your document's shape.
// Every function in this codebase produces or consumes these structures.