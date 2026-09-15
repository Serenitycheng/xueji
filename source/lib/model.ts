import {emptyLearning,type LearningWorkspace} from './learning';
import {classesOnDate} from './timetable';
import {developmentLearningPlan} from './development-curriculum';
export type SubjectId = 'linear' | 'stats' | 'japanese' | 'photo' | 'development';
export type View = 'legacy' | 'learn' | 'today' | 'routes' | 'materials' | 'progress' | 'schedule' | 'settings' | 'cloud';
export type Subject = {id: SubjectId; name: string; short: string; color: string; goal: string; level: string; deadline: string; paused: boolean; selectedPlan?: string; recommendationHistory?: string[]; plans: LearningPlan[]};
export type LearningPlan = {changes?: string[]; studyPattern?: 'explain'|'example'|'attempt'; sessionMinutes?: number; id: string; title: string; description: string; resources: {resourceId?: string; name: string; role: string; url: string; verified: boolean; materialId?: string}[]; stages: string[]};
export type Quiz = {question: string; options: string[]; answer: number; explanation: string};
export type Task = {id: string; subjectId: SubjectId; title: string; date: string; minutes: number; actualMinutes?: number; goal: string; steps: string[]; resource: string; materialId?: string; location: string; status: 'todo' | 'done' | 'partial' | 'deferred'; reason?: string; quiz: Quiz[]; answers?: number[]; score?: number; completedAt?: string; source: 'demo' | 'ai' | 'manual' | 'review'; reviewOf?: string};
export type MaterialAnalysis={overview:string;topics:{title:string;fromPage:number;toPage:number;prerequisites:string[]}[];firstStep:string;warnings:string[];processedAt:string;processor:'codex'};
export type Material = {analysis?:MaterialAnalysis; id: string; subjectId: SubjectId | 'general'; name: string; kind: 'pdf' | 'slides' | 'text' | 'video' | 'link'; url?: string; size: number; pages?: number; textLength: number; textPath?: string; status: 'ready' | 'needs-text'; excerpt: string; createdAt: string};
export type TimetableEntry = {id: string; name: string; day: number; start: string; end: string; weekStart: number; weekEnd: number; parity: 'all' | 'odd' | 'even'};
export type DayOverride = {date: string; minutes: number; reason: string};
export type Settings = {model: string; budget: number; ratio: number; awakeStart: string; awakeEnd: string; protectedMinutes: number; bufferMinutes: number; maxMinutes: number; semesterStart: string; restDays: number[]};
export type LogEntry = {id: string; date: string; message: string; type: 'plan' | 'feedback' | 'schedule' | 'resource'};
export type StudyState = {learning?:LearningWorkspace;version: 1; subjects: Subject[]; tasks: Task[]; materials: Material[]; timetable: TimetableEntry[]; overrides: DayOverride[]; settings: Settings; logs: LogEntry[]; demo: boolean};
export type Snapshot = {state: StudyState; revision: number; hasKey: boolean; usage: {cost: number; calls: number; month: string}; userName: string; updatedAt?: string; appVersion?: string; protocol?: number; schemaVersion?: number};
export const DEVELOPMENT_SUBJECT: Subject = {
 id:'development',name:'开发',short:'开发',color:'#347ea4',
 goal:'打牢开发基础，现阶段侧重 AI 辅助开发（vibe coding），边做项目边系统学习',
 level:'按《开发学习方案 ver2》从 Python 编程基础与基础工具同步起步；具体掌握情况通过练习评估。网页技术随项目按需补充，AI 拓展分概念与实践推进。',
 deadline:'',paused:false,plans:[developmentLearningPlan()]
};
export const SUBJECTS: Subject[] = [
{id:'linear',name:'线性代数',short:'线代',color:'#5865db',goal:'本学期期末争取高分',level:'待结合教材和课堂进度评估',deadline:'',paused:false,plans:[]},
{id:'stats',name:'概率论与数理统计',short:'概率统计',color:'#238774',goal:'本学期期末争取高分',level:'待结合教材和课堂进度评估',deadline:'',paused:false,plans:[]},
{id:'japanese',name:'日语',short:'日语',color:'#cd8550',goal:'学会五十音，理解日常表达，逐步听懂动画和日语歌',level:'零基础',deadline:'',paused:false,plans:[]},
{id:'photo',name:'摄影',short:'摄影',color:'#9870b6',goal:'结合已有拍摄经验，系统补齐基础理论',level:'有大量实践经历，未系统学过理论',deadline:'',paused:false,plans:[]},
DEVELOPMENT_SUBJECT
];
export function withDevelopmentSubject(state:StudyState):StudyState {
 if(state.subjects.some(subject=>subject.id==='development'))return state;
 return {...state,subjects:[...state.subjects,structuredClone(DEVELOPMENT_SUBJECT)]};
}
export function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function addDays(date: string,n:number) {const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function initialState(): StudyState {
 return {version:1,subjects:structuredClone(SUBJECTS),tasks:[],materials:[],timetable:[],overrides:[],logs:[],demo:false,settings:{model:'deepseek-v4-flash',budget:100,ratio:50,awakeStart:'08:00',awakeEnd:'23:00',protectedMinutes:300,bufferMinutes:60,maxMinutes:180,semesterStart:today(),restDays:[]}};
}
export function freshState():StudyState {return {...initialState(),subjects:[],learning:emptyLearning()};}
export function demoTasks(date=today()): Task[] {
const rows: [SubjectId,string,number,string,string[],Quiz][]=[
['linear','从向量开始，理解线性组合',35,'能用自己的话解释向量的线性组合',['把向量理解为一组有顺序的数，例如 (1, 2)。','用纸笔计算 2 × (1, 2) + (3, 1)，注意逐个位置运算。','完成简短验证，记录不确定的地方。'],{question:'2 × (1, 2) + (3, 1) 等于？',options:['(5, 5)','(5, 3)','(4, 4)'],answer:0,explanation:'对应位置相加：(2+3, 4+1) = (5, 5)。'}],
['stats','用掷骰子认识随机事件',30,'区分试验、结果与事件',['想象掷一次均匀六面骰子，列出全部可能结果。','写出“出现偶数”这一事件包含的结果。','用满足条件的结果数除以全部结果数，计算概率。'],{question:'掷一次均匀六面骰子，出现偶数的概率是？',options:['1/6','1/2','2/3'],answer:1,explanation:'偶数结果是2、4、6，共3种，因此是3/6。'}],
['japanese','认识日语的三种文字',20,'能够区分平假名、片假名与汉字',['阅读这三个例子：あ（平假名）、ア（片假名）、日（汉字）。','观察平假名和片假名的字形区别，不要求今天记住整张五十音表。','做一道识别题，体验之后的学习验证。'],{question:'下面哪一个是平假名？',options:['ア','日','あ'],answer:2,explanation:'あ是平假名；ア是片假名；日是汉字。'}],
['photo','从已有照片理解光圈与景深',25,'能描述景深，并知道影响它的不止光圈',['找两张自己拍的照片，一张背景清晰，一张背景模糊。','景深指画面中看起来清晰的距离范围。观察两张照片清晰范围的差异。','若保留了拍摄信息，比较光圈、焦距和拍摄距离。'],{question:'其他条件相同时，使用更大的光圈通常会怎样？',options:['景深变浅','景深变深','一定提高画面锐度'],answer:0,explanation:'其他条件相同时，大光圈通常使景深变浅；焦距和距离也会影响景深。'}],
['development','用一个小改动练习理解与验证',20,'能说清目标、关键改动和验证结果',['选一个练习页面，写下一个可以观察到结果的小目标，例如修改按钮文字。','请 AI 说明需要改动的位置，读懂这一处代码后亲手修改。','运行页面并点击检查；记录预期结果、实际结果，以及仍不理解的一点。'],{question:'AI 给出改动后，哪一步最能确认任务完成？',options:['实际运行，并检查结果是否符合目标','只看 AI 说已完成','直接继续添加更多功能'],answer:0,explanation:'运行并核对可观察的结果，才能发现改动是否生效；再说明关键代码，帮助补齐基础。'}]
];
return rows.map(([subjectId,title,minutes,goal,steps,q],i)=>({id:'demo-'+date+'-'+i,subjectId,title,date,minutes,goal,steps,resource:'内置体验练习',location:'下方任务步骤',status:'todo',quiz:[q],source:'demo'}));
}
export function timeMinutes(time: string) {const [h,m]=time.split(':').map(Number);return h*60+m;}
export function dailyBudget(state: StudyState,date: string): {minutes:number; classes:number; free:number; overridden:boolean} {
 const override=state.overrides.find(x=>x.date===date);
 const day=new Date(date+'T12:00:00Z').getUTCDay();
 const intervals=classesOnDate(state,date).map(x=>[Math.max(timeMinutes(x.start),timeMinutes(state.settings.awakeStart)),Math.min(timeMinutes(x.end),timeMinutes(state.settings.awakeEnd))]).filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]);
 let classes=0,lastEnd=-1; for(const [start,end] of intervals){classes+=Math.max(0,end-Math.max(start,lastEnd));lastEnd=Math.max(lastEnd,end);}
 const free=Math.max(0,timeMinutes(state.settings.awakeEnd)-timeMinutes(state.settings.awakeStart)-classes-state.settings.protectedMinutes-state.settings.bufferMinutes);
 const minutes=override?override.minutes:state.settings.restDays.includes(day)?0:Math.min(state.settings.maxMinutes,Math.floor(free*state.settings.ratio/100/5)*5);
 return {minutes,classes,free,overridden:!!override};
}
export function allocateTasks(tasks:Task[],state:StudyState,date:string):Task[]{
 const budget=dailyBudget(state,date).minutes;
 const fixed=tasks.filter(t=>t.date===date&&(t.status==='done'||t.status==='partial'));
 let remaining=Math.max(0,budget-fixed.reduce((s,t)=>s+(t.actualMinutes??t.minutes),0));
 const pending=tasks.filter(t=>t.date===date&&t.status==='todo');
 const ordered=pending.map((t,i)=>({t,i,priority:(t.source==='review'?500:0)+(state.subjects.find(s=>s.id===t.subjectId)?.deadline?Math.max(0,200-Math.max(0,(new Date(state.subjects.find(s=>s.id===t.subjectId)!.deadline).getTime()-new Date(date).getTime())/86400000)):0)})).sort((a,b)=>b.priority-a.priority||a.i-b.i);
 const deferred=new Set<string>();for(const {t} of ordered){if(t.minutes<=remaining){remaining-=t.minutes;}else deferred.add(t.id);}
 return tasks.map(t=>deferred.has(t.id)?{...t,date:addDays(date,1),reason:'根据当天可用时间顺延'}:t);
}
