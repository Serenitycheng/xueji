type Source={id:string;subjectId:string;family?:string;use?:'main'|'supplement'};
// Compare course families, so a textbook and its companion website count as one route.
export function routeResourceProblem(plans:any[],sources:Source[],subjectId:string):string|undefined{
 const mainFamilies:string[]=[];
 for(const plan of plans){
  if(!Array.isArray(plan.resources)||!plan.resources.length||plan.resources.length>3)return '每套方案需要一份主资源，最多两份辅助资源。';
  const ids=plan.resources.map((r:any)=>r.resourceId);
  if(new Set(ids).size!==ids.length)return '方案重复引用了同一份资源，请重新生成。';
  const main=sources.find(s=>s.id===ids[0]&&(s.subjectId===subjectId||s.subjectId==='general'));
  if(!main)return '方案引用了未确认的主资源，请重新生成。';
  if(main.use==='supplement')return '方案把辅助练习当成了主课程，请重新生成。';
  mainFamilies.push(main.family??main.id);
 }
 if(subjectId==='japanese'&&new Set(mainFamilies).size!==mainFamilies.length)return '这次生成的方案主资源重复，没有替换原方案。请重新推荐，比较不同的资源组合。';
}
