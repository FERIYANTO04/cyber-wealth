// Dev-only webpack loader: stamps every DOM element written in JSX with
// data-loc="<file>:<line>:<col>" so the preview's element picker can tell the
// agent exactly which source line produced what the user clicked, instead of a
// CSS path it has to reverse-engineer. The id is the source position, not a
// random or counted value, so the server and client bundles produce identical
// markup (no hydration mismatch) and it survives reloads.
//
// Only lowercase tags are stamped: a component (<Card>) does not forward
// unknown props, so the attribute would be dropped or fail its prop types.
// Uses the Babel parser Next already ships, so the project gains no dependency.
const path = require('path')
const { parse } = require('next/dist/compiled/babel/parser')

const ATTRIBUTE = 'data-loc'

function collectInsertions(node, file, out) {
  if (!node || typeof node.type !== 'string') return
  if (
    node.type === 'JSXOpeningElement' &&
    node.name.type === 'JSXIdentifier' &&
    /^[a-z]/.test(node.name.name) &&
    !node.attributes.some((attr) => attr.type === 'JSXAttribute' && attr.name.name === ATTRIBUTE)
  ) {
    const { line, column } = node.loc.start
    out.push({ at: node.name.end, text: ` ${ATTRIBUTE}="${file}:${line}:${column + 1}"` })
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
    const value = node[key]
    if (Array.isArray(value)) value.forEach((child) => collectInsertions(child, file, out))
    else if (value && typeof value === 'object') collectInsertions(value, file, out)
  }
}

module.exports = function jsxLocLoader(source) {
  const file = path.relative(this.rootContext, this.resourcePath).split(path.sep).join('/')
  let ast
  try {
    ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  } catch {
    return source
  }
  const insertions = []
  collectInsertions(ast.program, file, insertions)
  insertions.sort((a, b) => b.at - a.at)
  let code = source
  for (const { at, text } of insertions) code = code.slice(0, at) + text + code.slice(at)
  return code
}
