import { useRef, useEffect, useLayoutEffect } from 'react'
import { EditorContext, useEditor } from './useEditor.js'
import { handleKeyDown, handleBeforeInput, handlePaste } from './eventHandlers.js'
import Renderer from './Renderer.jsx'

// Drills into an element to find its innermost DOM text node.
// Needed because mark wrappers (strong, em, etc.) sit between the span and the text.
function getDeepTextNode(el) {
  let node = el
  while (node && node.nodeType !== Node.TEXT_NODE) {
    node = node.firstChild
  }
  return node ?? null
}

export default function Editor({ placeholder = 'Start writing…' }) {
  const editor = useEditor()
  const editorRef = useRef(null)
  const isSyncingSelection = useRef(false)

  // After each render, push the model selection back into the browser.
  // Without this, React's DOM update invalidates the browser's selection
  // (the old text node no longer exists), Chrome resets it to offset 0,
  // selectionchange fires, and the model selection is overwritten with 0.
  useLayoutEffect(() => {
    const sel = editor.selection
    if (!sel || !editorRef.current) return

    const anchorEl = editorRef.current.querySelector(`[data-path="${sel.anchor.path.join(',')}"]`)
    const focusEl  = editorRef.current.querySelector(`[data-path="${sel.focus.path.join(',')}"]`)
    if (!anchorEl || !focusEl) return

    const anchorTextNode = getDeepTextNode(anchorEl)
    const focusTextNode  = getDeepTextNode(focusEl)

    // For non-empty text nodes use the text node (character offset).
    // For empty text nodes (<br>) fall back to the span element (child offset 0)
    // so the cursor lands inside the span rather than at the block <p> level.
    // Without this, selectionchange reads anchorNode = <p> → resolves to a
    // block-level path → the next keystroke tries insert_text on a paragraph node.
    const anchorTarget = anchorTextNode ?? anchorEl
    const focusTarget  = focusTextNode  ?? focusEl
    const anchorOffset = anchorTextNode ? Math.min(sel.anchor.offset, anchorTextNode.length) : 0
    const focusOffset  = focusTextNode  ? Math.min(sel.focus.offset,  focusTextNode.length)  : 0

    isSyncingSelection.current = true
    window.getSelection().setBaseAndExtent(anchorTarget, anchorOffset, focusTarget, focusOffset)
    // Fallback: if setBaseAndExtent was a no-op (e.g. offset clamped by browser),
    // selectionchange never fires and the flag would stay true, swallowing the
    // next real cursor event. Reset it in the next task as a safety net.
    setTimeout(() => { isSyncingSelection.current = false }, 0)
  }, [editor.selection])

  // Read the browser's selection and convert it to a model selection.
  useEffect(() => {
    function onSelectionChange() {
      // Ignore the selectionchange that fires as a result of our own
      // programmatic restoration above — that position is already correct.
      if (isSyncingSelection.current) {
        isSyncingSelection.current = false
        return
      }

      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      if (!editorRef.current) return
      if (!editorRef.current.contains(sel.anchorNode)) return

      function getPathAndOffset(domNode, offset) {
        let node = domNode
        if (node.nodeType === Node.TEXT_NODE) {
          return { path: getDataPath(node.parentElement), offset }
        }
        return { path: getDataPath(node), offset }
      }

      function getDataPath(el) {
        let current = el
        while (current && current !== editorRef.current) {
          const p = current.getAttribute?.('data-path')
          if (p !== null && p !== undefined && p !== '') {
            return p.split(',').map(Number)
          }
          current = current.parentElement
        }
        return [0, 0]
      }

      const anchor = getPathAndOffset(sel.anchorNode, sel.anchorOffset)
      const focus  = getPathAndOffset(sel.focusNode,  sel.focusOffset)

      editor.setSelection({ anchor, focus })
    }

    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [editor])

  const isEmpty =
    editor.doc.children.length === 1 &&
    editor.doc.children[0].type === 'paragraph' &&
    editor.doc.children[0].children.length === 1 &&
    editor.doc.children[0].children[0].text === ''

  return (
    <EditorContext.Provider value={editor}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onKeyDown={e => handleKeyDown(e, editor)}
        onBeforeInput={e => handleBeforeInput(e, editor)}
        onPaste={e => handlePaste(e, editor)}
        data-placeholder={isEmpty ? placeholder : undefined}
        style={{ position: 'relative' }}
      >
        <Renderer doc={editor.doc} />
      </div>
    </EditorContext.Provider>
  )
}