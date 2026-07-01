import { useState, useCallback, createContext, useContext } from "react";
import { applyOperation, invertOperation } from "../model/operations.js";
import { createHistory, pushHistory, undo, redo } from "../model/history.js";
import { getNodeAtPath } from "../model/utils.js";
import { initialDoc } from "../model/testDoc.js";

// A React context so Toolbar can read editor state without prop drilling.
// Any component inside <EditorContext.Provider> can call useEditorContext()
// and get the full editor API.
export const EditorContext = createContext(null);
export function useEditorContext() {
  return useContext(EditorContext);
}

export function useEditor() {
  const [doc, setDoc] = useState(initialDoc);
  const [selection, setSelection] = useState(null);
  const [history, setHistory] = useState(createHistory());

  // Apply one or more operations as a single undoable action.
  // selectionBefore and selectionAfter let undo/redo restore the cursor.
  const apply = useCallback(
    (ops, selectionBefore, selectionAfter) => {
      setDoc((currentDoc) => {
        let newDoc = currentDoc;
        for (const op of ops) {
          newDoc = applyOperation(newDoc, op);
        }
        setHistory((h) =>
          pushHistory(h, {
            ops,
            selectionBefore: selectionBefore ?? selection,
            selectionAfter: selectionAfter ?? selection,
          }),
        );
        return newDoc;
      });
    },
    [selection],
  );

  // Undo the last action
  const handleUndo = useCallback(() => {
    setDoc((currentDoc) => {
      setHistory((currentHistory) => {
        const result = undo(currentHistory, currentDoc);
        if (!result) return currentHistory;
        setDoc(() => result.doc);
        setSelection(result.selection);
        return result.history;
      });
      return currentDoc; // immediately overwritten by setDoc inside
    });
  }, []);

  // Redo the last undone action
  const handleRedo = useCallback(() => {
    setDoc((currentDoc) => {
      setHistory((currentHistory) => {
        const result = redo(currentHistory, currentDoc);
        if (!result) return currentHistory;
        setDoc(() => result.doc);
        setSelection(result.selection);
        return result.history;
      });
      return currentDoc;
    });
  }, []);

  // Insert text at the current cursor position
  const insertText = useCallback(
    (text) => {
      if (!selection) return;
      const op = {
        type: "insert_text",
        path: selection.anchor.path,
        offset: selection.anchor.offset,
        text,
      };
      const selAfter = {
        anchor: {
          path: selection.anchor.path,
          offset: selection.anchor.offset + text.length,
        },
        focus: {
          path: selection.anchor.path,
          offset: selection.anchor.offset + text.length,
        },
      };
      apply([op], selection, selAfter);
      setSelection(selAfter);
    },
    [selection, apply],
  );

  // Delete one character backwards from the cursor
  const deleteBackward = useCallback(() => {
    if (!selection) return;
    const { path, offset } = selection.anchor;

    // if cursor is not at the start of a text node, delete the character before it
    if (offset > 1) {
      console.log("Delete a character of current text node")
      const op = {
        type: "remove_text",
        path,
        offset: offset - 1,
        text: " ", // placeholder — real implementation reads the actual character
      };
      const selAfter = {
        anchor: { path, offset: offset - 1 },
        focus: { path, offset: offset - 1 },
      };

      // if text node has only one character
        // if at the start of the block 
          // if only child of block
            // then text node can be ""
          // else NOT only child of block
            // then delete text node
        // else NOT at the start of the block
          //then delete text node

      // if text node is ""
        // if text node only child of block
          // then delete text node and block
        // else text node not only child of block
          // then delete text node
      apply([op], selection, selAfter);
      setSelection(selAfter);
      return;
    }

    const atDocStart =
      path.slice(0, -1).reduce((acc, val) => acc + val, 0) === 0;

    if (atDocStart) {
      console.log("Can't delete backwards at the start of the doc");
      return;
    }

    const atFirstTextNode = path[path.length - 1] === 0;
    if (atFirstTextNode) {
      console.log("Merge with previous block and try merge text nodes")
      const op = {

      }
    }

    if (!atFirstTextNode) {
      console.log("Delete last character of previous text node")
    }
  }, [selection, apply]);

  // Split the current block at the cursor (what happens when you press Enter)
  const splitBlock = useCallback(() => {
    if (!selection) return;
    const [blockIndex, textIndex] = selection.anchor.path;
    const charOffset = selection.anchor.offset;

    const ops = [
      // 1. Split the text node at the character position
      {
        type: "split_node",
        path: [blockIndex, textIndex],
        position: charOffset,
      },
      // 2. Split the paragraph at the next text node boundary
      {
        type: "split_node",
        path: [blockIndex],
        position: textIndex + 1,
      },
    ];

    const selAfter = {
      anchor: { path: [blockIndex + 1, 0], offset: 0 },
      focus: { path: [blockIndex + 1, 0], offset: 0 },
    };

    apply(ops, selection, selAfter);
    setSelection(selAfter);
  }, [selection, apply]);

  // Toggle a mark on the current selection
  const toggleMark = useCallback(
    (mark) => {
      if (!selection) return;
      // TODO: full implementation walks all text nodes in the selection
      // For now, toggle on the single text node at the anchor
      const path = selection.anchor.path;
      // setDoc is used directly here so we can read the current node
      setDoc((currentDoc) => {
        const { getNodeAtPath } = require("../model/utils.js");
        const node = getNodeAtPath(currentDoc, path);
        if (!node || node.type !== "text") return currentDoc;
        const hasMark = node.marks.includes(mark);
        const newMarks = hasMark
          ? node.marks.filter((m) => m !== mark)
          : [...node.marks, mark];
        const op = {
          type: "set_node",
          path,
          newProps: { marks: newMarks },
          oldProps: { marks: node.marks },
        };
        setHistory((h) =>
          pushHistory(h, {
            ops: [op],
            selectionBefore: selection,
            selectionAfter: selection,
          }),
        );
        return applyOperation(currentDoc, op);
      });
    },
    [selection],
  );

  // Change the type of the current block (e.g. paragraph → heading)
  const setBlockType = useCallback(
    (type, attrs = {}) => {
      if (!selection) return;
      const blockPath = [selection.anchor.path[0]];
      setDoc((currentDoc) => {
        const { getNodeAtPath } = require("../model/utils.js");
        const node = getNodeAtPath(currentDoc, blockPath);
        const op = {
          type: "set_node",
          path: blockPath,
          newProps: { type, attrs },
          oldProps: { type: node.type, attrs: node.attrs },
        };
        setHistory((h) =>
          pushHistory(h, {
            ops: [op],
            selectionBefore: selection,
            selectionAfter: selection,
          }),
        );
        return applyOperation(currentDoc, op);
      });
    },
    [selection],
  );

  return {
    doc,
    selection,
    setSelection,
    apply,
    undo: handleUndo,
    redo: handleRedo,
    insertText,
    deleteBackward,
    splitBlock,
    toggleMark,
    setBlockType,
  };
}
