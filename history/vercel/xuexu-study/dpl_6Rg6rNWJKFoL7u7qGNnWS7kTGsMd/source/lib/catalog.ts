import {type SubjectId} from './model';
export type ResourceSource={id:string;subjectId:SubjectId;name:string;url:string;description:string;verified:boolean;family?:string;use?:'main'|'supplement'};
export const CATALOG:ResourceSource[]=[
{id:'irodori',subjectId:'japanese',family:'irodori',use:'main',name:'IRODORI 生活中的日语 · 中文版',url:'https://www2.jpfbj.cn/irodori/index.php',description:'免费中文 PDF 教材和音频，偏日常生活交流。零基础从入门开始；先认识假名（平假名、片假名是日语的基础表音文字），不预设会五十音。适合喜欢教材顺序、可下载学习的人。具体课文页码以教材为准。',verified:true},
{id:'irodori-online',subjectId:'japanese',family:'irodori',use:'main',name:'IRODORI 日语在线课程',url:'https://www.irodori-online.jpf.go.jp/',description:'IRODORI 配套在线课程，与 IRODORI 教材属于同一套体系，不能算另一套独立资源路线。按入门生活场景听读练习，注册和课程要求以官网为准。',verified:true},
{id:'marugoto-a1',subjectId:'japanese',family:'marugoto',use:'main',name:'MARUGOTO 日语在线课程 · A1 中文入门',url:'https://www.marugoto-online.jp/info/chi/',description:'JF Minato 平台上的交互式日语课程。零基础选择 A1-1 活动・理解课程，可使用中文学习说明，结合听力、文字、词汇和基础表达。需要免费注册 Minato；优先选择免费自学班，具体开班和费用看课程页，不把教师辅导班或纸质教材一概说成免费。适合希望跟着网页练习走的人。',verified:true},
{id:'erin-basic',subjectId:'japanese',family:'erin',use:'main',name:'艾琳学日语 · 基础情景短剧',url:'https://www.erin.jpf.go.jp/en/',description:'国际交流基金会免费短剧与学习资料库，网站为日英界面，短剧有中文字幕。零基础只用 Basic skit（基础短剧）和 Key phrases（重点表达），先从见面问候、自我介绍开始；先看字幕理解，再听同一小段，不要求一开始听懂整集。搭配假名入门；高级短剧暂缓。适合偏好情景视频的人。',verified:true},
{id:'marugoto-plus',subjectId:'japanese',family:'marugoto',use:'supplement',name:'MARUGOTO Plus · 入门练习',url:'https://marugotoweb.jp/',description:'免费公开的配套练习入口，选择 Starter A1（入门）。提供文字、词汇、语法和会话练习；日语、英语等界面，无中文界面。可用来认识并练习平假名、片假名，不单独当作完整主课程。',verified:true},
{id:'anime-manga',subjectId:'japanese',family:'anime-manga',use:'supplement',name:'动漫日语 · 中文兴趣练习',url:'https://anime-manga.jp/',description:'国际交流基金会动漫日语网站，提供中文入口、角色表达和词汇游戏。认识基本假名和日常表达后作为兴趣补充；角色口吻未必适合现实日常交流，不能当零基础主教材，也不要求直接翻译整首歌词或整集动画。',verified:true},
{id:'3b1b',subjectId:'linear',name:'3Blue1Brown · 线性代数',url:'https://www.3blue1brown.com/?topic=linear-algebra',description:'以可视化建立线性代数直觉，英文内容，官网有 Bilibili 频道入口。适合作为指定中文教材的辅助，不替代考试范围。',verified:true},
{id:'stat110',subjectId:'stats',name:'Harvard Stat 110 · 概率论',url:'https://stat110.hsites.harvard.edu/',description:'英文概率课程，包含公开视频、讲义与习题入口；在线教材免费。作为概率理解的辅助，数理统计与考试范围以自己的教材为准。',verified:true},
{id:'nikon',subjectId:'photo',name:'Nikon Learn & Explore',url:'https://www.nikonusa.com/learn-and-explore',description:'尼康官方摄影文章与技巧入口，英文。结合自己的照片回顾光圈、快门、ISO、景深和构图。具体文章需在网站中选择并导入链接或正文。',verified:true},
{id:'cambridge',subjectId:'photo',name:'Cambridge in Colour · 摄影教程',url:'https://www.cambridgeincolour.com/',description:'摄影原理图文教程入口，英文，可围绕曝光、镜头、景深等基本概念学习。先选择教程，导入正文后可生成精确阅读任务。',verified:true}
];
