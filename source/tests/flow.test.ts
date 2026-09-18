import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,type LearningPlan} from '../lib/model';
import {classesOnDate,weekDates,weekForDate,schoolWeekLabel} from '../lib/timetable';
import {resourceChanges,previousFamilies,keepActivePlan,alternativeSources} from '../lib/route-adjustments';
import {canPublishText} from '../lib/material-upload';
import {validateAnalysis} from '../lib/material-analysis';
import {routeResourceProblem} from '../lib/route-resources';
import {textbookStages,textbookRouteResult} from '../lib/textbook-routes';
test('textbook routes use recorded order and compare genuinely different resource sets',()=>{
 const state=initialState();const book={id:'book',name:'教材.pdf',subjectId:'linear',kind:'pdf',status:'ready',size:100,textLength:100,excerpt:'',createdAt:'',analysis:{overview:'',firstStep:'',warnings:[],processor:'codex',processedAt:'',topics:[{title:'第一章：线性方程组',fromPage:9,toPage:46,prerequisites:[]},{title:'第二章：矩阵',fromPage:47,toPage:88,prerequisites:[]},{title:'第三章：向量空间',fromPage:89,toPage:148,prerequisites:[]}]}} as const;
 state.materials=[structuredClone(book) as any];const stages=textbookStages(state.materials[0]);assert.match(stages[0],/线性方程组/);assert.match(stages[1],/47–88/);
 const result=textbookRouteResult(state,state.subjects[0],'initial')!;assert.equal(result.plans.length,2);assert.deepEqual(result.plans.map(p=>p.resources.map(r=>r.resourceId)),[['book'],['book','bit-linear']]);assert.ok(result.plans.every(p=>p.resources[0].resourceId==='book'));assert.deepEqual(result.plans[0].stages,stages);
});
test('route chapter references are allowed only when the primary textbook supports them',()=>{
 const source={id:'book',subjectId:'linear',analysis:{topics:[{title:'第一章 线性方程组',fromPage:9,toPage:46},{title:'第二章 矩阵',fromPage:47,toPage:88}]}};
 const plan={resources:[{resourceId:'book'}],stages:['第1章，第9–46页，再到第2章']};
 assert.equal(routeResourceProblem([plan],[source],'linear'),undefined);
 assert.ok(routeResourceProblem([plan],[{id:'book',subjectId:'linear'}],'linear'));
 for(const stage of ['第9章','第900页','第1周完成','第1课'])assert.ok(routeResourceProblem([{...plan,stages:[stage]}],[source],'linear'));
});
test('processor rejects fabricated page ranges and missing analysis before publishing',()=>{
 const a={overview:'教材概览',firstStep:'阅读第一页的定义',warnings:['公式需核对原页'],topics:[{title:'基础',fromPage:1,toPage:2,prerequisites:[]}]};
 assert.equal(validateAnalysis(a,3).topics[0].fromPage,1);
 for(const topic of [{...a.topics[0],fromPage:0},{...a.topics[0],toPage:4},{...a.topics[0],fromPage:2.5},{...a.topics[0],fromPage:3,toPage:2}])assert.throws(()=>validateAnalysis({...a,topics:[topic]},3));
 assert.throws(()=>validateAnalysis({...a,topics:[]},3));assert.throws(()=>validateAnalysis({...a,firstStep:''},3));
});
test('BIT weeks keep the three short-term weeks and date-specific holidays',()=>{
 const s=JSON.parse(fs.readFileSync('tests/fixtures/bit-weeks.json','utf8'));
 assert.equal(s.settings.semesterStart,'2026-08-31');
 const counts=(week:number)=>weekDates(s.settings.semesterStart,week).reduce((n,d)=>n+classesOnDate(s,d).length,0);
 assert.equal(counts(1),0);assert.equal(counts(2),5);assert.equal(counts(3),3);
 assert.equal(weekForDate(s.settings.semesterStart,'2026-09-21'),4);
 assert.equal(schoolWeekLabel(3),'小学期 -1 周');assert.equal(schoolWeekLabel(4),'常规学期第 1 周');
 for(const d of ['2026-09-20','2026-09-25','2026-09-26','2026-09-27','2026-10-01','2026-10-08'])assert.equal(classesOnDate(s,d).length,0,d);
 assert.equal(classesOnDate(s,'2026-10-10').length,3);
});
test('generation comparisons use resource identity, never rewritten titles',()=>{
 const p:LearningPlan={id:'old',title:'原方案',description:'',stages:['基础','应用'],resources:[{resourceId:'irodori',name:'书',url:'',role:'主线',verified:true}]};
 const rewritten={...p,id:'new',title:'换了说法',resources:[{...p.resources[0],name:'新的名字'}]};
 assert.deepEqual(resourceChanges(p,rewritten),{added:[],removed:[]});
 const subject={...initialState().subjects[2],plans:[p],selectedPlan:p.id};
 assert.deepEqual(previousFamilies(subject),['irodori']);
 assert.equal(keepActivePlan(subject,[rewritten])[0].id,'old');assert.equal(subject.selectedPlan,'old');
 assert.deepEqual(keepActivePlan({...subject,selectedPlan:undefined},[rewritten],p).map(p=>p.id),['old','new']);
 const s=initialState();assert.ok(alternativeSources(s,subject).every(r=>(r.family??r.id)!=='irodori'));
});
test('background text merge cannot overwrite a manual edit or a history restore',()=>{
 assert.equal(canPublishText(undefined,null,null),true);
 assert.equal(canPublishText('partial','original','partial'),true);
 assert.equal(canPublishText('manual','original','partial'),false);
 assert.equal(canPublishText('original','original','partial'),false);
});
