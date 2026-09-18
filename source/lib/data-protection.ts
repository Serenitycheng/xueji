import {withDevelopmentSubject,type StudyState} from './model';
import {ensureLearning} from './learning';
import {DATA_VERSION,WRITE_PROTOCOL} from './versions';
export function readStoredState(data:string):StudyState{
 const state=JSON.parse(data);
 if(state?.version!==DATA_VERSION)throw new Error('STUDY_UNSUPPORTED_DATA_VERSION');
 if(!Array.isArray(state.subjects)||!Array.isArray(state.tasks)||!Array.isArray(state.materials)||!Array.isArray(state.timetable)||!state.settings)throw new Error('STUDY_INVALID_STORED_DATA');
 return ensureLearning(state.learning||!state.subjects.length?state:withDevelopmentSubject(state));
}
export function compatibleWrite(value:unknown){return value===WRITE_PROTOCOL;}
export function contentSummary(state:StudyState){return {directions:state.learning?.directions.length??0,units:state.learning?.units.length??0,learningRecords:state.learning?.records.length??0,currentActions:state.learning?.directions.filter(d=>d.currentActionId).length??0,references:state.learning?.references.length??0,subjects:state.subjects.length,tasks:state.tasks.length,completed:state.tasks.filter(t=>t.status==='done'||t.status==='partial').length,materials:state.materials.length,timetable:state.timetable.length,routes:state.subjects.reduce((n,s)=>n+s.plans.length,0)};}
export const operationNames:Record<string,string>={'learning.route.select':'选择路线小节','learning.direction.create':'建立学习方向','learning.direction.update':'更新学习方向','learning.direction.move':'调整方向顺序','learning.unit.save':'保存学习单元','learning.unit.completion':'更新本节完成进度','learning.unit.move':'调整单元顺序','learning.action.save':'确认下一步','learning.record.save':'记录学习与接续','learning.reference.save':'关联材料或笔记','preferences.save':'保存 AI 偏好','settings.save':'修改偏好与时间设置','subject.save':'修改学习目标','task.feedback':'提交学习反馈','task.defer':'重新安排任务','day.override':'调整可用时间','schedule.import':'导入课表','material.link':'添加课程链接','material.subject':'调整资料所属学科','material.text':'编辑资料正文','material.import':'导入学习资料','material.processed':'保存本机识别与资料分析','routes.generate':'生成路线方案','routes.select':'选择学习路线','plan.generate':'生成每日计划','coach':'学习助手回复','demo.load':'载入体验任务','demo.clear':'清除体验任务','key.save':'更新 DeepSeek 连接','key.remove':'断开 DeepSeek','history.restore':'恢复历史内容'};
