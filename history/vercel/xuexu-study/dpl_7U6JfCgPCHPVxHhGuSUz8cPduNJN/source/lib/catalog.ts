import {type SubjectId} from './model';
export type ResourceSource={id:string;subjectId:SubjectId;name:string;url:string;description:string;verified:boolean};
export const CATALOG:ResourceSource[]=[
{id:'irodori',subjectId:'japanese',name:'IRODORI 生活中的日语 · 中文版',url:'https://www2.jpfbj.cn/irodori/index.php',description:'国际交流基金会中文教材入口，按入门到初级组织生活表达，含教材与音频。先进入入门课程，实际课文页码以下载教材为准。',verified:true},
{id:'irodori-online',subjectId:'japanese',name:'IRODORI 日语在线课程',url:'https://www.irodori-online.jpf.go.jp/',description:'国际交流基金会在线日语课程，可练习生活表达，适合配合入门教材。课程界面与注册要求以网站为准。',verified:true},
{id:'3b1b',subjectId:'linear',name:'3Blue1Brown · 线性代数',url:'https://www.3blue1brown.com/?topic=linear-algebra',description:'以可视化建立线性代数直觉，英文内容，官网有 Bilibili 频道入口。适合作为指定中文教材的辅助，不替代考试范围。',verified:true},
{id:'stat110',subjectId:'stats',name:'Harvard Stat 110 · 概率论',url:'https://stat110.hsites.harvard.edu/',description:'英文概率课程，包含公开视频、讲义与习题入口；在线教材免费。作为概率理解的辅助，数理统计与考试范围以自己的教材为准。',verified:true},
{id:'nikon',subjectId:'photo',name:'Nikon Learn & Explore',url:'https://www.nikonusa.com/learn-and-explore',description:'尼康官方摄影文章与技巧入口，英文。结合自己的照片回顾光圈、快门、ISO、景深和构图。具体文章需在网站中选择并导入链接或正文。',verified:true},
{id:'cambridge',subjectId:'photo',name:'Cambridge in Colour · 摄影教程',url:'https://www.cambridgeincolour.com/',description:'摄影原理图文教程入口，英文，可围绕曝光、镜头、景深等基本概念学习。先选择教程，导入正文后可生成精确阅读任务。',verified:true}
];
