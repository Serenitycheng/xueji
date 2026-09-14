import type {LearningPlan} from './model';

export const DEVELOPMENT_CURRICULUM={
 title:'开发学习方案 ver2',
 source:'/api/development-plan',
 pages:16,
 approach:'系统学习与项目实践同时推进：Python 学编程基础，SQL 学数据库；持续用 AI 协助做项目，逐步接管需求判断、关键代码理解、改动检查和验证。',
 evidence:['一段自己的解释','一份能说明的实现','一次改变条件后的验证结果'],
 stages:[
  '01 + 03｜编程基础与基础工具同步起步：用 Python 练变量、判断、循环、函数、文件与异常；同时学习运行、调试和 Git。能独立完成文件版小工具、修改需求并检查边界输入后再推进。',
  '02｜运行原理与操作系统：理解代码、运行环境、CPU、内存、磁盘、进程和并发。能解释程序运行与数据保存的基本过程即可，不要求实现操作系统。',
  '04｜数据结构与算法：继续用 Python，掌握常用容器、查找、排序和简单遍历；能说明结构选择并用边界输入验证结果，不以刷题数量作为完成标准。',
  '05｜计算机网络与接口：理解 HTTP、JSON、客户端与服务端；为练习工具加入接口，能处理超时、失败响应，并跟踪一次请求的完整过程。',
  '06｜数据库与 SQL：先用 SQLite，把文件版工具改为数据库保存；能设计关联表、完成查询与写入，并演示事务回滚和数据恢复。',
  '07｜软件工程：补齐需求与验收、模块分工、关键测试、日志和运行说明；能完成一次新需求、定位错误，并说明代码回退与数据恢复。',
  '08 + 09｜AI 拓展：模型、工具、上下文与 Harness 概念可提前了解；模型调用、RAG 和工具应用在接口、数据与测试基础稳定后实践。训练模型按兴趣选学。'
 ],
 projectPractice:'持续制作、修改和验证作品，把遇到的问题对应回课程。现有网站按需补 HTML/CSS → JavaScript → TypeScript → React；这条补充线不替代 Python 与 SQL 的系统主线。',
};

export function developmentLearningPlan():LearningPlan {
 return {
  id:'development-foundations-ver2',title:'按个人方案打基础，结合项目实践',
  description:DEVELOPMENT_CURRICULUM.approach+' 每个主题保留：'+DEVELOPMENT_CURRICULUM.evidence.join('、')+'。',
  resources:[
   {resourceId:'development-plan-ver2',name:'开发学习方案 ver2.pdf',url:DEVELOPMENT_CURRICULUM.source,verified:true,role:'个人系统学习主线：按方案指定范围和验收要求推进，资源索引按当前阶段选用。'},
   {resourceId:'cs50-python',name:'CS50 Python',url:'https://cs50.harvard.edu/python/',verified:true,role:'起步主课：用 Python 建立编程基础；按个人方案选读，基础练习自己动手。'},
   {resourceId:'pro-git',name:'Pro Git · 中文版',url:'https://git-scm.com/book/zh/v2',verified:true,role:'从起步同步练习查看差异、提交、分支与恢复；后续阶段的资料入口见个人方案。'}
  ],
  stages:[...DEVELOPMENT_CURRICULUM.stages],studyPattern:'attempt',sessionMinutes:25
 };
}
