import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

// Syntax-aware, presentation-only migration. Specialty views keep their geometry.
const skip = /(?:components\/ui\/|components\/(?:header|footer|mobile-bottom-nav)\.tsx|app\/(?:admin|terminal)\/|beamer\/|emd-tv|print|drucken|scan|kamera|vision|mission\/|____advent|animation\/)/
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const file=path.join(dir,entry.name).replaceAll('\\','/')
    return entry.isDirectory()?walk(file):[file]
  })
}
function migrate(value) {
  return value.replace(/(?<![\w-])((?:(?:hover|focus|dark|disabled|group-hover|sm|md|lg|xl):)*)(bg|text|border|divide|ring|placeholder)-(slate|gray|zinc|neutral)-(50|100|200|300|400|500|600|700|800|900|950)(\/(?:\d+|\[[\d.]+\]))?(?![\w-])/g,
    (_,variant,kind,family,shade,alpha='')=> {
      const n=Number(shade)
      if(kind==='bg') return variant+'bg-'+(n<=100?'muted':n<=300?'secondary':n<=700?'accent':'background')+alpha
      if(kind==='text'||kind==='placeholder') return variant+kind+'-'+(n>=800?'foreground':'muted-foreground')
      if(kind==='ring') return variant+'ring-border'+alpha
      return variant+kind+'-border'+alpha
    })
    .replace(/(?<![\w-])bg-white(?![\w/\[-])/g,'bg-card')
    .replace(/(?<![\w-])bg-\[#(?:050608|050505|080a0f|070b11|080d14|070b12|030509)\](?:\/\d+)?/gi,'bg-background')
    .replace(/(?<![\w-])bg-\[#(?:0c1118|0b1018|111418|0c0d12|071527|120c0d|101722)\](?:\/\d+)?/gi,'bg-card')
    .replace(/(?<![\w-])text-white\/(?:30|35|40|45|50|55)(?!\d)/g,'text-muted-foreground')
    .replace(/(?<![\w-])backdrop-blur(?:-(?:sm|md|lg|xl|2xl|3xl))?(?![\w-])/g,'')
    .replace(/(?<![\w-])font-black(?![\w-])/g,'font-semibold')
    .replace(/(?<![\w-])bg-black\/(?:25|30|35|40|50|60)(?!\d)/g,'bg-card')
}
const changed=[]
for(const file of [...walk('app'),...walk('components')].filter(file=>file.endsWith('.tsx')&&!skip.test(file))) {
  const source=fs.readFileSync(file,'utf8')
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  const edits=[]
  function visit(node) {
    if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node)) {
      const start=node.getStart(tree),end=node.end
      const raw=source.slice(start,end),updated=migrate(raw)
      if(updated!==raw) edits.push({start,end,updated})
    }
    ts.forEachChild(node,visit)
  }
  visit(tree)
  let output=source
  for(const edit of edits.sort((a,b)=>b.start-a.start)) output=output.slice(0,edit.start)+edit.updated+output.slice(edit.end)
  if(output!==source) {fs.writeFileSync(file,output);changed.push(file)}
}
fs.mkdirSync('docs/redesign',{recursive:true})
fs.writeFileSync('docs/redesign/migrated-files.json',JSON.stringify(changed,null,2)+'\n')
console.log(`Migrated utility tokens in ${changed.length} view files.`)
