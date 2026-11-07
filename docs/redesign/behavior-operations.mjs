import fs from "node:fs"
import cp from "node:child_process"
import ts from "typescript"

const files = cp.execFileSync("git", ["-c", "core.safecrlf=false", "diff", "--name-only", "--diff-filter=M"], {
  encoding: "utf8", stdio: ["pipe", "pipe", "ignore"],
}).trim().split(/\r?\n/).filter(file => /\.tsx?$/.test(file))

const blob = cp.execFileSync("git", ["cat-file", "--batch"], {
  input: files.map(file => `HEAD:${file}\n`).join(""), maxBuffer: 100e6,
})
let cursor = 0
const original = new Map()
for (const file of files) {
  const end = blob.indexOf(10, cursor)
  const size = Number(blob.subarray(cursor, end).toString().split(" ").at(-1))
  cursor = end + 1
  original.set(file, blob.subarray(cursor, cursor + size).toString())
  cursor += size + 1
}

function collect(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const calls = [], events = [], routes = []
  const clean = node => node.getText(source).replace(/\s+/g, " ")
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(source)
      if (/^(?:supabase(?:Admin|Client)?\b|router\.(?:push|replace|refresh)\b|fetch$|window\.location\.(?:assign|replace)$)/.test(expression)) {
        calls.push(clean(node))
      }
    }
    if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(source))) events.push(clean(node))
    if (ts.isJsxAttribute(node) && node.name.getText(source) === "href") routes.push(clean(node))
    ts.forEachChild(node, visit)
  }
  visit(source)
  return { calls, events, routes }
}

const diffs = []
let calls = 0, handlers = 0, hrefs = 0
for (const file of files) {
  const before = collect(file, original.get(file))
  const after = collect(file, fs.readFileSync(file, "utf8"))
  calls += before.calls.length
  handlers += before.events.length
  hrefs += before.routes.length
  const difference = { file }
  for (const key of ["calls", "events", "routes"]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      difference[key] = {
        removed: before[key].filter(value => !after[key].includes(value)),
        added: after[key].filter(value => !before[key].includes(value)),
        beforeCount: before[key].length,
        afterCount: after[key].length,
      }
    }
  }
  if (Object.keys(difference).length > 1) diffs.push(difference)
}

const report = {
  files: files.length,
  dataAndNavigationCallExpressions: calls,
  jsxEventHandlers: handlers,
  jsxHrefAttributes: hrefs,
  diffs,
  method: "TypeScript AST extraction of Supabase/client query chains, fetch and router navigation calls, all JSX onX handlers and href attributes, compared exactly with whitespace normalized. Intended navigation link redesign exceptions are listed for review.",
}
fs.writeFileSync("docs/redesign/behavior-operations.json", JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify(report, null, 2))
