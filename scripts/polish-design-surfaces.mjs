import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name).replaceAll('\\','/')])
}
const exclude = /(?:components\/ui\/|components\/(header|footer|mobile-bottom-nav)\.tsx|app\/(admin|terminal)\/|app\/(login|member-login|guest-login|member-set-password|member-account-request|member-dashboard-app|member-profile-app|veranstaltungen)\/|beamer|emd-tv|print|drucken|scan|kamera|vision|mission\/|____advent|animation\/)/
let backgrounds=0,gradients=0
for(const file of [...walk('app'),...walk('components')].filter(f=>f.endsWith('.tsx')&&!exclude.test(f))) {
  const source=fs.readFileSync(file,'utf8')
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  const edits=[]
  function visit(node) {
    if(ts.isJsxElement(node)) {
      const attr=node.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.text==='className')
      const cls=attr?.initializer&&ts.isStringLiteral(attr.initializer)?attr.initializer.text:''
      const raw=node.getText(tree)
      if(cls.includes('fixed')&&cls.includes('inset-0')&&cls.includes('pointer-events-none')&&raw.includes('/terminal/hero-startscreen.png')&&!/onClick|onChange|<button|<input|<a\b|<Link\b/.test(raw)) {
        edits.push({start:node.getStart(tree),end:node.end,text:'<div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />'})
        backgrounds++
        return
      }
    }
    if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node)) {
      const raw=source.slice(node.getStart(tree),node.end)
      if((/bg-gradient-to-|bg-linear-to-|bg-\[(?:linear|radial)-gradient/.test(raw))&&!(/absolute/.test(raw)&&/inset-/.test(raw))) {
        const isText=raw.includes('bg-clip-text')
        let updated=raw.replace(/(?:[\w-]+:)*bg-(?:gradient|linear)-to-[\w-]+/g,'bg-card')
          .replace(/(?:[\w-]+:)*bg-\[(?:linear|radial)-gradient[^\s"`]+\]/g,'bg-card')
          .replace(/(?<![\w-])(?:[\w-]+:)*(?:from|via|to)-(?:\[[^\s]+?\]|[a-z]+-\d+|transparent|black|white)(?:\/(?:\d+|\[[\d.]+\]))?/g,'')
        if(isText) updated=updated.replace(/bg-card|bg-clip-text|text-transparent/g,'').replace(/^(["'`])/,'$1text-primary ')
        else if(!/text-(?:white|black|foreground|primary|muted|[a-z]+-\d)/.test(updated)) updated=updated.replace(/^(["'`])/,'$1text-foreground ')
        if(raw!==updated) {edits.push({start:node.getStart(tree),end:node.end,text:updated});gradients++}
      }
    }
    ts.forEachChild(node,visit)
  }
  visit(tree)
  let output=source
  for(const edit of edits.sort((a,b)=>b.start-a.start)) output=output.slice(0,edit.start)+edit.text+output.slice(edit.end)
  if(output!==source) fs.writeFileSync(file,output)
}
console.log(`Replaced ${backgrounds} repeated wallpaper layers and ${gradients} ornamental gradient class strings.`)
