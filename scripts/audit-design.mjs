import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file) : [file.replaceAll('\\', '/')]
  })
}

const files = [...walk('app'), ...walk('components')].filter(file => /\.tsx?$/.test(file))
const rows = files.filter(file => /\/(page|layout|loading|error)\.tsx$/.test(file)).map(file => {
  const text = fs.readFileSync(file, 'utf8')
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const imports = tree.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text)
  const tables = [...text.matchAll(/\.from\(["']([^"']+)["']\)/g)].map(match => match[1])
  const route = '/' + path.dirname(file).replace(/^app\/?/, '')
  const mode = route.startsWith('/terminal') ? 'Terminal' : route.startsWith('/admin') ? 'Administration' : /beamer|emd-tv|\/statistics\/|live-statistics/.test(route) ? 'Live / TV / Turnieranzeige' : /chat|messenger/.test(route) ? 'Nachrichten' : 'App'
  return { file, route, mode, imports, tables: [...new Set(tables)], client: text.includes('"use client"') }
})
fs.mkdirSync('docs/redesign', { recursive: true })
fs.writeFileSync('docs/redesign/routes.json', JSON.stringify(rows, null, 2) + '\n')
fs.writeFileSync('docs/redesign/SEITENUEBERSICHT.md', `# EMD Seiten und Abhängigkeiten\n\nAutomatisch aus dem vorhandenen Quellcode erfasst. ${rows.filter(row => row.file.endsWith('/page.tsx')).length} Seiten; ${rows.length} Seiten-, Layout-, Lade- und Fehlerdateien. Authentifizierung und Modulzugriff bleiben in den vorhandenen Guards und Hooks. Tabellenangaben sind direkte Zugriffe; importierte Hooks und Komponenten enthalten weitere Abhängigkeiten.\n\n| Route | Typ | Quelldatei | Lokale UI-/Hook-Abhängigkeiten | Direkte Tabellen |\n|---|---|---|---|---|\n` + rows.map(row => `| \`${row.route}\` | ${path.basename(row.file)} · ${row.mode} | \`${row.file}\` | ${row.imports.filter(name => name.startsWith('@/') || name.startsWith('.')).map(name => '\`' + name + '\`').join(', ') || '—'} | ${row.tables.join(', ') || '—'} |`).join('\n') + '\n')
console.log(`Inventoried ${rows.length} route files across ${files.length} TypeScript files.`)
