export const initialDoc = {
  type: 'doc',
  children: [
    {
      type: 'heading',
      attrs: { level: 1 },
      children: [
        { type: 'text', text: 'My first editor', marks: [] }
      ]
    },
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'This is ', marks: [] },
        { type: 'text', text: 'bold', marks: ['bold'] },
        { type: 'text', text: ' and ', marks: [] },
        { type: 'text', text: 'italic', marks: ['italic'] },
        { type: 'text', text: ' text.', marks: [] }
      ]
    },
    // {
    //   type: 'paragraph',
    //   children: [
    //     { type: 'text', text: 'A link to ', marks: [] },
    //     {
    //       type: 'link',
    //       href: 'https://example.com',
    //       children: [
    //         { type: 'text', text: 'example.com', marks: [] }
    //       ]
    //     },
    //     { type: 'text', text: ' lives inline.', marks: [] }
    //   ]
    // },
    // {
    //   type: 'blockquote',
    //   children: [
    //     {
    //       type: 'paragraph',
    //       children: [
    //         { type: 'text', text: 'A blockquote sits here.', marks: [] }
    //       ]
    //     }
    //   ]
    // },
    // {
    //   type: 'code_block',
    //   attrs: { language: 'javascript' },
    //   children: [
    //     { type: 'text', text: 'const x = 42\nconsole.log(x)', marks: [] }
    //   ]
    // },
    // {
    //   type: 'heading',
    //   attrs: { level: 2 },
    //   children: [
    //     { type: 'text', text: 'A table below', marks: [] }
    //   ]
    // },
    // {
    //   type: 'table',
    //   children: [
    //     {
    //       type: 'table_row',
    //       children: [
    //         {
    //           type: 'table_cell',
    //           attrs: { header: true },
    //           children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Name', marks: [] }] }]
    //         },
    //         {
    //           type: 'table_cell',
    //           attrs: { header: true },
    //           children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Score', marks: [] }] }]
    //         }
    //       ]
    //     },
    //     {
    //       type: 'table_row',
    //       children: [
    //         {
    //           type: 'table_cell',
    //           attrs: {},
    //           children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Alice', marks: [] }] }]
    //         },
    //         {
    //           type: 'table_cell',
    //           attrs: {},
    //           children: [{ type: 'paragraph', children: [{ type: 'text', text: '98', marks: [] }] }]
    //         }
    //       ]
    //     }
    //   ]
    // }
  ]
}