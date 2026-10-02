import {addDays,dailyBudget,type StudyState,type Task,today} from './model';
export function rebalance(state:StudyState,from=today()){
 const usage=new Map<string,number>();
 for(const t of state.tasks)if(t.status==='done'||t.status==='partial')usage.set(t.date,(usage.get(t.date)??0)+(t.actualMinutes??t.minutes));
 const pending=state.tasks.filter(t=>t.status==='todo'&&t.date>=from).sort((a,b)=>{
 const sa=state.subjects.find(s=>s.id===a.subjectId)!,sb=state.subjects.find(s=>s.id===b.subjectId)!;
 const pa=(a.source==='review'?100:0)+(sa.deadline?Math.max(0,90-(Date.parse(sa.deadline)-Date.parse(from))/86400000):0);
 const pb=(b.source==='review'?100:0)+(sb.deadline?Math.max(0,90-(Date.parse(sb.deadline)-Date.parse(from))/86400000):0);
 return a.date.localeCompare(b.date)||pb-pa;
 });
 let moved=0;
 for(const task of pending){
 const subject=state.subjects.find(s=>s.id===task.subjectId)!;
 if(subject.paused){task.status='deferred';task.reason='学科暂停，等待恢复';moved++;continue;}
 let placed=false;
 for(let i=0;i<30;i++){const day=addDays(from,i);if(day<task.date)continue;
 const available=Math.max(0,dailyBudget(state,day).minutes-(usage.get(day)??0));
 if(task.minutes<=available){if(task.date!==day){task.reason='按可用时间与科目优先级顺延';moved++;}task.date=day;usage.set(day,(usage.get(day)??0)+task.minutes);placed=true;break;}}
 if(!placed){task.status='deferred';task.reason='未来30天时间不足，请调整时间额度后重新安排';moved++;}
 }
 return moved;
}
export function recordFeedback(state:StudyState,task:Task,input:{status:string;actualMinutes:number;reason:string;answers:number[]}){
 if(task.status==='done'||task.status==='partial')throw new Error('这项任务已经记录过，请查看学习进度。');
 task.status=input.status==='partial'?'partial':'done';task.actualMinutes=input.actualMinutes;task.reason=input.reason;
 task.completedAt=new Date().toISOString();
 if(input.answers.length===task.quiz.length&&task.quiz.length){task.answers=input.answers;task.score=Math.round(task.quiz.filter((q,i)=>q.answer===input.answers[i]).length/task.quiz.length*100);}
 const weak=task.score!==undefined&&task.score<80;
 if((weak||task.status==='partial')&&!state.tasks.some(t=>t.reviewOf===task.id)){
 state.tasks.push({...structuredClone(task),id:crypto.randomUUID(),reviewOf:task.id,source:task.source==='demo'?'demo':'review',title:'巩固 · '+task.title,date:addDays(task.date,1),minutes:Math.max(10,Math.ceil(task.minutes/2/5)*5),status:'todo',completedAt:undefined,actualMinutes:undefined,answers:undefined,score:undefined,reason:weak?'简短验证发现薄弱点':'上次仅完成部分内容',steps:['回到上次的学习资料，先复盘不确定的部分。',...task.steps.slice(0,3),'重新完成简短验证，检查是否已经理解。']});
 }
 rebalance(state,today());
}
