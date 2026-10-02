import {neon} from '@neondatabase/serverless';

// Keep parameters separate from SQL while adapting the existing small query surface.
export function db(){
 const url=process.env.DATABASE_URL;
 if(!url)throw new Error('DATABASE_URL is not configured');
 const sql=neon(url,{fullResults:true});
 return {prepare(statement:string){
  let index=0;const query=statement.replace(/\?/g,()=>'$'+(++index));
  const execute=(values:unknown[])=>sql.query(query,values);
  function bound(values:unknown[]){return {
   async first<T=Record<string,unknown>>():Promise<T|null>{const result=await execute(values);return (result.rows[0] as T)??null;},
   async run(){const result=await execute(values);return {meta:{changes:result.rowCount}};},
  };}
  return {...bound([]),bind(...values:unknown[]){return bound(values);}};
 }};
}
