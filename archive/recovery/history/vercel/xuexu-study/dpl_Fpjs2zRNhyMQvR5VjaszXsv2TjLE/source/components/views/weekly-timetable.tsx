'use client';
import {useState,useEffect} from 'react';
import {type StudyState,today,timeMinutes} from '@/lib/model';
import {classesOnDate,weekForDate,weekDates,schoolWeekLabel} from '@/lib/timetable';
import {Button} from '@/components/ui/button';
import {ChevronLeft,ChevronRight} from 'lucide-react';
const days=['周一','周二','周三','周四','周五','周六','周日'];
const colors=['#5865db','#238774','#ab682f','#9062ab','#247b9c','#b95776'];
export function WeeklyTimetable({state}:{state:StudyState}){
 const current=weekForDate(state.settings.semesterStart,today()),max=Math.max(21,...state.timetable.map(c=>c.weekEnd));
 const [week,setWeek]=useState(Math.max(1,Math.min(max,current)));
 useEffect(()=>{setWeek(Math.max(1,Math.min(max,weekForDate(state.settings.semesterStart,today()))));},[state.settings.semesterStart]);
 const dates=weekDates(state.settings.semesterStart,week),rows=dates.map(d=>classesOnDate(state,d));
 const count=rows.reduce((n,r)=>n+r.length,0);
 return <section className="content-panel weekly-calendar"><div className="section-heading"><div><h2>每周课表 · 第 {week} 周</h2><p className="hint">{schoolWeekLabel(week)} · {dates[0]} — {dates[6]} · {count} 次课</p></div><div className="button-row"><Button aria-label="上一周" variant="outline" disabled={week<=1} onClick={()=>setWeek(week-1)}><ChevronLeft/></Button><select aria-label="选择课表周次" value={week} onChange={e=>setWeek(Number(e.target.value))}>{Array.from({length:max},(_,i)=><option key={i} value={i+1}>第 {i+1} 周</option>)}</select><Button aria-label="下一周" variant="outline" disabled={week>=max} onClick={()=>setWeek(week+1)}><ChevronRight/></Button><Button variant="ghost" disabled={current<1||current>max} onClick={()=>setWeek(current)}>本周</Button></div></div>
 <p className="hint">小学期 −3、−2、−1 周对应第 1、2、3 周；常规学期从第 4 周起。按已导入周次显示，调课以实际日期为准。</p>
 {!count&&<p className="inline-note">这一周没有课程，可以按自己的节奏安排学习。</p>}
 <div className="calendar-scroll"><div className="calendar-grid"><div className="calendar-corner">时间</div>{dates.map((d,i)=><div key={d} className={'calendar-day '+(d===today()?'calendar-today':'')}><strong>{days[i]}</strong><span>{d.slice(5).replace('-','/')}</span></div>)}<div className="calendar-axis">{Array.from({length:14},(_,i)=><span key={i} style={{top:i*64}}>{String(i+8).padStart(2,'0')}:00</span>)}</div>{rows.map((courses,i)=><div key={dates[i]} className={'calendar-column '+(dates[i]===today()?'calendar-today':'')}>{courses.map(c=>{const overlapping=courses.filter(o=>timeMinutes(o.start)<timeMinutes(c.end)&&timeMinutes(o.end)>timeMinutes(c.start));const lane=overlapping.findIndex(o=>o.id===c.id);const hash=[...c.name.split(/[（(]/)[0]].reduce((n,ch)=>n+ch.charCodeAt(0),0);return <article key={c.id} className="calendar-course" style={{top:(timeMinutes(c.start)-480)*64/60,height:Math.max(40,(timeMinutes(c.end)-timeMinutes(c.start))*64/60-3),left:`calc(${lane/overlapping.length*100}% + 2px)`,width:`calc(${100/overlapping.length}% - 4px)`,borderColor:colors[hash%colors.length]}} title={c.name+' '+c.start+'–'+c.end}><strong>{c.name}</strong><small>{c.start}–{c.end}</small></article>;})}</div>)}</div></div><p className="hint calendar-mobile-hint">左右滑动查看整周；点击周次可跳转。</p>
 </section>;
}
