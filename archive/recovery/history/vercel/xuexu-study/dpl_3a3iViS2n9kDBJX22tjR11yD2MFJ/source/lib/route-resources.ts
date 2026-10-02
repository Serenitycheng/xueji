type Source={id:string;subjectId:string;family?:string;use?:'main'|'supplement';analysis?:{topics:{title:string;fromPage:number;toPage:number}[]}};
function numeral(s:string){if(/^\d+$/.test(s))return Number(s);const digits='零一二三四五六七八九';if(s.includes('十')){const [a,b]=s.split('十');return (a?digits.indexOf(a):1)*10+(b?digits.indexOf(b):0);}return digits.indexOf(s);}
// Compare course families, so a textbook and its companion website count as one route.
export function routeResourceProblem(plans:any[],sources:Source[],subjectId:string):string|undefined{
 const mainFamilies:string[]=[];
 for(const plan of plans){
  const overview=[plan.description,...(Array.isArray(plan.stages)?plan.stages:[]),...(Array.isArray(plan.resources)?plan.resources.map((r:any)=>r.role):[])].join(' ');
  if(!Array.isArray(plan.resources)||!plan.resources.length||plan.resources.length>3)return '每套方案需要一份主资源，最多两份辅助资源。';
  const ids=plan.resources.map((r:any)=>r.resourceId);
  if(new Set(ids).size!==ids.length)return '方案重复引用了同一份资源，请重新生成。';
  const main=sources.find(s=>s.id===ids[0]&&(s.subjectId===subjectId||s.subjectId==='general'));
  if(!main)return '方案引用了未确认的主资源，请重新生成。';
  const topics=main.analysis?.topics??[],chapters=new Set(topics.flatMap(t=>[...t.title.matchAll(/第\s*([\d一二三四五六七八九十]+)\s*章/g)].map(m=>numeral(m[1]))));
  for(const ref of overview.matchAll(/第\s*([\d一二三四五六七八九十]+)(?:\s*[-–—~至到]\s*([\d一二三四五六七八九十]+))?\s*(课|单元|集|章|页|周)/g)){
   const start=numeral(ref[1]),end=ref[2]?numeral(ref[2]):start;
   const verified=topics.length&&start>0&&end>=start&&(ref[3]==='章'?chapters.has(start)&&chapters.has(end):ref[3]==='页'?topics.some(t=>start>=t.fromPage&&start<=t.toPage)&&topics.some(t=>end>=t.fromPage&&end<=t.toPage):false);
   if(!verified)return '方案中的“'+ref[0]+'”缺少已整理教材的依据，未替换原方案。请使用可核对的主题与进入下一阶段的条件。';
  }
  if(main.use==='supplement')return '方案把辅助练习当成了主课程，请重新生成。';
  mainFamilies.push(main.family??main.id);
 }
 if(subjectId==='japanese'&&new Set(mainFamilies).size!==mainFamilies.length)return '这次生成的方案主资源重复，没有替换原方案。请重新推荐，比较不同的资源组合。';
}
