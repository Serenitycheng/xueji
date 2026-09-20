import {ensureLearning} from '../lib/learning';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,demoTasks,withDevelopmentSubject,type StudyState} from '../lib/model';
import {readStoredState,compatibleWrite} from '../lib/data-protection';
import {makePlans,makeTasks} from '../lib/ai';
import {CATALOG} from '../lib/catalog';
import {recordFeedback,rebalance} from '../lib/planning';

function legacyState():StudyState {
 const state=initialState();
 state.subjects=state.subjects.filter(s=>s.id!=='development');
 state.subjects[0].goal='已有考试目标';
 state.timetable=[{id:'class',name:'已有课程',day:1,start:'09:00',end:'10:00',weekStart:1,weekEnd:20,parity:'all'}];
 state.tasks=demoTasks('2026-09-14').filter(t=>t.subjectId==='linear').map(t=>({...t,status:'done',completedAt:'2026-09-14T10:00:00Z'}));
 return state;
}

test('legacy profiles gain development without resetting other data or mutating the input',()=>{
 const old=legacyState(),before=structuredClone(old);
 const upgraded=withDevelopmentSubject(old);
 assert.deepEqual(old,before);
 assert.equal(upgraded.subjects.length,5);
 assert.deepEqual(upgraded.subjects.slice(0,4),before.subjects);
 assert.deepEqual({...upgraded,subjects:before.subjects},before);
 assert.match(upgraded.subjects[4].goal,/打牢.*系统复习.*持续项目/);
 assert.equal(upgraded.subjects[4].selectedPlan,undefined);
 assert.equal(upgraded.subjects[4].plans[0].id,'development-foundations-ver2');
 assert.deepEqual(upgraded.subjects[4].plans[0].resources.map(r=>r.resourceId),['development-plan-ver2','python-docs','pro-git']);
 assert.match(upgraded.subjects[4].plans[0].stages[0],/Python/);
 assert.ok(upgraded.subjects[4].plans[0].resources.every(r=>CATALOG.some(c=>c.id===r.resourceId)));
});

test('normalization is idempotent and preserves a customized development plan',()=>{
 const state=initialState(),dev=state.subjects.find(s=>s.id==='development')!;
 dev.goal='我的系统学习方案';dev.paused=true;dev.selectedPlan='mine';
 dev.plans=[{id:'mine',title:'已有方案',description:'保留',resources:[],stages:['基础']}];
 assert.strictEqual(withDevelopmentSubject(state),state);
 assert.deepEqual(readStoredState(JSON.stringify(state)),ensureLearning(state));
 const a=withDevelopmentSubject(legacyState()),b=withDevelopmentSubject(legacyState());
 a.subjects[4].plans.push(...dev.plans);
 assert.equal(b.subjects[4].plans.length,1);
});

test('restoring an older state also includes development and retains unknown fields',()=>{
 const original={...legacyState(),futureExtra:{keep:true}};
 const restored=readStoredState(JSON.stringify(original));
 assert.equal(restored.subjects.filter(s=>s.id==='development').length,1);
 const {learning,...legacy}=restored;assert.deepEqual({...legacy,subjects:original.subjects},original);assert.ok(learning);
 assert.throws(()=>readStoredState(JSON.stringify({...original,version:99})),/UNSUPPORTED/);
});

test('development routes can use imported learning plans and only the correct resources',()=>{
 const state=initialState();
 state.materials=[{id:'my-plan',name:'我的系统学习方案.md',subjectId:'development',kind:'text',size:100,textLength:100,status:'ready',excerpt:'结合项目学习基础',createdAt:'2026-09-14'}];
 const result={plans:[{title:'按我的方案学习',description:'从项目需要的基础开始',resources:[{resourceId:'my-plan',role:'主线'}],stages:['先掌握当前小项目所需基础，再独立验证结果']}]};
 const plans=makePlans(result,state,'development',1);
 assert.equal(plans[0].resources[0].materialId,'my-plan');
 assert.equal(plans[0].resources[0].name,'我的系统学习方案.md');
 assert.throws(()=>makePlans({...result,plans:[{...result.plans[0],resources:[{resourceId:'mit-linear',role:'主线'}]}]},state,'development',1));
 assert.ok(CATALOG.filter(r=>r.subjectId==='development').length>=2);
});

test('development tasks support generation, feedback and review without changing other subjects',()=>{
 const state=initialState();
 const result={tasks:[{subjectId:'development',resourceId:'mdn-web',title:'理解并修改网页按钮',minutes:20,goal:'说明关键代码并验证结果',location:'资源入口',steps:['找到 HTML 基础内容','改动练习页面并验证'],quiz:[{question:'完成改动后应该做什么？',options:['运行并验证','直接跳过'],answer:0,explanation:'运行验证结果'}]}]};
 const other=demoTasks('2026-09-14')[0];state.tasks=[other];
 const [task]=makeTasks(result,state,'2026-09-14',CATALOG);
 state.tasks.push(task);const before=structuredClone(other);
 recordFeedback(state,task,{status:'done',actualMinutes:20,reason:'仍需练习',answers:[1]});
 assert.equal(task.score,0);
 assert.equal(state.tasks.filter(t=>t.reviewOf===task.id&&t.subjectId==='development').length,1);
 assert.deepEqual(state.tasks[0],before);
 assert.throws(()=>recordFeedback(state,task,{status:'done',actualMinutes:20,reason:'',answers:[1]}));
});

test('development joins the same time budget and paused-task handling',()=>{
 const state=initialState();state.tasks=demoTasks();
 assert.equal(state.tasks.length,state.subjects.length);
 state.subjects.find(s=>s.id==='development')!.paused=true;
 rebalance(state);
 assert.equal(state.tasks.find(t=>t.subjectId==='development')!.status,'deferred');
 assert.equal(compatibleWrite(3),false);
 assert.equal(compatibleWrite(4),false);assert.equal(compatibleWrite(5),true);
});
