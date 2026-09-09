'use client';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {type ReactNode} from 'react';
export function Picker({value,onChange,options,label}:{value:string;onChange:(value:string)=>void;options:{value:string;label:string}[];label:string}){
return <Select value={value} onValueChange={v=>v!==null&&onChange(String(v))} items={options}><SelectTrigger aria-label={label} className="picker"><SelectValue /></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;
}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <div className="field"><label>{label}</label>{children}{hint&&<p className="hint">{hint}</p>}</div>;}
export function Empty({icon,title,children,action}:{icon:ReactNode;title:string;children:ReactNode;action?:ReactNode}){return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{children}</p>{action}</div>;}
