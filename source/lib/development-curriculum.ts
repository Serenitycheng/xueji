import type {LearningPlan} from './model';

export const DEVELOPMENT_CURRICULUM={
 title:'开发学习方案 ver2',
 source:'/api/development-plan',
 pages:16,
 approach:'从已有 Python 基础继续：先用学习记录周报诊断实际能力，再按真实卡点查资料和系统复习；持续用 AI 协助做项目，逐步接管需求判断、关键代码理解、改动检查和验证。',
 evidence:['一段自己的解释','一份能说明的实现','一次改变条件后的验证结果'],
 stages:[
  '01 + 03｜Python 能力诊断与基础工具同步：先完成 CSV 学习记录到 Markdown 周报的小项目；已经掌握的能力检查后直接通过，只按卡点复习条件、循环、数据结构、函数、文件与异常，同时使用运行、调试和 Git。',
  '02｜运行原理与操作系统：理解代码、运行环境、CPU、内存、磁盘、进程和并发。能解释程序运行与数据保存的基本过程即可，不要求实现操作系统。',
  '04｜数据结构与算法：继续用 Python，掌握常用容器、查找、排序和简单遍历；能说明结构选择并用边界输入验证结果，不以刷题数量作为完成标准。',
  '05｜计算机网络与接口：理解 HTTP、JSON、客户端与服务端；为练习工具加入接口，能处理超时、失败响应，并跟踪一次请求的完整过程。',
  '06｜数据库与 SQL：先用 SQLite，把文件版工具改为数据库保存；能设计关联表、完成查询与写入，并演示事务回滚和数据恢复。',
  '07｜软件工程：补齐需求与验收、模块分工、关键测试、日志和运行说明；能完成一次新需求、定位错误，并说明代码回退与数据恢复。',
  '08 + 09｜AI 拓展：模型、工具、上下文与 Harness 概念可提前了解；模型调用、RAG 和工具应用在接口、数据与测试基础稳定后实践。训练模型按兴趣选学。'
 ],
 projectPractice:'01先用一个小项目完成能力诊断，每次约20分钟按卡点查资料、40分钟继续实现；持续制作、修改和验证作品，把遇到的问题对应回课程。现有网站按需补 HTML/CSS → JavaScript → TypeScript → React。',
};

export function developmentLearningPlan():LearningPlan {
 return {
  id:'development-foundations-ver2',title:'从已有基础继续，用项目诊断并补齐短板',
  description:DEVELOPMENT_CURRICULUM.approach+' 每个主题保留：'+DEVELOPMENT_CURRICULUM.evidence.join('、')+'。',
  resources:[
   {resourceId:'development-plan-ver2',name:'开发学习方案 ver2.pdf',url:DEVELOPMENT_CURRICULUM.source,verified:true,role:'整体结构索引：保留原阶段顺序，第一阶段改为能力诊断与项目复盘。'},
   {resourceId:'bit-python',name:'北理工嵩天｜Python语言程序设计 MOOC',url:'https://www.icourse163.org/course/BIT-268001',verified:true,role:'按需补充：只在诊断暴露对应卡点时按主题选看，不从头播放。'},
   {resourceId:'pro-git',name:'Pro Git · 中文版',url:'https://git-scm.com/book/zh/v2',verified:true,role:'从起步同步练习查看差异、提交、分支与恢复；后续阶段的资料入口见个人方案。'}
  ],
  stages:[...DEVELOPMENT_CURRICULUM.stages],studyPattern:'attempt',sessionMinutes:25
 };
}
