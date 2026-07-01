export function handleKeyDown(e, editor) {
  const mod = e.ctrlKey || e.metaKey

  // Undo / redo
  if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo();    return }
  if (mod && e.key === 'z' &&  e.shiftKey) { e.preventDefault(); editor.redo();    return }
  if (mod && e.key === 'y')                { e.preventDefault(); editor.redo();    return }

  // Mark shortcuts
  if (mod && e.key === 'b') { e.preventDefault(); editor.toggleMark('bold');          return }
  if (mod && e.key === 'i') { e.preventDefault(); editor.toggleMark('italic');        return }
  if (mod && e.key === 'u') { e.preventDefault(); editor.toggleMark('underline');     return }

  // Block splitting and deletion
  if (e.key === 'Enter')     { e.preventDefault(); editor.splitBlock();               return }
  if (e.key === 'Backspace') { e.preventDefault(); editor.deleteBackward();           return }

  // Tab — insert spaces rather than moving focus away
  if (e.key === 'Tab')       { e.preventDefault(); editor.insertText('    ');         return }
}

export function handleBeforeInput(e, editor) {
  // Intercept all text insertion and route through the model
  // This fires before the browser types anything into the DOM
  e.preventDefault()
  if (e.data) {
    editor.insertText(e.data)
  }
}

export function handlePaste(e, editor) {
  // Strip all HTML — only accept plain text
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  if (text) {
    editor.insertText(text)
  }
}