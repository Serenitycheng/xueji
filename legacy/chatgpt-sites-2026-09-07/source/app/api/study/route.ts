import {identity,snapshot,respondError,loadState,saveState,checkOrigin,AppError,log,text,number,date,db,files} from '@/lib/server';
import {demoTasks,dailyBudget,today,addDays,type SubjectId,type TimetableEntry} from '@/lib/model';
import {rebalance,recordFeedback} from '@/lib/planning';
import {ask,context,makePlans,makeTasks,encryptKey,validateKey} from '@/lib/ai';
export async function GET(){try{const user=await identity();return Response.json(await snapshot(user.id,user.name),{headers:{'Cache-Control':'no-store'}});}catch(error){return respondError(error);}}
export async function POST(request:Request){try{
 checkOrigin(request);const user=await identity();
 if(Number(request.headers.get('content-length')??0)>1000000)throw new AppError('请求内容过大。');
 const input=await request.json() as Record<string,any>;
 const {state,revision}=await loadState(user.id);
 if(input.revision!==revision)throw new AppError('另一台设备更新了记录，已刷新，请重试。',409);
 const op=text(input.op,50);let message='已保存',reply:string|undefined;
 if(op==='demo.load'){if(state.tasks.some(t=>t.source!=='demo'))throw new AppError('已有正式任务，请直接查看今日学习。');state.tasks=demoTasks();state.demo=true;rebalance(state);message='已载入体验练习，结束体验可清除示例记录。';}
 else if(op==='demo.clear'){state.tasks=state.tasks.filter(t=>t.source!=='demo');state.demo=false;message='示例记录已清除，可以开始自己的学习。';}
 else if(op==='settings.save'){
 const s=input.settings;if(!s||typeof s!=='object')throw new AppError('设置内容不完整。');
 if(!['deepseek-v4-flash','deepseek-v4-pro'].includes(s.model))throw new AppError('请选择可用模型。');
 function time(v:unknown){const t=text(v,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))throw new AppError('请填写有效时间。');return t;}
 const start=time(s.awakeStart),end=time(s.awakeEnd);if(end<=start)throw new AppError('活动结束时间应晚于开始时间。');
 state.settings={model:s.model,budget:number(s.budget,1,100),ratio:number(s.ratio,0,100),awakeStart:start,awakeEnd:end,protectedMinutes:number(s.protectedMinutes,0,1200),bufferMinutes:number(s.bufferMinutes,0,720),maxMinutes:number(s.maxMinutes,0,720),semesterStart:date(s.semesterStart),restDays:Array.isArray(s.restDays)?[...new Set<number>(s.restDays.map((x:unknown)=>number(x,0,6)))]:[]};
 rebalance(state);log(state,'更新了作息与学习偏好，已重新分配待学任务。','schedule');
 }
 else if(op==='key.save'){const key=text(input.key,250);if(!key||key.length<15)throw new AppError('请输入完整的 DeepSeek API Key。');await validateKey(key);const cipher=await encryptKey(key);await db().prepare('INSERT INTO study_secrets(user_id,cipher) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET cipher=excluded.cipher').bind(user.id,cipher).run();message='DeepSeek 已连接，密钥已加密保存。';}
 else if(op==='key.remove'){await db().prepare('DELETE FROM study_secrets WHERE user_id=?').bind(user.id).run();message='已断开 DeepSeek，已有计划和记录已保留。';}
 else if(op==='subject.save'){
 const s=state.subjects.find(s=>s.id===input.id);if(!s)throw new AppError('找不到这门学科。');
 s.goal=text(input.goal,1000);s.level=text(input.level,1000);s.deadline=input.deadline?date(input.deadline):'';s.paused=!!input.paused;
 if(!s.goal)throw new AppError('请填写学习目标。');
 if(!s.paused)for(const t of state.tasks)if(t.subjectId===s.id&&t.status==='deferred'&&t.reason==='学科暂停，等待恢复'){t.status='todo';t.date=today();}
 rebalance(state);log(state,'更新了'+s.name+'的目标与安排。','plan');
 }
 else if(op==='day.override'){const d=date(input.date),minutes=number(input.minutes,0,720),reason=text(input.reason,1000);if(!reason)throw new AppError('请说明调整原因。');
 state.overrides=state.overrides.filter(x=>x.date!==d);state.overrides.push({date:d,minutes,reason});const moved=rebalance(state,d);log(state,d+' 调整为 '+minutes+' 分钟：'+reason+'。'+moved+' 项任务已重新安排。','schedule');message='当天额度已更新，'+moved+' 项任务已重新安排。';}
 else if(op==='schedule.import'){
 if(!Array.isArray(input.entries)||input.entries.length>1000||!input.entries.length)throw new AppError('课表为空或超过1000条。');
 state.timetable=input.entries.map((r:any)=>{const start=text(r.start,5),end=text(r.end,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start)throw new AppError('课表中存在无效的起止时间。');const ws=number(r.weekStart,1,60),we=number(r.weekEnd,ws,60);return {id:crypto.randomUUID(),name:text(r.name,100),day:number(r.day,0,6),start,end,weekStart:ws,weekEnd:we,parity:['all','odd','even'].includes(r.parity)?r.parity:'all'} as TimetableEntry;});
 state.settings.semesterStart=date(input.semesterStart);rebalance(state);log(state,'导入课表，共 '+state.timetable.length+' 条课程安排。','schedule');message='课表已导入，并重新计算每天的学习额度。';
 }
 else if(op==='task.feedback'){
 const task=state.tasks.find(t=>t.id===input.id);if(!task)throw new AppError('任务不存在。');
 if(!['done','partial'].includes(input.status))throw new AppError('完成状态无效。');
 const answers=Array.isArray(input.answers)?input.answers:[];
 if(answers.length&&answers.length!==task.quiz.length)throw new AppError('请完成全部验证题。');
 answers.forEach((a:unknown,i:number)=>{number(a,0,task.quiz[i].options.length-1);if(!Number.isInteger(a))throw new AppError('答案无效。');});
 if(input.status==='done'&&task.quiz.length&&answers.length!==task.quiz.length)throw new AppError('完成任务前请做一次简短验证。');
 if(task.status==='done'||task.status==='partial')throw new AppError('这项任务已经记录过。');
 recordFeedback(state,task,{status:input.status,actualMinutes:number(input.actualMinutes,0,720),reason:text(input.reason??'',1000),answers});
 log(state,task.title+'：'+(input.status==='partial'?'完成了一部分':task.score!==undefined?'验证 '+task.score+'%':'已完成')+'。','feedback');message=task.score!==undefined&&task.score<80?'学习已记录，薄弱内容已加入后续复习。':'学习记录已保存。';
 }
 else if(op==='task.defer'){const task=state.tasks.find(t=>t.id===input.id);if(!task||task.status==='done'||task.status==='partial')throw new AppError('这项任务无法延期。');const why=text(input.reason,1000);if(!why)throw new AppError('请先说明未完成原因。');const target=date(input.date);if(target<today())throw new AppError('请选择今天或之后的日期。');task.date=target;task.reason=why;task.status='todo';rebalance(state,target);log(state,task.title+' 已重排：'+why,'schedule');message='已记录原因并重新安排。';}
 else if(op==='material.link'){const url=text(input.url,2000);let parsed:URL;try{parsed=new URL(url);}catch{throw new AppError('请输入完整的网址。');}if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')throw new AppError('仅支持网页或视频链接。');if(!state.subjects.some(s=>s.id===input.subjectId))throw new AppError('请选择学科。');const name=text(input.name,200),content=text(input.content??'',150000);if(!name)throw new AppError('请填写资料名称。');const id=crypto.randomUUID();if(content)await files().put(user.id+'/'+id+'/text',content);state.materials.push({id,subjectId:input.subjectId,name,kind:/bilibili|youtube|youtu.be/.test(parsed.hostname)?'video':'link',url:parsed.href,size:0,textLength:content.length,status:content?'ready':'needs-text',excerpt:content.slice(0,600),createdAt:new Date().toISOString()});log(state,'添加资料：'+name,'resource');message=content?'链接和参考内容已保存。':'链接已保存；补充目录或字幕后可更准确地安排学习。';}
 else if(op==='material.text'){const m=state.materials.find(m=>m.id===input.id);if(!m)throw new AppError('资料不存在。');const content=text(input.content,800000);if(!content)throw new AppError('请输入目录、字幕或正文。');await files().put(user.id+'/'+m.id+'/text',content);m.excerpt=content.slice(0,600);m.textLength=content.length;m.status='ready';message='参考内容已更新。';}
 else if(op==='routes.generate'){
 const s=state.subjects.find(s=>s.id===input.subjectId);if(!s)throw new AppError('请选择学科。');
 const ctx=await context(user.id,state,s.id);
 const result=await ask(user.id,state,'routes',JSON.stringify({task:'根据用户目标、基础及材料，提供2到3套有区别的学习方案。保留数学指定教材为主线，比较跟课复习和自主补基础的适用情境，不虚构考试日期。优先免费、对当前用户易上手。方案说明如何组合主辅资源。只可引用resources中的resourceId。提供阶段路线；现有材料不足时明确说明。输出JSON格式：{plans:[{title,description,resources:[{resourceId,role}],stages:[字符串]}]}',context:ctx}));
 s.plans=makePlans(result,state,s.id);s.selectedPlan=undefined;log(state,'为'+s.name+'生成了 '+s.plans.length+' 套路线方案。','plan');message='方案已生成，请比较后选择适合你的路线。';
 }
 else if(op==='routes.select'){const s=state.subjects.find(s=>s.id===input.subjectId);if(!s||!s.plans.some(p=>p.id===input.planId))throw new AppError('学习方案不存在。');s.selectedPlan=input.planId;log(state,s.name+'已选择新的学习路线，已有完成记录保留。','plan');message='路线已选择，可以生成每日任务了。';}
 else if(op==='plan.generate'){
 if(state.demo)throw new AppError('请先结束示例体验，再生成正式计划。');
 const day=date(input.date);if(day<today())throw new AppError('请选择今天或之后的日期。');
 const active=state.subjects.filter(s=>!s.paused&&s.selectedPlan);
 if(!active.length)throw new AppError('先在学习路线中生成方案并选择一套，再安排每日任务。');
 const fixed=state.tasks.filter(t=>t.date===day&&(t.status==='done'||t.status==='partial'||t.source==='review'));
 const remaining=dailyBudget(state,day).minutes-fixed.reduce((sum,t)=>sum+(t.actualMinutes??t.minutes),0);
 if(remaining<5)throw new AppError('当天剩余时间不足，已有任务保持不变。可以调整时间额度或选择另一天。');
 const ctx=await context(user.id,state);
 const result=await ask(user.id,state,'plan',JSON.stringify({task:'按selectedPlan安排当天的可执行任务。只为activeSubjectIds安排，跨科总分钟数不能超过remainingMinutes。参考已完成任务、薄弱点与上次反馈，不重复已掌握内容。先做必要基础和重要备考内容，日语摄影可暂缓。资料仅有入口时安排明确的定位和阅读动作，不能伪造章节页码，不要假装已读原文。数学必须匹配用户材料中可确认内容，标明依据。如果引用具体页码或视频时间，必须填写 evidenceQuote，逐字引用该页或字幕中5到80个字符作为依据；没有可读正文就不要使用具体页码或时间。输出JSON：{tasks:[{subjectId,title,minutes,goal,resourceId,location,evidenceQuote,steps:[字符串],quiz:[{question,options:[字符串],answer:从0开始的正确选项下标,explanation}]}]}。任务每项5到45分钟，题目为2到3道，供完成后简短验证。',date:day,remainingMinutes:remaining,activeSubjectIds:active.map(s=>s.id),context:ctx}));
 const generated=makeTasks(result,state,day,ctx.resources).filter(t=>active.some(s=>s.id===t.subjectId));
 if(!generated.length)throw new AppError('没有生成当前学科的有效任务。');
 state.tasks=state.tasks.filter(t=>!(t.date===day&&t.status==='todo'&&t.source==='ai'));
 state.tasks.push(...generated);rebalance(state,day);log(state,day+' 已根据近期进度更新学习任务。','plan');message='每日计划已更新，超出当天额度的任务已顺延。';
 }
 else if(op==='coach'){const ctx=await context(user.id,state);const result=await ask(user.id,state,'coach',JSON.stringify({task:'结合学习记录回答用户的问题。提供简短具体可执行的建议，涉及重排时间请告诉用户使用调整时间，涉及换资料请告诉用户在学习路线中重新生成方案。你不能声称已修改任何记录。输出JSON:{reply:字符串}',message:text(input.message,2000),context:ctx}));reply=String(result.reply??'可以先告诉我哪项安排最难执行。').slice(0,6000);message='';}
 else throw new AppError('暂不支持这项操作。');
 await saveState(user.id,state,revision);return Response.json({snapshot:await snapshot(user.id,user.name),message,...(reply?{reply}:{})},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return respondError(error);}}
