import {addDays,timeMinutes,type StudyState} from './model';
export function weekForDate(semesterStart:string,date:string){return Math.floor((Date.parse(date+'T12:00:00Z')-Date.parse(semesterStart+'T12:00:00Z'))/604800000)+1;}
export function classesOnDate(state:Pick<StudyState,'settings'|'timetable'>,date:string){
 const week=weekForDate(state.settings.semesterStart,date),day=new Date(date+'T12:00:00Z').getUTCDay();
 return state.timetable.filter(c=>c.day===day&&week>=c.weekStart&&week<=c.weekEnd&&(c.parity==='all'||(week%2===1)===(c.parity==='odd'))).sort((a,b)=>timeMinutes(a.start)-timeMinutes(b.start));
}
export function weekDates(semesterStart:string,week:number){return Array.from({length:7},(_,i)=>addDays(semesterStart,(week-1)*7+i));}
export function schoolWeekLabel(week:number){return week<=3?'小学期 '+(week-4)+' 周':'常规学期第 '+(week-3)+' 周';}
