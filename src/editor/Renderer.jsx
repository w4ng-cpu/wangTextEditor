// Renders a single text node, applying marks as nested elements
function renderText(node) {
  let el = node.text
  if (node.marks.includes('code'))          el = <code>{el}</code>
  if (node.marks.includes('bold'))          el = <strong>{el}</strong>
  if (node.marks.includes('italic'))        el = <em>{el}</em>
  if (node.marks.includes('underline'))     el = <u>{el}</u>
  if (node.marks.includes('strikethrough')) el = <s>{el}</s>
  return el
}

// Recursively renders any node in the tree
function renderNode(node, path = [], key = 0) {
  // data-path turns the path array into a string like "0,1,2"
  // This is how useSelection will map DOM positions back to model paths later
  const dataPath = path.join(',')

  switch (node.type) {

    case 'doc':
      return (
        <div data-rte-root data-path={dataPath} key={key}>
          {node.children.map((child, i) =>
            renderNode(child, [...path, i], i)
          )}
        </div>
      )

    case 'paragraph':
      return (
        <p data-path={dataPath} key={key}>
          {node.children.length === 0
            ? <br />
            : node.children.map((child, i) =>
                renderNode(child, [...path, i], i)
              )
          }
        </p>
      )

    case 'heading': {
      const Tag = `h${node.attrs.level}`
      return (
        <Tag data-path={dataPath} key={key}>
          {node.children.map((child, i) =>
            renderNode(child, [...path, i], i)
          )}
        </Tag>
      )
    }

    case 'blockquote':
      return (
        <blockquote data-path={dataPath} key={key}>
          {node.children.map((child, i) =>
            renderNode(child, [...path, i], i)
          )}
        </blockquote>
      )

    case 'code_block':
      return (
        <pre data-path={dataPath} key={key}>
          <code>
            {node.children.map((child, i) =>
              renderNode(child, [...path, i], i)
            )}
          </code>
        </pre>
      )

    case 'table':
      return (
        <table data-path={dataPath} key={key}>
          <tbody>
            {node.children.map((child, i) =>
              renderNode(child, [...path, i], i)
            )}
          </tbody>
        </table>
      )

    case 'table_row':
      return (
        <tr data-path={dataPath} key={key}>
          {node.children.map((child, i) =>
            renderNode(child, [...path, i], i)
          )}
        </tr>
      )

    case 'table_cell': {
      const Cell = node.attrs.header ? 'th' : 'td'
      return (
        <Cell data-path={dataPath} key={key}>
          {node.children.map((child, i) =>
            renderNode(child, [...path, i], i)
          )}
        </Cell>
      )
    }

    case 'link':
      return (
        <a
          href={node.href}
          data-path={dataPath}
          key={key}
          target="_blank"
          rel="noopener noreferrer"
        >
          {node.children.map((child, i) =>
            renderNode(child, [...path, i], i)
          )}
        </a>
      )

    case 'embed':
      return (
        <figure data-path={dataPath} data-void="true" key={key}>
          <img src={node.attrs.src} alt={node.attrs.alt || ''} />
          {node.attrs.caption && (
            <figcaption>{node.attrs.caption}</figcaption>
          )}
        </figure>
      )

    case 'text':
      return (
        <span data-path={dataPath} key={key}>
          {node.text === '' ? <br /> : renderText(node)}
        </span>
      )

    default:
      console.warn(`renderNode: unknown node type "${node.type}"`)
      return null
  }
}

// The exported component — just calls renderNode on the doc root
export default function Renderer({ doc }) {
  return renderNode(doc, [], 0)
}