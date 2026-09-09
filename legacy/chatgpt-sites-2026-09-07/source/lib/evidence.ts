export function relevantText(all:string,query:string,nextPage=1,maxChars=20000):string {
  const chunks=all.split(/(?=\[(?:PDF第\d+页|第\d+(?:张幻灯片|部分))\])/).filter(Boolean);
  if(chunks.length<2)return all.slice(0,maxChars);
  const words=new Set((query.toLowerCase().match(/[a-z]{3,}|[\u4e00-\u9fff]{2,}/g)??[]).flatMap(x=>/[\u4e00-\u9fff]/.test(x)?Array.from({length:Math.max(0,x.length-1)},(_,i)=>x.slice(i,i+2)):[x]));
  const scored=chunks.map((chunk,index)=>({chunk,index,score:[...words].reduce((n,w)=>n+(chunk.toLowerCase().includes(w)?1:0),0)+(index<2?3:0)+(index>=nextPage-1&&index<nextPage+4?6:0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
  const selected:typeof scored=[];let length=0;
  for(const c of scored){if(length+c.chunk.length<=maxChars){selected.push(c);length+=c.chunk.length;}if(selected.length>=12)break;}
  if(!selected.length)return all.slice(0,maxChars);
  return selected.sort((a,b)=>a.index-b.index).map(c=>c.chunk).join('\n');
}

export function hasEvidence(location:string,steps:string[],quote:string,sourceText:string):boolean {
  const refs=[...(location+' '+steps.join(' ')).matchAll(/第\s*(\d+)\s*页/g)].map(m=>Number(m[1]));
  const timestamps=[...(location+' '+steps.join(' ')).matchAll(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g)].map(m=>m[0]);
  if(!refs.length&&!timestamps.length)return true;
  const clean=(s:string)=>s.replace(/\s/g,'');
  if(quote.trim().length<5||!clean(sourceText).includes(clean(quote)))return false;
  if(refs.some(page=>!sourceText.includes('[PDF第'+page+'页]')))return false;
  if(timestamps.some(time=>!sourceText.includes(time)))return false;
  if(refs.length){const start=sourceText.indexOf('[PDF第'+refs[0]+'页]');const next=sourceText.indexOf('[PDF第',start+1);const page=sourceText.slice(start,next===-1?undefined:next);return clean(page).includes(clean(quote));}
  return true;
}
