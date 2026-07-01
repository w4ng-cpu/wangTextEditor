import { createHistory, pushHistory, undo, redo } from './history.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeDoc = () => ({
  type: 'doc',
  children: [
    {
      type: 'paragraph',
      children: [{ type: 'text', text: 'Hello', marks: [] }],
    },
  ],
})

const selA = { anchor: { path: [0, 0], offset: 0 }, focus: { path: [0, 0], offset: 0 } }
const selB = { anchor: { path: [0, 0], offset: 5 }, focus: { path: [0, 0], offset: 5 } }
const selC = { anchor: { path: [0, 0], offset: 3 }, focus: { path: [0, 0], offset: 3 } }

// An op that appends '!' to the text node at [0,0]
const insertOp = { type: 'insert_text', path: [0, 0], offset: 5, text: '!' }
// An op that inserts 'Say ' at the start
const insertOp2 = { type: 'insert_text', path: [0, 0], offset: 0, text: 'Say ' }

const makeEntry = (ops, selectionBefore = selA, selectionAfter = selB) => ({
  ops,
  selectionBefore,
  selectionAfter,
})

// ─── createHistory ───────────────────────────────────────────────────────────

describe('createHistory', () => {
  test('returns empty undo and redo stacks', () => {
    const h = createHistory()
    expect(h.undos).toEqual([])
    expect(h.redos).toEqual([])
  })
})

// ─── pushHistory ─────────────────────────────────────────────────────────────

describe('pushHistory', () => {
  test('appends the entry to the undo stack', () => {
    const h = createHistory()
    const entry = makeEntry([insertOp])
    const h2 = pushHistory(h, entry)
    expect(h2.undos).toHaveLength(1)
    expect(h2.undos[0]).toBe(entry)
  })

  test('stacks multiple entries in order', () => {
    const h = createHistory()
    const e1 = makeEntry([insertOp])
    const e2 = makeEntry([insertOp2])
    const h2 = pushHistory(pushHistory(h, e1), e2)
    expect(h2.undos[0]).toBe(e1)
    expect(h2.undos[1]).toBe(e2)
  })

  test('clears the redo stack', () => {
    // Simulate a state where redos are present
    const h = { undos: [], redos: [makeEntry([insertOp])] }
    const h2 = pushHistory(h, makeEntry([insertOp2]))
    expect(h2.redos).toEqual([])
  })

  test('does not mutate the original history', () => {
    const h = createHistory()
    pushHistory(h, makeEntry([insertOp]))
    expect(h.undos).toHaveLength(0)
  })
})

// ─── undo ────────────────────────────────────────────────────────────────────

describe('undo', () => {
  test('returns null when there is nothing to undo', () => {
    expect(undo(createHistory(), makeDoc())).toBeNull()
  })

  test('applies the inverse op and returns the updated doc', () => {
    const doc = makeDoc()
    // Apply insertOp manually to get a doc with 'Hello!'
    const docAfter = { ...doc, children: [{ ...doc.children[0], children: [{ type: 'text', text: 'Hello!', marks: [] }] }] }
    const h = pushHistory(createHistory(), makeEntry([insertOp]))

    const result = undo(h, docAfter)
    expect(result.doc.children[0].children[0].text).toBe('Hello')
  })

  test('moves the entry from undos to redos', () => {
    const entry = makeEntry([insertOp])
    const h = pushHistory(createHistory(), entry)
    const result = undo(h, makeDoc())
    expect(result.history.undos).toHaveLength(0)
    expect(result.history.redos).toHaveLength(1)
    expect(result.history.redos[0]).toBe(entry)
  })

  test('restores selectionBefore', () => {
    const entry = makeEntry([insertOp], selA, selB)
    const h = pushHistory(createHistory(), entry)
    const result = undo(h, makeDoc())
    expect(result.selection).toBe(selA)
  })

  test('undoes only the most recent entry, leaving older ones intact', () => {
    const e1 = makeEntry([insertOp])
    const e2 = makeEntry([insertOp2])
    const h = pushHistory(pushHistory(createHistory(), e1), e2)
    const docAfter = { ...makeDoc() } // doesn't matter for stack shape
    const result = undo(h, docAfter)
    expect(result.history.undos).toHaveLength(1)
    expect(result.history.undos[0]).toBe(e1)
    expect(result.history.redos[0]).toBe(e2)
  })

  test('applies multiple ops in reverse order', () => {
    // Start with 'Hello', apply insertOp ('Hello!') then insertOp2 ('Say Hello!')
    // Undo should reverse them: remove 'Say ' first, then remove '!'
    const doc = makeDoc()
    const twoOpEntry = makeEntry([insertOp, insertOp2])

    // Build the doc state after both ops were applied
    const docAfterBoth = {
      type: 'doc',
      children: [{
        type: 'paragraph',
        children: [{ type: 'text', text: 'Say Hello!', marks: [] }],
      }],
    }

    const h = pushHistory(createHistory(), twoOpEntry)
    const result = undo(h, docAfterBoth)
    expect(result.doc.children[0].children[0].text).toBe('Hello')
  })

  test('does not mutate the original history', () => {
    const h = pushHistory(createHistory(), makeEntry([insertOp]))
    undo(h, makeDoc())
    expect(h.undos).toHaveLength(1)
    expect(h.redos).toHaveLength(0)
  })
})

// ─── redo ────────────────────────────────────────────────────────────────────

describe('redo', () => {
  test('returns null when there is nothing to redo', () => {
    expect(redo(createHistory(), makeDoc())).toBeNull()
  })

  test('replays the original ops and returns the updated doc', () => {
    const doc = makeDoc()
    const entry = makeEntry([insertOp])
    // Simulate a state after an undo: redos has the entry, doc is back to original
    const h = { undos: [], redos: [entry] }
    const result = redo(h, doc)
    expect(result.doc.children[0].children[0].text).toBe('Hello!')
  })

  test('moves the entry from redos back to undos', () => {
    const entry = makeEntry([insertOp])
    const h = { undos: [], redos: [entry] }
    const result = redo(h, makeDoc())
    expect(result.history.redos).toHaveLength(0)
    expect(result.history.undos).toHaveLength(1)
    expect(result.history.undos[0]).toBe(entry)
  })

  test('restores selectionAfter', () => {
    const entry = makeEntry([insertOp], selA, selB)
    const h = { undos: [], redos: [entry] }
    const result = redo(h, makeDoc())
    expect(result.selection).toBe(selB)
  })

  test('redoes only the most recent redo entry', () => {
    const e1 = makeEntry([insertOp])
    const e2 = makeEntry([insertOp2])
    const h = { undos: [], redos: [e1, e2] }
    const result = redo(h, makeDoc())
    expect(result.history.redos).toHaveLength(1)
    expect(result.history.redos[0]).toBe(e1)
    expect(result.history.undos[0]).toBe(e2)
  })

  test('replays multiple ops in original order', () => {
    const doc = makeDoc()
    const twoOpEntry = makeEntry([insertOp, insertOp2])
    const h = { undos: [], redos: [twoOpEntry] }
    const result = redo(h, doc)
    expect(result.doc.children[0].children[0].text).toBe('Say Hello!')
  })

  test('does not mutate the original history', () => {
    const entry = makeEntry([insertOp])
    const h = { undos: [], redos: [entry] }
    redo(h, makeDoc())
    expect(h.redos).toHaveLength(1)
    expect(h.undos).toHaveLength(0)
  })
})

// ─── Roundtrip: undo → redo ──────────────────────────────────────────────────

describe('undo → redo roundtrip', () => {
  test('undo then redo returns to the same document state', () => {
    const doc = makeDoc()
    const entry = makeEntry([insertOp])
    const h = pushHistory(createHistory(), entry)

    // Apply the op to simulate doc state after the action
    const docAfter = {
      type: 'doc',
      children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello!', marks: [] }] }],
    }

    const undoResult = undo(h, docAfter)
    expect(undoResult.doc.children[0].children[0].text).toBe('Hello')

    const redoResult = redo(undoResult.history, undoResult.doc)
    expect(redoResult.doc.children[0].children[0].text).toBe('Hello!')
  })

  test('undo then redo restores the correct selections', () => {
    const entry = makeEntry([insertOp], selA, selB)
    const h = pushHistory(createHistory(), entry)
    const undoResult = undo(h, makeDoc())
    expect(undoResult.selection).toBe(selA)
    const redoResult = redo(undoResult.history, undoResult.doc)
    expect(redoResult.selection).toBe(selB)
  })

  test('new action after undo clears the redo stack', () => {
    const e1 = makeEntry([insertOp])
    const h = pushHistory(createHistory(), e1)
    const undoResult = undo(h, makeDoc())
    expect(undoResult.history.redos).toHaveLength(1)

    // User types something new — redo history must be wiped
    const h2 = pushHistory(undoResult.history, makeEntry([insertOp2]))
    expect(h2.redos).toHaveLength(0)
  })

  test('multiple undo/redo cycles preserve document integrity', () => {
    const doc = makeDoc() // 'Hello'
    const docAfter1 = { type: 'doc', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello!', marks: [] }] }] }
    const docAfter2 = { type: 'doc', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Say Hello!', marks: [] }] }] }

    const e1 = makeEntry([insertOp], selA, selB)
    const e2 = makeEntry([insertOp2], selB, selC)

    let h = pushHistory(createHistory(), e1)
    h = pushHistory(h, e2)

    // Undo e2 → 'Hello!'
    const u1 = undo(h, docAfter2)
    expect(u1.doc.children[0].children[0].text).toBe('Hello!')

    // Undo e1 → 'Hello'
    const u2 = undo(u1.history, u1.doc)
    expect(u2.doc.children[0].children[0].text).toBe('Hello')

    // Redo e1 → 'Hello!'
    const r1 = redo(u2.history, u2.doc)
    expect(r1.doc.children[0].children[0].text).toBe('Hello!')

    // Redo e2 → 'Say Hello!'
    const r2 = redo(r1.history, r1.doc)
    expect(r2.doc.children[0].children[0].text).toBe('Say Hello!')
  })
})
