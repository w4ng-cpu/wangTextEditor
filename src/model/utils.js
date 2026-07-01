// ─── Type guards ────────────────────────────────────────────────────────────

// Tells you whether an unknown value is a TextNode.
// Useful throughout the codebase when you're traversing mixed node arrays.
export function isTextNode(node) {
  return node !== null && typeof node === 'object' && node.type === 'text'
}

// Tells you whether a node is void (no editable children).
// Void nodes like images sit in the document but the cursor can't go inside them.
export function isVoidNode(node) {
  return node !== null && typeof node === 'object' && node.isVoid === true
}

// ─── Tree traversal ─────────────────────────────────────────────────────────

// Walk the tree by path and return whatever node lives there.
//
// path [0, 2] means: doc.children[0].children[2]
// path []     means: the doc itself
//
// Throws if the path doesn't resolve — this is intentional. A bad path
// means something upstream has gone wrong and silent failures hide bugs.
export function getNodeAtPath(doc, path) {
  let current = doc
  console.log('getNodeAtPath', path, current)
  for (const index of path) {
    if (!current.children || current.children[index] === undefined) {
      throw new Error(
        `getNodeAtPath: no node at index ${index} in path [${path.join(', ')}]`
      )
    }
    current = current.children[index]
  }
  return current
}

// Return a new document with the node at path replaced by newNode.
//
// This is IMMUTABLE — it never modifies the original document.
// Instead it returns a brand new tree where only the nodes along
// the path to the changed node are new objects. All other nodes
// are shared with the original (structural sharing).
//
// This is what makes undo/redo cheap: old document snapshots stay
// in memory but they share most of their structure with new versions.
export function setNodeAtPath(doc, path, newNode) {
  // Base case: empty path means we're replacing the root itself
  if (path.length === 0) return newNode

  const [head, ...rest] = path

  // Copy the children array (shallow) so we don't mutate the original
  const newChildren = [...doc.children]

  // Either replace directly (if we've reached the end of the path)
  // or recurse deeper into the child at this index
  newChildren[head] =
    rest.length === 0
      ? newNode
      : setNodeAtPath(doc.children[head], rest, newNode)

  // Return a new node with updated children, all other fields unchanged
  return { ...doc, children: newChildren }
}

// ─── Path comparison ─────────────────────────────────────────────────────────

// Compare two paths. Returns -1 if a comes before b, 1 if after, 0 if equal.
// Used to determine the order of anchor and focus in a selection.
export function comparePaths(a, b) {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }
  if (a.length < b.length) return -1
  if (a.length > b.length) return 1
  return 0
}

export function pathsEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

// ─── Selection helpers ───────────────────────────────────────────────────────

// Ensure anchor always comes before focus in document order.
// The browser lets you drag a selection backwards (focus before anchor),
// which is valid, but it's easier to reason about if you normalise first.
export function normaliseSelection(sel) {
  if (!sel) return null
  const order = comparePaths(sel.anchor.path, sel.focus.path)
  const anchorAfterFocus =
    order === 1 || (order === 0 && sel.anchor.offset > sel.focus.offset)
  if (anchorAfterFocus) {
    return { anchor: sel.focus, focus: sel.anchor }
  }
  return sel
}

// Collect all marks that are active at the current selection.
// Used by the toolbar to show which buttons should appear "active".
export function getMarksAtSelection(doc, sel) {
  if (!sel) return []
  const norm = normaliseSelection(sel)
  try {
    const node = getNodeAtPath(doc, norm.anchor.path)
    if (isTextNode(node)) return node.marks
  } catch {
    // path may not resolve during early initialisation
  }
  return []
}

export function isMarkActive(doc, sel, mark) {
  return getMarksAtSelection(doc, sel).includes(mark)
}

// Walk up the anchor path to find the nearest block node and check its type.
// Used by the toolbar to show which block format button should be active.
export function isBlockActive(doc, sel, type) {
  if (!sel) return false
  try {
    const blockPath = sel.anchor.path.slice(0, 1)
    const node = getNodeAtPath(doc, blockPath)
    return node.type === type
  } catch {
    return false
  }
}