import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createCanvas} from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
export async function extractPdf(file,folder,progress=()=>{}){
 fs.mkdirSync(folder,{recursive:true});
 const cache=path.join(folder,'result.json');
 if(fs.existsSync(cache))return JSON.parse(fs.readFileSync(cache,'utf8'));
 const manifest=[],pages=[];
 const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(file)),useSystemFonts:true,isEvalSupported:false}).promise;
 if(pdf.numPages>5000)throw new Error('文件超过 5000 页，请按章节拆分。');
 try{for(let n=1;n<=pdf.numPages;n++){
  const p=await pdf.getPage(n),tc=await p.getTextContent();
  const row={page:n,text:tc.items.map(x=>x.str?(x.str+(x.hasEOL?'\n':' ')):'').join('').trim(),method:'text'};
  if(row.text.replace(/\s/g,'').length<30){
   row.method='local-ocr';const image=path.join(folder,n+'.jpg'),output=path.join(folder,n+'.txt');
   if(!fs.existsSync(output)&&!fs.existsSync(image)){
    const base=p.getViewport({scale:1}),scale=Math.min(1.8,2200/Math.max(base.width,base.height));
    const viewport=p.getViewport({scale}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;fs.writeFileSync(image,canvas.toBuffer('image/jpeg',92));
   }
   manifest.push({image,output});
  }
  pages.push(row);p.cleanup();if(n%25===0)progress(n,pdf.numPages);
 }}finally{await pdf.destroy();}
 if(manifest.length){
  const manifestPath=path.join(folder,'manifest.json');fs.writeFileSync(manifestPath,JSON.stringify(manifest));
  const source=fs.readFileSync(new URL('./windows-ocr.ps1',import.meta.url),'utf8').replace('param([string]$Manifest)','$Manifest=$env:STUDY_OCR_MANIFEST');
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',source],{stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,STUDY_OCR_MANIFEST:manifestPath}});
  let failure='';child.stderr.on('data',b=>{failure+=b.toString().slice(0,2000);});
  child.stdout.on('data',()=>progress(pages.filter(p=>p.method==='text'||fs.existsSync(path.join(folder,p.page+'.txt'))).length,pages.length));
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});if(code!==0)throw new Error('本机扫描识别失败：'+failure.slice(-500));
 }
 for(const p of pages){if(p.method==='local-ocr')p.text=fs.readFileSync(path.join(folder,p.page+'.txt'),'utf8').trim()||'[此页未识别到文字，请查看原页]';p.text=p.text.replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g,'$1');}
 fs.writeFileSync(cache,JSON.stringify(pages));return pages;
}
export function fullText(pages){return pages.map(p=>'[PDF第'+p.page+'页]'+(p.method==='local-ocr'?'（本机识别，公式需核对原页）':'')+'\n'+p.text).join('\n\n');}
