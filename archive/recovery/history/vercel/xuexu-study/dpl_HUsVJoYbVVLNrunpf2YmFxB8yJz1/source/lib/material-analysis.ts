import type {MaterialAnalysis} from './model';
export function validateAnalysis(value:unknown,pages:number):Omit<MaterialAnalysis,'processedAt'|'processor'>{
 if(!Number.isInteger(pages)||pages<1||pages>5000)throw new Error('资料页数无效。');
 if(!value||typeof value!=='object')throw new Error('资料分析尚未完成。');
 const a=value as Record<string,unknown>;
 const str=(v:unknown,max:number)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('资料分析包含缺失或过长的文字。');return v.trim();};
 if(!Array.isArray(a.topics)||!a.topics.length||a.topics.length>80||!Array.isArray(a.warnings)||a.warnings.length>12)throw new Error('资料目录或识别说明不完整。');
 return {overview:str(a.overview,3000),firstStep:str(a.firstStep,1500),warnings:a.warnings.map(v=>str(v,500)),topics:a.topics.map(t=>{
  if(!t||!Number.isInteger(t.fromPage)||!Number.isInteger(t.toPage)||t.fromPage<1||t.toPage<t.fromPage||t.toPage>pages||!Array.isArray(t.prerequisites)||t.prerequisites.length>10)throw new Error('目录中的页码或先修要求无效。');
  return {title:str(t.title,200),fromPage:t.fromPage,toPage:t.toPage,prerequisites:t.prerequisites.map((v:unknown)=>str(v,100))};
 })};
}
