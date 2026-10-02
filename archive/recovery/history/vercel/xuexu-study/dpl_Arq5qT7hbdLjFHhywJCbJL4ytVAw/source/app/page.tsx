import StudyApp from '@/components/study-app';
import {hasSession} from '@/lib/session';
import {redirect} from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Home() { if(!await hasSession())redirect('/login');return <StudyApp />; }
