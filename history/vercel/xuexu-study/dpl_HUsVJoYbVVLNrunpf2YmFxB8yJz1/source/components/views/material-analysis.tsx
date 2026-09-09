import type {Material} from '@/lib/model';
export function MaterialAnalysisView({material}:{material:Material}){
 const a=material.analysis;if(!a)return null;
 return <section className="material-analysis"><h3>资料已整理</h3><p>{a.overview}</p><div className="next-action"><div><strong>可以从这一步开始</strong><p>{a.firstStep}</p></div></div><h4>内容与学习顺序</h4><ol>{a.topics.map((t,i)=><li key={i}><a href={'/api/materials?id='+material.id+'#page='+t.fromPage} target="_blank" rel="noopener noreferrer">{t.title} · {material.kind==='pdf'?'PDF 第':'第'} {t.fromPage}–{t.toPage} 页 ↗</a>{t.prerequisites.length>0&&<small>需要先了解：{t.prerequisites.join('、')}</small>}</li>)}</ol>{a.warnings.map((w,i)=><p className="hint" key={i}>{w}</p>)}</section>;
}
