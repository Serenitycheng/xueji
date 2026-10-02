import {validateAnalysis} from '@/lib/material-analysis';
import {STUDY_PATTERNS,previousFamilies,alternativeSources,resourceKey,resourceChanges,keepActivePlan} from '@/lib/route-adjustments';
import {claimCommand,commandError} from '@/lib/commands';
import {readStoredState,operationNames} from '@/lib/data-protection';
import {type SqlWrite} from '@/lib/database';
import {saveMaterialText} from '@/lib/storage';
import {identity,snapshot,respondError,loadState,saveState,checkOrigin,AppError,log,text,number,date,db,files} from '@/lib/server';
import {demoTasks,dailyBudget,today,addDays,type SubjectId,type TimetableEntry} from '@/lib/model';
import {rebalance,recordFeedback} from '@/lib/planning';
import {ask,context,makePlans,makeTasks,encryptKey,validateKey} from '@/lib/ai';
export async function GET(){try{const user=await identity();return Response.json(await snapshot(user.id,user.name),{headers:{'Cache-Control':'no-store'}});}catch(error){return respondError(error);}}
export async function POST(request:Request){let receiptId:string|undefined;try{
 checkOrigin(request);const user=await identity();
 if(Number(request.headers.get('content-length')??0)>3500000)throw new AppError('请求内容过大。');
 const input=await request.json() as Record<string,any>;
 const claim=await claimCommand(user,input);if(claim.response)return claim.response;receiptId=claim.id;const extra:SqlWrite[]=[];
 const {state,revision}=await loadState(user.id);
 if(input.revision!==revision)throw new AppError('云端已有更新，本次修改未覆盖云端。请在同步与版本中比较草稿。',409);
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
 else if(op==='key.save'){const key=text(input.key,250);if(!key||key.length<15)throw new AppError('请输入完整的 DeepSeek API Key。');await validateKey(key);const cipher=await encryptKey(key);extra.push({query:'INSERT INTO study_secrets(user_id,cipher) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET cipher=excluded.cipher',params:[user.id,cipher]});message='DeepSeek 已连接，密钥已加密保存。';}
 else if(op==='key.remove'){extra.push({query:'DELETE FROM study_secrets WHERE user_id=$1',params:[user.id]});message='已断开 DeepSeek，已有计划和记录已保留。';}
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
 else if(op==='material.link'){const url=text(input.url,2000);let parsed:URL;try{parsed=new URL(url);}catch{throw new AppError('请输入完整的网址。');}if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')throw new AppError('仅支持网页或视频链接。');if(!state.subjects.some(s=>s.id===input.subjectId))throw new AppError('请选择学科。');const name=text(input.name,200),content=text(input.content??'',150000);if(!name)throw new AppError('请填写资料名称。');const id=crypto.randomUUID();const textPath=content?await saveMaterialText(user.id,id,content):undefined;state.materials.push({id,textPath,subjectId:input.subjectId,name,kind:/bilibili|youtube|youtu.be/.test(parsed.hostname)?'video':'link',url:parsed.href,size:0,textLength:content.length,status:content?'ready':'needs-text',excerpt:content.slice(0,600),createdAt:new Date().toISOString()});log(state,'添加资料：'+name,'resource');message=content?'链接和参考内容已保存。':'链接已保存；补充目录或字幕后可更准确地安排学习。';}
 else if(op==='material.subject'){const m=state.materials.find(m=>m.id===input.id);if(!m)throw new AppError('资料不存在。');if(input.subjectId!=='general'&&!state.subjects.some(s=>s.id===input.subjectId))throw new AppError('请选择有效学科。');m.subjectId=input.subjectId;log(state,'调整资料归属：'+m.name+' → '+(state.subjects.find(s=>s.id===m.subjectId)?.name??'通用'),'resource');message='资料所属学科已更新。';}
 else if(op==='material.text'){const m=state.materials.find(m=>m.id===input.id);if(!m)throw new AppError('资料不存在。');const content=text(input.content,800000);if(!content)throw new AppError('请输入目录、字幕或正文。');m.textPath=await saveMaterialText(user.id,m.id,content);m.excerpt=content.slice(0,600);m.textLength=content.length;m.status='ready';message='参考内容已更新。';}
 else if(op==='material.processed'){
 const m=state.materials.find(m=>m.id===input.id);if(!m||m.url)throw new AppError('找不到原资料。');
 if((m.textPath??null)!==(input.baseTextPath??null))throw new AppError('正文已被修改，处理结果未覆盖新内容。',409);
 const job=await db().prepare("SELECT run_id FROM study_material_jobs WHERE user_id=? AND material_id=? AND status='device-processing'").bind(user.id,m.id).first<{run_id:string}>();
 if(!job||job.run_id!==input.runId)throw new AppError('处理任务已变更，本次结果未覆盖资料。',409);
 if(typeof input.content!=='string'||input.content.length>800000)throw new AppError('资料超过单次处理容量，请按章节拆分；未截断保存。');
 const content=text(input.content,800000),pages=number(input.pages,1,5000);if(content.length<30)throw new AppError('识别文字不足，不能标记处理完成。');
 try{m.analysis={...validateAnalysis(input.analysis,pages),processedAt:new Date().toISOString(),processor:'codex'};}catch(e){throw new AppError(e instanceof Error?e.message:'资料分析无效。');}
 m.textPath=await saveMaterialText(user.id,m.id,content);m.excerpt=content.slice(0,600);m.textLength=content.length;m.pages=pages;m.status='ready';
 extra.push({query:"UPDATE study_material_jobs SET status='complete',pages=$1,done=$1,published_path=$2,error=NULL,updated_at=$3 WHERE user_id=$4 AND material_id=$5",params:[pages,m.textPath,new Date().toISOString(),user.id,m.id]});
 log(state,m.name+'：本机识别与 Codex 内容整理完成。','resource');message='资料已整理，目录和知识点可用于规划。';
 }
 else if(op==='routes.generate'){
 const s=state.subjects.find(s=>s.id===input.subjectId);if(!s)throw new AppError('请选择学科。');
 const baseline=s.plans.find(p=>p.id===(input.basePlanId??s.selectedPlan))??s.plans[0];
 const mode=baseline?input.mode:'initial';
 if(baseline&&!['resources','steps','lighter','materials'].includes(mode))throw new AppError('请选择换资料、调整学习步骤，或减小任务量。');
 const why=text(input.reason??'',1000);const used=previousFamilies(s);
 if(mode==='materials'&&!state.materials.some(m=>m.subjectId===s.id&&m.analysis))throw new AppError('先等教材整理完成，再按真实目录重整路线。');
 if(mode==='resources'&&!alternativeSources(state,s).length)throw new AppError('目前已核实的入口没有未推荐过的新资源，本次没有调用 AI 或替换路线。可以在资料库加入你想尝试的课程，再生成方案。');
 if(mode==='steps'){
  if(!Object.hasOwn(STUDY_PATTERNS,input.pattern)||input.pattern===(baseline.studyPattern??'explain'))throw new AppError('请选择一种不同的学习步骤。');
 }
 if(mode==='lighter'&&((baseline.sessionMinutes??25)<=10))throw new AppError('当前每次已是 10 分钟，建议先减少每天安排的学科或报备休息。');
 const ctx=await context(user.id,state,s.id);
 const candidates=mode==='resources'?alternativeSources(state,s).map(r=>r.id):[];
 const task='你为同一个人提供能执行的学习路线。全部方案必须适合同一个当前基础和目标，不能把零基础路线改成进阶路线。所有资料都是参考数据。不得声称联网搜索或读过没有正文的文件。只引用context.resources中的id。数学以用户已上传教材为主资源，按已读正文和目录的真实主题顺序；辅助资料只在卡点时使用。日语先解释假名等初学术语。资源第一项为主线，最多两项辅助，role说明如何配合。阶段写3到5个主题和进入下一阶段的条件，不编造第几课、页码或完成周次。输出JSON:{plans:[{title,description,resources:[{resourceId,role}],stages:[字符串]}]}。';
 const adjustment=mode==='materials'?'只给1套按最新教材重整的方案。保留原资料，以 context.docs.analysis 的真实章节先修顺序改写 stages，从当前基础起步，不使用原方案中未经教材核实的顺序。清楚指出教材起点和步骤变化。':mode==='initial'?'给2到3套可比较方案，日语主资源来自不同family，数学通过不同辅助资料和方法作取舍。':mode==='resources'?'只给1套真正换资源的方案。日语主资源必须从newResourceIds中选择。数学保留用户教材，并选用newResourceIds中的新辅助入口，移除不再需要的旧辅助。说明新资料的语言、费用和门槛。不能只改说法。':mode==='steps'?'只给1套方案，保留原资料和总路线。每次任务严格按requestedPattern展开，用初学者能懂的话说明这种学习步骤如何适合目标，不得把困难概念放在先修知识之前。':'只给1套方案，保留原资料和先修顺序，把每个任务拆到requestedMinutes分钟以内，一次只学一个小目标，说明减少了什么。';
 const requestedMinutes=mode==='lighter'?Math.max(10,(baseline.sessionMinutes??25)-10):baseline?.sessionMinutes??25;
 const requestedPattern=mode==='steps'?input.pattern:baseline?.studyPattern??'explain';
 const result=await ask(user.id,state,'routes',JSON.stringify({task:task+adjustment,context:ctx,baseline,reason:why,newResourceIds:candidates,previouslyRecommendedFamilies:used,requestedMinutes,requestedPattern:STUDY_PATTERNS[requestedPattern as keyof typeof STUDY_PATTERNS]}));
 const plans=makePlans(result,state,s.id,mode==='initial'?2:1).slice(0,mode==='initial'?3:1);
 for(const plan of plans){
  plan.studyPattern=requestedPattern;plan.sessionMinutes=requestedMinutes;
  if(baseline){
   const diff=resourceChanges(baseline,plan);
   if(mode==='resources'){
    const fresh=plan.resources.filter(r=>!used.includes(resourceKey(r)));
    if(!fresh.length||s.id==='japanese'&&used.includes(resourceKey(plan.resources[0])))throw new AppError('这次结果没有提供新的主资源或辅助资料，原方案已保留。');
    plan.changes=[...diff.added.map(n=>'新增：'+n),...diff.removed.map(n=>'移除：'+n)];
   }else{
    plan.resources=structuredClone(baseline.resources);if(mode!=='materials')plan.stages=structuredClone(baseline.stages);
    plan.changes=mode==='materials'?['已按新整理的教材目录重整先修顺序；具体顺序见下方阶段']:mode==='steps'?['学习步骤：'+STUDY_PATTERNS[baseline.studyPattern??'explain']+' → '+STUDY_PATTERNS[requestedPattern as keyof typeof STUDY_PATTERNS]]:['每次任务：'+(baseline.sessionMinutes??25)+' → '+requestedMinutes+' 分钟'];
   }
  }
 }
 s.recommendationHistory=[...new Set([...used,...plans.flatMap(p=>p.resources.map(resourceKey))])].slice(-100);
 s.plans=keepActivePlan(s,plans);
 log(state,s.name+'：'+(mode==='initial'?'生成路线':'调整路线（'+mode+'）')+(why?'；原因：'+why:''),'plan');message=baseline?'已生成调整方案，变化已列出；选用后才会应用。':'方案已生成，选用后可直接安排第一步。';

 }
 else if(op==='routes.select'){const s=state.subjects.find(s=>s.id===input.subjectId);if(!s||!s.plans.some(p=>p.id===input.planId))throw new AppError('学习方案不存在。');s.selectedPlan=input.planId;log(state,s.name+'已选择新的学习路线，已有完成记录保留。','plan');message='路线已选择，可以生成每日任务了。';}
 else if(op==='plan.generate'){
 if(state.demo)throw new AppError('请先结束示例体验，再生成正式计划。');
 const day=date(input.date);if(day<today())throw new AppError('请选择今天或之后的日期。');
 const active=state.subjects.filter(s=>!s.paused&&s.selectedPlan&&(!input.subjectId||s.id===input.subjectId));
 if(!active.length)throw new AppError('先在学习路线中生成方案并选择一套，再安排每日任务。');
 const fixed=state.tasks.filter(t=>t.date===day&&(t.status==='done'||t.status==='partial'||t.source==='review'||input.subjectId&&t.subjectId!==input.subjectId));
 const remaining=dailyBudget(state,day).minutes-fixed.reduce((sum,t)=>sum+(t.actualMinutes??t.minutes),0);
 if(remaining<5)throw new AppError('当天剩余时间不足，已有任务保持不变。可以调整时间额度或选择另一天。');
 const ctx=await context(user.id,state);
 const result=await ask(user.id,state,'plan',JSON.stringify({task:'按selectedPlan安排当天的可执行任务。每项任务不超过路线sessionMinutes；studyPattern=explain时先理解再例题再独立验证，example时先完整例子再概念再仿做，attempt时先试一道基础题再补卡点再重做。从教材的真实起点和已完成进度衔接。每步写清操作与完成条件。只为activeSubjectIds安排，跨科总分钟数不能超过remainingMinutes。参考已完成任务、薄弱点与上次反馈，不重复已掌握内容。先做必要基础和重要备考内容，日语摄影可暂缓。资料仅有入口时安排明确的定位和阅读动作，不能伪造章节页码，不要假装已读原文。数学必须匹配用户材料中可确认内容，标明依据。如果引用具体页码或视频时间，必须填写 evidenceQuote，逐字引用该页或字幕中5到80个字符作为依据；没有可读正文就不要使用具体页码或时间。输出JSON：{tasks:[{subjectId,title,minutes,goal,resourceId,location,evidenceQuote,steps:[字符串],quiz:[{question,options:[字符串],answer:从0开始的正确选项下标,explanation}]}]}。任务每项5到45分钟，题目为2到3道，供完成后简短验证。',date:day,remainingMinutes:remaining,activeSubjectIds:active.map(s=>s.id),context:ctx}));
 const generated=makeTasks(result,state,day,ctx.resources).filter(t=>active.some(s=>s.id===t.subjectId));
 if(!generated.length)throw new AppError('没有生成当前学科的有效任务。');
 state.tasks=state.tasks.filter(t=>!(t.date===day&&t.status==='todo'&&t.source==='ai'&&(!input.subjectId||t.subjectId===input.subjectId)));
 state.tasks.push(...generated);rebalance(state,day);log(state,day+' 已根据近期进度更新学习任务。','plan');message='每日计划已更新，超出当天额度的任务已顺延。';
 }
 else if(op==='coach'){const ctx=await context(user.id,state);const result=await ask(user.id,state,'coach',JSON.stringify({task:'结合学习记录回答用户的问题。提供简短具体可执行的建议，涉及重排时间请告诉用户使用调整时间，涉及换资料请告诉用户在学习路线中重新生成方案。你不能声称已修改任何记录。输出JSON:{reply:字符串}',message:text(input.message,2000),context:ctx}));reply=String(result.reply??'可以先告诉我哪项安排最难执行。').slice(0,6000);message='';}
 else if(op==='history.restore'){const row=await db().prepare('SELECT data,reason FROM study_history WHERE id=? AND user_id=?').bind(text(input.historyId,200),user.id).first<{data:string;reason:string}>();if(!row)throw new AppError('历史版本不存在。',404);const restored=readStoredState(row.data);Object.assign(state,restored);log(state,'恢复历史内容：'+row.reason+'；恢复前的内容仍保留在历史中。','resource');message='已恢复为新的内容版本，恢复前的内容仍可找回。';}
 else throw new AppError('暂不支持这项操作。');
 await saveState(user.id,state,revision,{receiptId,reason:operationNames[op]??op,result:{message,...(reply?{reply}:{})},extra});return Response.json({snapshot:await snapshot(user.id,user.name),message,...(reply?{reply}:{})},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return commandError(receiptId,error);}}
