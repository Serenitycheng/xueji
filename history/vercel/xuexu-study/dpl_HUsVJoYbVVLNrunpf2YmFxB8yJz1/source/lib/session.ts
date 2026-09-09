import {cookies} from 'next/headers';
import {SignJWT,jwtVerify} from 'jose';
import {scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const cookieName=process.env.NODE_ENV==='production'?'__Host-study-session':'study-session';
const duration=7*24*60*60;
function signingKey(){const secret=process.env.SESSION_SECRET;if(!secret||secret.length<32)throw new Error('SESSION_SECRET is not configured');return new TextEncoder().encode(secret);}
function version(){return createHash('sha256').update(process.env.STUDY_PASSWORD_HASH??'').digest('hex');}
export async function verifyPassword(password:string){
 const encoded=process.env.STUDY_PASSWORD_HASH??'';const [salt,hash]=encoded.split(':');
 if(!salt||!hash||hash.length!==128)return false;
 const derived=await scrypt(password,salt,64) as Buffer;
 return timingSafeEqual(derived,Buffer.from(hash,'hex'));
}
export async function issueSession(){
 const token=await new SignJWT({version:version()}).setProtectedHeader({alg:'HS256'}).setSubject('owner').setIssuer('studyflow').setAudience('studyflow').setIssuedAt().setExpirationTime(duration+'s').sign(signingKey());
 (await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:duration});
}
export async function hasSession(){
 const token=(await cookies()).get(cookieName)?.value;if(!token)return false;
 try{const {payload}=await jwtVerify(token,signingKey(),{algorithms:['HS256'],issuer:'studyflow',audience:'studyflow'});return payload.sub==='owner'&&payload.version===version();}catch{return false;}
}
export async function clearSession(){(await cookies()).set(cookieName,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});}
