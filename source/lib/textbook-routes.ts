import {CATALOG} from './catalog';
import type {Material,StudyState,Subject,LearningPlan} from './model';
import {alternativeSources} from './route-adjustments';
// A textbook's recorded order and page ranges are data, not model suggestions.
export function textbookStages(material:Material){
 const groups:{heading:string;topics:NonNullable<Material['analysis']>['topics']}[]=[];
 for(const topic of material.analysis?.topics??[]){
  const heading=topic.title.match(/第[\d一二三四五六七八九十]+章/)?.[0];
  if(heading||!groups.length)groups.push({heading:heading??'学习单元',topics:[]});
  groups.at(-1)!.topics.push(topic);
 }
 return groups.map(g=>g.heading+' · PDF 第'+Math.min(...g.topics.map(t=>t.fromPage))+'–'+Math.max(...g.topics.map(t=>t.toPage))+'页：'+g.topics.map(t=>t.title.replace(/^第[\d一二三四五六七八九十]+章[：:\s]*/,'').replace(/[（(].*$/,'')).join('；')+'。先理解概念，再完成与当前进度对应的基础例题。');
}
export function textbookRouteResult(state:StudyState,subject:Subject,mode:string,baseline?:LearningPlan){
 if(!['linear','stats'].includes(subject.id))return null;
 const book=state.materials.find(m=>m.subjectId===subject.id&&m.analysis&&!m.url);
 if(!book)return null;
 const helpers=CATALOG.filter(r=>r.recommended!==false&&r.subjectId===subject.id);
 const main={resourceId:book.id,role:'主教材：按下面真实目录顺序学习；例题、习题与考试范围以本课要求为准。'};
 const helper=(id:string)=>{const r=helpers.find(r=>r.id===id);return r?{resourceId:r.id,role:'辅助：仅在当前主题读不懂或需要额外练习时使用，不并行追另一套进度。'+r.description}:undefined;};
 let combinations:{resourceId:string;role:string}[][];
 if(mode==='initial'||mode==='materials')combinations=[[main],...helpers.slice(0,2).map(r=>[main,helper(r.id)!])];
 else if(mode==='resources'){
  const fresh=alternativeSources(state,subject).find(r=>helpers.some(h=>h.id===r.id));
  combinations=[[main,...(fresh?[helper(fresh.id)!]:[])]];
 }else{
  const old=(baseline?.resources??[]).map(r=>helper(r.resourceId??helpers.find(h=>h.name===r.name)?.id??'')).filter((r):r is {resourceId:string;role:string}=>!!r);
  combinations=[[main,...old.slice(0,2)]];
 }
 return {plans:combinations.map(resources=>{
  const extra=resources.slice(1).map(r=>helpers.find(h=>h.id===r.resourceId)!.name);
  return {title:extra.length?'教材主线 + '+extra.join('、')+'辅助':'只用自己的教材，从例题到独立练习',description:'按《'+book.name+'》的真实目录推进，每次只安排一个小目标。'+(extra.length?'辅助资源按卡点使用；所列中文课程只选当前主题，不另开一套学习进度。':'减少资料切换，先读一个概念，再跟做例题，最后独立验证。')+'考试范围和课堂进度由你提供，每日任务由 DeepSeek 结合反馈安排。',resources,stages:textbookStages(book)};
 })};
}
