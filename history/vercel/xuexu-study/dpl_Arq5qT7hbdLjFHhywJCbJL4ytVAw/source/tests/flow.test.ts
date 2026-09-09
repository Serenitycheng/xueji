import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,type LearningPlan} from '../lib/model';
import {classesOnDate,weekDates,weekForDate,schoolWeekLabel} from '../lib/timetable';
import {resourceChanges,previousFamilies,keepActivePlan,alternativeSources} from '../lib/route-adjustments';
import {canPublishText} from '../lib/material-upload';
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
 const s=initialState();assert.ok(alternativeSources(s,subject).every(r=>(r.family??r.id)!=='irodori'));
});
test('background text merge cannot overwrite a manual edit or a history restore',()=>{
 assert.equal(canPublishText(undefined,null,null),true);
 assert.equal(canPublishText('partial','original','partial'),true);
 assert.equal(canPublishText('manual','original','partial'),false);
 assert.equal(canPublishText('original','original','partial'),false);
});
