import type {LearningPlan} from './model';

export const DEVELOPMENT_CURRICULUM={
 title:'开发学习方案 ver2',
 source:'/api/development-plan',
 pages:16,
 approach:'从已有 Python 基础继续：按知识地图系统复习核心主题，并把每个主题立即应用到“本地学习资料索引器”；逐步接管需求拆分、关键代码理解、改动检查和验证。',
 evidence:['一页知识清单','一份能说明的实现','一次改变条件后的验证结果'],
 stages:[
  '01 + 03｜Python 系统复习与基础工具同步：按值与类型、控制流、数据结构、函数与模块、异常、文件、类、测试逐项梳理；同步完成本地学习资料索引器，并使用运行、调试和 Git。',
  '02｜运行原理与操作系统：理解代码、运行环境、CPU、内存、磁盘、进程和并发。能解释程序运行与数据保存的基本过程即可，不要求实现操作系统。',
  '04｜数据结构与算法：继续用 Python，掌握常用容器、查找、排序和简单遍历；能说明结构选择并用边界输入验证结果，不以刷题数量作为完成标准。',
  '05｜计算机网络与接口：理解 HTTP、JSON、客户端与服务端；为练习工具加入接口，能处理超时、失败响应，并跟踪一次请求的完整过程。',
  '06｜数据库与 SQL：先用 SQLite，把文件版工具改为数据库保存；能设计关联表、完成查询与写入，并演示事务回滚和数据恢复。',
  '07｜软件工程：补齐需求与验收、模块分工、关键测试、日志和运行说明；能完成一次新需求、定位错误，并说明代码回退与数据恢复。',
  '08 + 09｜AI 拓展：模型、工具、上下文与 Harness 概念可提前了解；模型调用、RAG 和工具应用在接口、数据与测试基础稳定后实践。训练模型按兴趣选学。'
 ],
 projectPractice:'01采用“系统复习 + 同一项目持续迭代”：每次先整理当前主题的核心概念与易错点，再把它用于资料索引器并验证。现有网站按需补 HTML/CSS → JavaScript → TypeScript → React。',
};

export function developmentLearningPlan():LearningPlan {
 return {
  id:'development-foundations-ver2',title:'系统复习 Python，并用项目持续巩固',
  description:DEVELOPMENT_CURRICULUM.approach+' 每个主题保留：'+DEVELOPMENT_CURRICULUM.evidence.join('、')+'。',
  resources:[
   {resourceId:'development-plan-ver2',name:'开发学习方案 ver2.pdf',url:DEVELOPMENT_CURRICULUM.source,verified:true,role:'整体结构索引：保留原阶段顺序，第一阶段采用知识梳理与项目实践双线推进。'},
   {resourceId:'python-docs',name:'Python 官方教程 · 中文版',url:'https://docs.python.org/zh-cn/3/tutorial/',verified:true,role:'系统复习与查证：配合第3版教材，按当前节点学习控制流、数据结构、模块、输入输出、异常和类。'},
   {resourceId:'pro-git',name:'Pro Git · 中文版',url:'https://git-scm.com/book/zh/v2',verified:true,role:'从起步同步练习查看差异、提交、分支与恢复；后续阶段的资料入口见个人方案。'}
  ],
  stages:[...DEVELOPMENT_CURRICULUM.stages],studyPattern:'attempt',sessionMinutes:40
 };
}
