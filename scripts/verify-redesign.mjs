import fs from 'node:fs'
import cp from 'node:child_process'
import ts from 'typescript'
import postcss from 'postcss'
import assert from 'node:assert/strict'

const modified = cp.execFileSync('git', ['-c', 'core.safecrlf=false', 'diff', '--name-only'], {encoding:'utf8',stdio:['pipe','pipe','ignore']}).trim().split(/\r?\n/)
const added = cp.execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {encoding:'utf8'}).trim().split(/\r?\n/)
const sources = [...new Set([...modified, ...added])].filter(file=>/\.tsx?$/.test(file))
const syntax = []
for (const file of sources) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}})
  syntax.push(...(result.diagnostics ?? []).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>({file,message:ts.flattenDiagnosticMessageText(d.messageText,' ')})))
}
assert.deepEqual(syntax, [], 'TS/TSX syntax errors')
const stylesheets = ['app/globals.css','app/premium.css','app/specialty-premium.css','app/admin/admin.css']
for (const file of stylesheets) postcss.parse(fs.readFileSync(file,'utf8'), {from:file})

const css=fs.readFileSync('app/globals.css','utf8')
const token=name=>css.match(new RegExp(`--${name}:\\s*(#[a-fA-F0-9]{6})`))?.[1]
function luminance(hex) {
  return hex.slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
}
const pairs=[['foreground','background'],['card-foreground','card'],['muted-foreground','card'],['muted-foreground','muted'],['primary-foreground','primary'],['destructive-foreground','destructive']]
const contrast=pairs.map(([text,bg])=>{
  const a=luminance(token(text)),b=luminance(token(bg)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05)
  assert.ok(ratio>=4.5,`${text} on ${bg}: ${ratio.toFixed(2)} below WCAG AA`)
  return {text,background:bg,ratio:Number(ratio.toFixed(2))}
})
const sensitive=modified.filter(file=>/^(?:lib|hooks|supabase|app\/api|app\/actions)\//.test(file))
assert.deepEqual(sensitive,[], 'Unexpected data/auth/API-layer edits')
const layout=fs.readFileSync('app/layout.tsx','utf8')
assert.ok(!layout.includes('WARTUNGSMODUS'), 'Website maintenance lock remains')
assert.ok(layout.includes('<AppRouteGuard>')&&layout.includes('<SupabaseSessionGuard />'), 'Existing access guards must remain')
const report={syntaxFiles:sources.length,syntaxErrors:syntax.length,stylesheetsParsed:stylesheets.length,contrast,modifiedDataLayerFiles:sensitive,maintenanceLockRemoved:true}
fs.writeFileSync('docs/redesign/verification.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
