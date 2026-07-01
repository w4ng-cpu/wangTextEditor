import { applyOperation, invertOperation } from './operations.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeDoc = () => ({
  type: 'doc',
  children: [
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Hello', marks: [] },
        { type: 'text', text: ' world', marks: ['bold'] },
      ],
    },
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Second', marks: [] },
      ],
    },
  ],
})

// Shorthand to read into the tree
const child = (doc, ...indices) =>
  indices.reduce((node, i) => node.children[i], doc)

// ─── applyOperation ──────────────────────────────────────────────────────────

describe('applyOperation — insert_text', () => {
  test('inserts text at the start of a text node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'insert_text', path: [0, 0], offset: 0, text: 'Say ' })
    expect(child(result, 0, 0).text).toBe('Say Hello')
  })

  test('inserts text in the middle of a text node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'insert_text', path: [0, 0], offset: 2, text: 'XY' })
    expect(child(result, 0, 0).text).toBe('HeXYllo')
  })

  test('inserts text at the end of a text node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'insert_text', path: [0, 0], offset: 5, text: '!' })
    expect(child(result, 0, 0).text).toBe('Hello!')
  })

  test('preserves marks on the modified node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'insert_text', path: [0, 1], offset: 0, text: 'very ' })
    expect(child(result, 0, 1).marks).toEqual(['bold'])
  })

  test('does not mutate the original document', () => {
    const doc = makeDoc()
    applyOperation(doc, { type: 'insert_text', path: [0, 0], offset: 0, text: 'X' })
    expect(child(doc, 0, 0).text).toBe('Hello')
  })
})

describe('applyOperation — remove_text', () => {
  test('removes characters from the middle of a text node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'remove_text', path: [0, 0], offset: 1, text: 'ell' })
    expect(child(result, 0, 0).text).toBe('Ho')
  })

  test('removes from the start', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'remove_text', path: [0, 0], offset: 0, text: 'He' })
    expect(child(result, 0, 0).text).toBe('llo')
  })

  test('removes from the end', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'remove_text', path: [0, 0], offset: 3, text: 'lo' })
    expect(child(result, 0, 0).text).toBe('Hel')
  })

  test('does not mutate the original document', () => {
    const doc = makeDoc()
    applyOperation(doc, { type: 'remove_text', path: [0, 0], offset: 0, text: 'Hello' })
    expect(child(doc, 0, 0).text).toBe('Hello')
  })
})

describe('applyOperation — set_node', () => {
  test('merges new props onto the target node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, {
      type: 'set_node',
      path: [0],
      newProps: { type: 'heading', attrs: { level: 2 } },
    })
    expect(child(result, 0).type).toBe('heading')
    expect(child(result, 0).attrs).toEqual({ level: 2 })
  })

  test('preserves existing props not in newProps', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'set_node', path: [0, 0], newProps: { marks: ['italic'] } })
    expect(child(result, 0, 0).text).toBe('Hello')
    expect(child(result, 0, 0).marks).toEqual(['italic'])
  })

  test('does not mutate the original document', () => {
    const doc = makeDoc()
    applyOperation(doc, { type: 'set_node', path: [0], newProps: { type: 'heading' } })
    expect(child(doc, 0).type).toBe('paragraph')
  })
})

describe('applyOperation — insert_node', () => {
  test('inserts a node at the given index', () => {
    const doc = makeDoc()
    const newNode = { type: 'text', text: 'NEW', marks: [] }
    const result = applyOperation(doc, { type: 'insert_node', path: [0, 1], node: newNode })
    expect(child(result, 0).children).toHaveLength(3)
    expect(child(result, 0, 1)).toBe(newNode)
    expect(child(result, 0, 2).text).toBe(' world')
  })

  test('inserts at the start of children', () => {
    const doc = makeDoc()
    const newNode = { type: 'paragraph', children: [] }
    const result = applyOperation(doc, { type: 'insert_node', path: [0], node: newNode })
    expect(result.children).toHaveLength(3)
    expect(result.children[0]).toBe(newNode)
  })

  test('inserts at the end of children', () => {
    const doc = makeDoc()
    const newNode = { type: 'paragraph', children: [] }
    const result = applyOperation(doc, { type: 'insert_node', path: [2], node: newNode })
    expect(result.children).toHaveLength(3)
    expect(result.children[2]).toBe(newNode)
  })

  test('does not mutate the original document', () => {
    const doc = makeDoc()
    applyOperation(doc, { type: 'insert_node', path: [0], node: { type: 'paragraph', children: [] } })
    expect(doc.children).toHaveLength(2)
  })
})

describe('applyOperation — remove_node', () => {
  test('removes the node at the given path', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'remove_node', path: [0, 0] })
    expect(child(result, 0).children).toHaveLength(1)
    expect(child(result, 0, 0).text).toBe(' world')
  })

  test('removes a top-level block', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'remove_node', path: [1] })
    expect(result.children).toHaveLength(1)
  })

  test('does not mutate the original document', () => {
    const doc = makeDoc()
    applyOperation(doc, { type: 'remove_node', path: [0] })
    expect(doc.children).toHaveLength(2)
  })
})

describe('applyOperation — split_node', () => {
  test('splits a text node at the given position', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'split_node', path: [0, 0], position: 2 })
    expect(child(result, 0).children).toHaveLength(3)
    expect(child(result, 0, 0).text).toBe('He')
    expect(child(result, 0, 1).text).toBe('llo')
  })

  test('preserves marks on both halves of a split text node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'split_node', path: [0, 1], position: 3 })
    expect(child(result, 0, 1).marks).toEqual(['bold'])
    expect(child(result, 0, 2).marks).toEqual(['bold'])
  })

  test('splits a block node by partitioning its children', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'split_node', path: [0], position: 1 })
    expect(result.children).toHaveLength(3)
    expect(child(result, 0).children).toHaveLength(1)
    expect(child(result, 0, 0).text).toBe('Hello')
    expect(child(result, 1).children).toHaveLength(1)
    expect(child(result, 1, 0).text).toBe(' world')
  })

  test('does not mutate the original document', () => {
    const doc = makeDoc()
    applyOperation(doc, { type: 'split_node', path: [0, 0], position: 2 })
    expect(child(doc, 0).children).toHaveLength(2)
  })
})

describe('applyOperation — merge_node', () => {
  test('merges a text node into the preceding sibling', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'merge_node', path: [0, 1] })
    expect(child(result, 0).children).toHaveLength(1)
    expect(child(result, 0, 0).text).toBe('Hello world')
  })

  test('merged text node takes the marks of the first node', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'merge_node', path: [0, 1] })
    expect(child(result, 0, 0).marks).toEqual([])
  })

  test('merges block nodes by concatenating their children', () => {
    const doc = makeDoc()
    const result = applyOperation(doc, { type: 'merge_node', path: [1] })
    expect(result.children).toHaveLength(1)
    expect(child(result, 0).children).toHaveLength(3)
    expect(child(result, 0, 2).text).toBe('Second')
  })

  test('does not mutate the original document', () => {
    const doc = makeDoc()
    applyOperation(doc, { type: 'merge_node', path: [0, 1] })
    expect(child(doc, 0).children).toHaveLength(2)
  })
})

describe('applyOperation — unknown type', () => {
  test('throws on an unknown operation type', () => {
    expect(() => applyOperation(makeDoc(), { type: 'explode' })).toThrow('unknown operation type')
  })
})

// ─── invertOperation ─────────────────────────────────────────────────────────

describe('invertOperation', () => {
  test('insert_text inverts to remove_text with same path/offset/text', () => {
    const op = { type: 'insert_text', path: [0, 0], offset: 2, text: 'XY' }
    expect(invertOperation(op)).toEqual({ type: 'remove_text', path: [0, 0], offset: 2, text: 'XY' })
  })

  test('remove_text inverts to insert_text with same path/offset/text', () => {
    const op = { type: 'remove_text', path: [0, 0], offset: 2, text: 'XY' }
    expect(invertOperation(op)).toEqual({ type: 'insert_text', path: [0, 0], offset: 2, text: 'XY' })
  })

  test('set_node inverts using oldProps', () => {
    const op = { type: 'set_node', path: [0], newProps: { type: 'heading' }, oldProps: { type: 'paragraph' } }
    expect(invertOperation(op)).toEqual({ type: 'set_node', path: [0], newProps: { type: 'paragraph' } })
  })

  test('set_node falls back to empty object when oldProps is missing', () => {
    const op = { type: 'set_node', path: [0], newProps: { type: 'heading' } }
    expect(invertOperation(op)).toEqual({ type: 'set_node', path: [0], newProps: {} })
  })

  test('insert_node inverts to remove_node preserving the node', () => {
    const node = { type: 'paragraph', children: [] }
    const op = { type: 'insert_node', path: [1], node }
    expect(invertOperation(op)).toEqual({ type: 'remove_node', path: [1], node })
  })

  test('remove_node inverts to insert_node preserving the node', () => {
    const node = { type: 'paragraph', children: [] }
    const op = { type: 'remove_node', path: [1], node }
    expect(invertOperation(op)).toEqual({ type: 'insert_node', path: [1], node })
  })

  test('split_node inverts to merge_node targeting the newly created second half', () => {
    // split at [0, 0] → nodeA stays at [0, 0], nodeB lands at [0, 1]
    // undo must merge [0, 1] back into [0, 0]
    const op = { type: 'split_node', path: [0, 0], position: 3 }
    expect(invertOperation(op)).toEqual({ type: 'merge_node', path: [0, 1], position: 3 })
  })

  test('merge_node inverts to split_node targeting the merged result', () => {
    // merge_node at [0, 1] removes [0, 1] and merges into [0, 0]
    // undo must split [0, 0] at the join point
    const op = { type: 'merge_node', path: [0, 1], position: 5 }
    expect(invertOperation(op)).toEqual({ type: 'split_node', path: [0, 0], position: 5 })
  })

  test('throws on unknown operation type', () => {
    expect(() => invertOperation({ type: 'explode' })).toThrow('unknown operation type')
  })
})

// ─── Invertibility (apply then invert = identity) ────────────────────────────

describe('invertibility', () => {
  test('insert_text then its inverse returns the original doc', () => {
    const doc = makeDoc()
    const op = { type: 'insert_text', path: [0, 0], offset: 2, text: 'XY' }
    const after = applyOperation(doc, op)
    const back = applyOperation(after, invertOperation(op))
    expect(child(back, 0, 0).text).toBe('Hello')
  })

  test('remove_text then its inverse returns the original doc', () => {
    const doc = makeDoc()
    const op = { type: 'remove_text', path: [0, 0], offset: 1, text: 'ell' }
    const after = applyOperation(doc, op)
    const back = applyOperation(after, invertOperation(op))
    expect(child(back, 0, 0).text).toBe('Hello')
  })

  test('insert_node then its inverse returns the original doc', () => {
    const doc = makeDoc()
    const node = { type: 'paragraph', children: [{ type: 'text', text: 'New', marks: [] }] }
    const op = { type: 'insert_node', path: [1], node }
    const after = applyOperation(doc, op)
    const back = applyOperation(after, invertOperation(op))
    expect(back.children).toHaveLength(2)
  })

  test('remove_node then its inverse returns the original doc', () => {
    const doc = makeDoc()
    const node = child(doc, 1)
    const op = { type: 'remove_node', path: [1], node }
    const after = applyOperation(doc, op)
    const back = applyOperation(after, invertOperation(op))
    expect(back.children).toHaveLength(2)
    expect(child(back, 1).children[0].text).toBe('Second')
  })

  test('split_node then its inverse returns the original text', () => {
    const doc = makeDoc()
    const op = { type: 'split_node', path: [0, 0], position: 2 }
    const after = applyOperation(doc, op)
    const back = applyOperation(after, invertOperation(op))
    expect(child(back, 0, 0).text).toBe('Hello')
    expect(child(back, 0).children).toHaveLength(2)
  })

  test('merge_node then its inverse returns the original structure', () => {
    const doc = makeDoc()
    const op = { type: 'merge_node', path: [0, 1], position: 5 }
    const after = applyOperation(doc, op)
    const back = applyOperation(after, invertOperation(op))
    expect(child(back, 0).children).toHaveLength(2)
    expect(child(back, 0, 0).text).toBe('Hello')
    expect(child(back, 0, 1).text).toBe(' world')
  })
})
