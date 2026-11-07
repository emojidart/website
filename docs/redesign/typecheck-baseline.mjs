import fs from 'node:fs'
import path from 'node:path'
import cp from 'node:child_process'
import ts from 'typescript'

const modified=cp.execFileSync('git',['-c','core.safecrlf=false','diff','--name-only','--diff-filter=M'],{encoding:'utf8',stdio:['pipe','pipe','ignore']}).trim().split(/\r?\n/).filter(f=>/\.tsx?$/.test(f))
const newFiles=cp.execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>/\.tsx?$/.test(f))
const normalize=file=>path.resolve(file).replaceAll('\\','/').toLowerCase()
const blob=cp.execFileSync('git',['cat-file','--batch'],{input:modified.map(f=>'HEAD:'+f+'\n').join(''),maxBuffer:100e6})
let cursor=0
const originals=new Map()
for(const file of modified){const end=blob.indexOf(10,cursor);const header=blob.subarray(cursor,end).toString();const size=Number(header.split(' ').at(-1));cursor=end+1;originals.set(normalize(file),blob.subarray(cursor,cursor+size).toString('utf8'));cursor+=size+1}
const configFile=ts.readConfigFile('tsconfig.json',ts.sys.readFile)
const config=ts.parseJsonConfigFileContent(configFile.config,ts.sys,process.cwd())
function diagnostics(baseline){
 const host=ts.createCompilerHost({...config.options,incremental:false},true)
 const realRead=host.readFile.bind(host)
 host.readFile=file=>baseline&&originals.has(normalize(file))?originals.get(normalize(file)):realRead(file)
 const realSource=host.getSourceFile.bind(host)
 host.getSourceFile=(file,languageVersion,onError,shouldCreateNewSourceFile)=>{
  const original=baseline?originals.get(normalize(file)):undefined
  return original===undefined?realSource(file,languageVersion,onError,shouldCreateNewSourceFile):ts.createSourceFile(file,original,languageVersion,true)
 }
 const omitted=new Set(newFiles.map(normalize))
 let program=ts.createProgram(config.fileNames.filter(f=>!baseline||!omitted.has(normalize(f))),{...config.options,incremental:false},host)
 const result=ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?path.relative(process.cwd(),d.file.fileName).replaceAll('\\','/'):'<config>',code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' '),line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null}))
 program=undefined
 return result
}
console.log('Checking baseline with '+originals.size+' original source overrides...')
const baseline=diagnostics(true)
global.gc?.()
console.log('Baseline diagnostics: '+baseline.length+'. Checking worktree...')
const current=diagnostics(false)
const key=d=>JSON.stringify([d.file,d.code,d.message])
const counts=new Map()
for(const d of baseline)counts.set(key(d),(counts.get(key(d))||0)+1)
const introduced=[]
for(const d of current){const k=key(d),n=counts.get(k)||0;if(n)counts.set(k,n-1);else introduced.push(d)}
const resolvedCount=[...counts.values()].reduce((a,b)=>a+b,0)
const report={baseline:baseline.length,current:current.length,newDiagnostics:introduced,resolvedCount,modifiedSources:modified.length,newSourceFiles:newFiles,method:'Identical current TypeScript config and dependency tree; baseline compiler host substitutes all modified TS/TSX files with git HEAD sources and excludes new source files. Diagnostic multiset compared by file, code and message, ignoring line shifts.'}
fs.writeFileSync('docs/redesign/typecheck-baseline.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
