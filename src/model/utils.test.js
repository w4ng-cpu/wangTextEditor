import {
  isTextNode,
  isVoidNode,
  getNodeAtPath,
  setNodeAtPath,
  comparePaths,
  pathsEqual,
  normaliseSelection,
  getMarksAtSelection,
  isMarkActive,
  isBlockActive,
} from './utils.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const textNode = { type: 'text', text: 'Hello', marks: ['bold'] }
const italicNode = { type: 'text', text: 'World', marks: ['italic'] }
const paragraph = { type: 'paragraph', children: [textNode, italicNode] }
const heading = { type: 'heading', attrs: { level: 1 }, children: [{ type: 'text', text: 'Title', marks: [] }] }
const doc = { type: 'doc', children: [paragraph, heading] }

const pt = (path, offset) => ({ path, offset })
const sel = (anchorPath, anchorOffset, focusPath, focusOffset) => ({
  anchor: pt(anchorPath, anchorOffset),
  focus: pt(focusPath, focusOffset),
})

// ─── isTextNode ──────────────────────────────────────────────────────────────

describe('isTextNode', () => {
  test('returns true for a text node', () => {
    expect(isTextNode({ type: 'text', text: 'hi', marks: [] })).toBe(true)
  })

  test('returns false for a non-text node', () => {
    expect(isTextNode({ type: 'paragraph', children: [] })).toBe(false)
  })

  test('returns false for null', () => {
    expect(isTextNode(null)).toBe(false)
  })

  test('returns false for a primitive', () => {
    expect(isTextNode('text')).toBe(false)
  })
})

// ─── isVoidNode ──────────────────────────────────────────────────────────────

describe('isVoidNode', () => {
  test('returns true when isVoid is true', () => {
    expect(isVoidNode({ type: 'embed', isVoid: true, children: [] })).toBe(true)
  })

  test('returns false when isVoid is absent', () => {
    expect(isVoidNode({ type: 'paragraph', children: [] })).toBe(false)
  })

  test('returns false for null', () => {
    expect(isVoidNode(null)).toBe(false)
  })
})

// ─── getNodeAtPath ───────────────────────────────────────────────────────────

describe('getNodeAtPath', () => {
  test('empty path returns the doc itself', () => {
    expect(getNodeAtPath(doc, [])).toBe(doc)
  })

  test('resolves a top-level child', () => {
    expect(getNodeAtPath(doc, [0])).toBe(paragraph)
  })

  test('resolves a nested child', () => {
    expect(getNodeAtPath(doc, [0, 1])).toBe(italicNode)
  })

  test('throws on an out-of-range index', () => {
    expect(() => getNodeAtPath(doc, [5])).toThrow('getNodeAtPath')
  })

  test('throws when traversing into a leaf node', () => {
    expect(() => getNodeAtPath(doc, [0, 0, 0])).toThrow('getNodeAtPath')
  })
})

// ─── setNodeAtPath ───────────────────────────────────────────────────────────

describe('setNodeAtPath', () => {
  const replacement = { type: 'text', text: 'Replaced', marks: [] }

  test('empty path replaces the root', () => {
    const result = setNodeAtPath(doc, [], replacement)
    expect(result).toBe(replacement)
  })

  test('replaces a top-level child', () => {
    const result = setNodeAtPath(doc, [1], replacement)
    expect(result.children[1]).toBe(replacement)
    expect(result.children[0]).toBe(paragraph) // untouched
  })

  test('replaces a nested child', () => {
    const result = setNodeAtPath(doc, [0, 0], replacement)
    expect(result.children[0].children[0]).toBe(replacement)
    expect(result.children[0].children[1]).toBe(italicNode) // untouched
  })

  test('does not mutate the original document', () => {
    setNodeAtPath(doc, [0, 0], replacement)
    expect(doc.children[0].children[0]).toBe(textNode)
  })

  test('shares unchanged nodes (structural sharing)', () => {
    const result = setNodeAtPath(doc, [0, 0], replacement)
    expect(result.children[1]).toBe(heading) // unchanged branch is same reference
  })
})

// ─── comparePaths ────────────────────────────────────────────────────────────

describe('comparePaths', () => {
  test('equal paths return 0', () => {
    expect(comparePaths([0, 1], [0, 1])).toBe(0)
  })

  test('earlier path returns -1', () => {
    expect(comparePaths([0], [1])).toBe(-1)
  })

  test('later path returns 1', () => {
    expect(comparePaths([1, 0], [0, 5])).toBe(1)
  })

  test('shorter path that is a prefix comes first', () => {
    expect(comparePaths([0], [0, 1])).toBe(-1)
  })

  test('longer path that is an extension comes after', () => {
    expect(comparePaths([0, 1], [0])).toBe(1)
  })

  test('empty paths are equal', () => {
    expect(comparePaths([], [])).toBe(0)
  })
})

// ─── pathsEqual ──────────────────────────────────────────────────────────────

describe('pathsEqual', () => {
  test('identical paths are equal', () => {
    expect(pathsEqual([0, 1, 2], [0, 1, 2])).toBe(true)
  })

  test('different lengths are not equal', () => {
    expect(pathsEqual([0, 1], [0, 1, 2])).toBe(false)
  })

  test('same length different values are not equal', () => {
    expect(pathsEqual([0, 2], [0, 1])).toBe(false)
  })

  test('empty paths are equal', () => {
    expect(pathsEqual([], [])).toBe(true)
  })
})

// ─── normaliseSelection ──────────────────────────────────────────────────────

describe('normaliseSelection', () => {
  test('returns null for null input', () => {
    expect(normaliseSelection(null)).toBeNull()
  })

  test('leaves an already-ordered selection unchanged', () => {
    const s = sel([0], 0, [1], 0)
    expect(normaliseSelection(s)).toEqual(s)
  })

  test('swaps anchor and focus when anchor is after focus', () => {
    const s = sel([1], 0, [0], 0)
    const result = normaliseSelection(s)
    expect(result.anchor).toEqual(s.focus)
    expect(result.focus).toEqual(s.anchor)
  })

  test('swaps when same path but anchor offset is greater', () => {
    const s = sel([0, 0], 5, [0, 0], 2)
    const result = normaliseSelection(s)
    expect(result.anchor.offset).toBe(2)
    expect(result.focus.offset).toBe(5)
  })

  test('leaves a collapsed selection (same point) unchanged', () => {
    const s = sel([0, 0], 3, [0, 0], 3)
    expect(normaliseSelection(s)).toEqual(s)
  })
})

// ─── getMarksAtSelection ─────────────────────────────────────────────────────

describe('getMarksAtSelection', () => {
  test('returns empty array for null selection', () => {
    expect(getMarksAtSelection(doc, null)).toEqual([])
  })

  test('returns marks from the anchor text node', () => {
    const s = sel([0, 0], 0, [0, 0], 3)
    expect(getMarksAtSelection(doc, s)).toEqual(['bold'])
  })

  test('returns empty array when anchor path does not resolve', () => {
    const s = sel([9, 9], 0, [9, 9], 0)
    expect(getMarksAtSelection(doc, s)).toEqual([])
  })

  test('returns empty array when anchor resolves to a non-text node', () => {
    const s = sel([0], 0, [0], 0) // path resolves to paragraph, not a text node
    expect(getMarksAtSelection(doc, s)).toEqual([])
  })
})

// ─── isMarkActive ────────────────────────────────────────────────────────────

describe('isMarkActive', () => {
  test('returns true when mark is present at anchor', () => {
    const s = sel([0, 0], 0, [0, 0], 3)
    expect(isMarkActive(doc, s, 'bold')).toBe(true)
  })

  test('returns false when mark is absent at anchor', () => {
    const s = sel([0, 0], 0, [0, 0], 3)
    expect(isMarkActive(doc, s, 'italic')).toBe(false)
  })

  test('returns false for null selection', () => {
    expect(isMarkActive(doc, null, 'bold')).toBe(false)
  })
})

// ─── isBlockActive ───────────────────────────────────────────────────────────

describe('isBlockActive', () => {
  test('returns true when top-level block matches the given type', () => {
    const s = sel([0, 0], 0, [0, 0], 0)
    expect(isBlockActive(doc, s, 'paragraph')).toBe(true)
  })

  test('returns false when block type does not match', () => {
    const s = sel([0, 0], 0, [0, 0], 0)
    expect(isBlockActive(doc, s, 'heading')).toBe(false)
  })

  test('checks the correct block when cursor is in heading', () => {
    const s = sel([1, 0], 0, [1, 0], 0)
    expect(isBlockActive(doc, s, 'heading')).toBe(true)
  })

  test('returns false for null selection', () => {
    expect(isBlockActive(doc, null, 'paragraph')).toBe(false)
  })

  test('returns false when path does not resolve', () => {
    const s = sel([9, 0], 0, [9, 0], 0)
    expect(isBlockActive(doc, s, 'paragraph')).toBe(false)
  })
})
