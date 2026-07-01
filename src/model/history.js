import { applyOperation, invertOperation } from './operations.js'

// Creates a fresh empty history
export function createHistory() {
  return {
    undos: [], // stack of past entries — each is a list of ops that got us here
    redos: [], // stack of undone entries — refilled when user undoes
  }
}

// An entry is everything needed to undo or redo one user action.
// A single user action (like "toggle bold") may produce several ops,
// so we group them together into one entry so Ctrl+Z undoes them all at once.
//
// entry shape:
// {
//   ops: Operation[],           the ops that were applied
//   selectionBefore: Selection, where the cursor was before the action
//   selectionAfter: Selection,  where the cursor ended up after
// }

// Call this after applying a batch of ops for one user action.
// Returns a new history — never mutates the old one.
export function pushHistory(history, entry) {
  return {
    undos: [...history.undos, entry],
    redos: [], // any future undos are lost when you do something new
  }
}

// Undo the most recent action.
// Returns { doc, history, selection } or null if nothing to undo.
export function undo(history, doc) {
  if (history.undos.length === 0) return null

  const entry = history.undos[history.undos.length - 1]
  const remainingUndos = history.undos.slice(0, -1)

  // Apply each op's inverse in reverse order
  // If the original ops were [A, B, C], we apply [C⁻¹, B⁻¹, A⁻¹]
  let newDoc = doc
  const inverseOps = [...entry.ops].reverse().map(invertOperation)
  for (const op of inverseOps) {
    newDoc = applyOperation(newDoc, op)
  }

  return {
    doc: newDoc,
    history: {
      undos: remainingUndos,
      redos: [...history.redos, entry], // push this entry onto redo stack
    },
    selection: entry.selectionBefore, // restore cursor to where it was before
  }
}

// Redo the most recently undone action.
// Returns { doc, history, selection } or null if nothing to redo.
export function redo(history, doc) {
  if (history.redos.length === 0) return null

  const entry = history.redos[history.redos.length - 1]
  const remainingRedos = history.redos.slice(0, -1)

  // Replay the original ops in their original order
  let newDoc = doc
  for (const op of entry.ops) {
    newDoc = applyOperation(newDoc, op)
  }

  return {
    doc: newDoc,
    history: {
      undos: [...history.undos, entry], // push back onto undo stack
      redos: remainingRedos,
    },
    selection: entry.selectionAfter, // restore cursor to where it ended up
  }
}