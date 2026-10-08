'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Route,
  FolderOpen,
  History,
  Settings,
  ChevronRight,
  Cloud,
  AlertCircle,
  CheckCheck,
  Calculator,
  ChartNoAxesCombined,
  Languages,
  Camera,
  Code2,
  GraduationCap,
} from 'lucide-react';
import { Button } from './ui/button';
import { PageColorPicker } from './appearance';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from './ui/sidebar';
import { MaterialsView } from './views/materials-view';
import { SettingsView } from './views/settings-view';
import { CloudView } from './views/cloud-view';
import {
  LearningHome,
  DirectionsView,
  DirectionDetail,
  LearningReview,
  LegacyView,
  ReferenceEntry,
} from './learning-workspace';
import { useCloudSync } from '@/lib/use-cloud-sync';
import { localStore } from '@/lib/client-store';
import { emptyLearning } from '@/lib/learning';
import type { Snapshot, View } from '@/lib/model';
export const subjectIcons = {
  linear: Calculator,
  stats: ChartNoAxesCombined,
  japanese: Languages,
  photo: Camera,
  development: Code2,
};
const directionIcons = new Map(
  Object.entries({ ...subjectIcons, professional: GraduationCap }),
);
export type Actions = {
  run: (
    op: string,
    data?: Record<string, unknown>,
  ) => Promise<{ snapshot: Snapshot; message?: string; reply?: string } | null>;
  busy: boolean;
  hasDraft: boolean;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
  navigate: (view: View) => void;
};
const nav = [
  { id: 'today', label: '继续学习', icon: LayoutDashboard },
  { id: 'routes', label: '学习方向', icon: Route },
  { id: 'materials', label: '资料库', icon: FolderOpen },
  { id: 'progress', label: '学习回看', icon: History },
] as const;
export default function StudyApp() {
  const [message, setMessage] = useState(''),
    [view, setView] = useState<View>('today'),
    [directionId, setDirectionId] = useState('');
  const sync = useCloudSync(setMessage);
  const { snap, loaded, busy, error, run, refresh } = sync,
    w = snap.state.learning ?? emptyLearning();
  useEffect(() => {
    const update = () => {
      const hash = location.hash.slice(1);
      if (hash.startsWith('learn/')) {
        try {
          const id = decodeURIComponent(hash.slice(6));
          setDirectionId(id);
          setView('learn');
          localStorage.setItem('xuexu-last-direction', id);
        } catch {
          setView('today');
        }
        return;
      }
      const v = hash === 'schedule' ? 'legacy' : hash;
      if (
        [
          'today',
          'routes',
          'materials',
          'progress',
          'settings',
          'cloud',
          'legacy',
        ].includes(v)
      )
        setView(v as View);
      else setView('today');
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const navigate = (v: View) => {
    sync.finishEditing();
    setView(v);
    history.replaceState(null, '', '#' + v);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const open = (id: string) => {
    sync.finishEditing();
    setDirectionId(id);
    setView('learn');
    history.replaceState(null, '', '#learn/' + encodeURIComponent(id));
    window.dispatchEvent(new PopStateEvent('popstate'));
    try {
      localStorage.setItem('xuexu-last-direction', id);
    } catch {}
    window.scrollTo({ top: 0 });
  };
  const actions: Actions = {
      run,
      busy,
      hasDraft: sync.drafts.length > 0,
      notify: setMessage,
      refresh,
      navigate,
    },
    state = { ...snap.state, learning: w },
    d = w.directions.find((d) => d.id === directionId);
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '232px' } as CSSProperties}
      onFocusCapture={(e) => {
        if (
          e.target instanceof Element &&
          e.target.matches('input,textarea,select,[role=combobox]')
        )
          sync.markEditing();
      }}
      onChangeCapture={() => sync.markEditing()}
    >
      <Sidebar className="app-sidebar">
        <SidebarHeader className="brand">
          <div className="brand-symbol">
            <BookOpen size={23} />
          </div>
          <div>
            <strong>
              学迹<span>XUEJI</span>
            </strong>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>学习工作台</SidebarGroupLabel>
            <SidebarMenu>
              {nav.map((n) => (
                <SidebarMenuItem key={n.id}>
                  <SidebarMenuButton
                    isActive={view === n.id}
                    aria-current={view === n.id ? 'page' : undefined}
                    onClick={() => navigate(n.id)}
                    className="nav-item"
                  >
                    <n.icon />
                    <span>{n.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>
              进行中的方向 ·{' '}
              {w.directions.filter((d) => d.status === 'active').length}
            </SidebarGroupLabel>
            <SidebarMenu>
              {w.directions
                .filter((d) => d.status === 'active')
                .slice(0, 8)
                .map((d) => {
                  const Icon =
                    directionIcons.get(d.curriculumId ?? '') ??
                    (d.kind === 'course' ? GraduationCap : BookOpen);
                  return (
                    <SidebarMenuItem key={d.id}>
                      <SidebarMenuButton
                        isActive={view === 'learn' && directionId === d.id}
                        aria-current={
                          view === 'learn' && directionId === d.id
                            ? 'page'
                            : undefined
                        }
                        onClick={() => open(d.id)}
                      >
                        <Icon />
                        <span>{d.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              {w.directions.filter((d) => d.status === 'active').length > 8 && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate('routes')}>
                    查看全部方向
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Button
            variant="ghost"
            className={`settings-nav${view === 'settings' ? ' is-active' : ''}`}
            aria-current={view === 'settings' ? 'page' : undefined}
            onClick={() => navigate('settings')}
          >
            <Settings size={18} />
            设置
          </Button>
          <Button
            variant="ghost"
            className={`settings-nav${view === 'cloud' ? ' is-active' : ''}`}
            aria-current={view === 'cloud' ? 'page' : undefined}
            onClick={() => navigate('cloud')}
          >
            <Cloud size={18} />
            同步与版本
          </Button>
          <div className="profile">
            <span className="avatar">我</span>
            <div>
              <strong>我的学习空间</strong>
              <small>个人空间</small>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (sync.drafts.length) {
                  setMessage('请先处理或导出已提交的本机草稿后再退出。');
                  navigate('cloud');
                  return;
                }
                const r = await fetch('/api/auth', { method: 'DELETE' });
                if (r.ok) {
                  await localStore.clear().catch(() => {});
                  location.assign('/login');
                }
              }}
            >
              退出
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-trigger" />
            <span>我的工作台</span>
            <ChevronRight size={14} />
            <strong>
              {view === 'learn'
                ? (d?.name ?? '学习方向')
                : (nav.find((n) => n.id === view)?.label ??
                  (view === 'legacy'
                    ? '旧记录与计划'
                    : view === 'cloud'
                      ? '同步与版本'
                      : '设置'))}
            </strong>
          </div>
          <div className="topbar-actions">
            <PageColorPicker />
            <Button
              variant="ghost"
              className="sync-indicator"
              onClick={() => navigate('cloud')}
            >
              <Cloud size={15} />
              {busy
                ? '正在保存'
                : sync.drafts.length
                  ? '本机修改待确认'
                  : !sync.online
                    ? '离线 · 本机缓存'
                    : sync.cloudAhead
                      ? '云端有新内容'
                      : '已连接云端'}
            </Button>
          </div>
        </header>
        <main className="main-content">
          {(sync.drafts.length > 0 || sync.cloudAhead) && view !== 'cloud' && (
            <div className="notice">
              <Cloud size={18} />
              <span>
                {sync.drafts.length
                  ? '有尚未确认的本机修改，输入仍保留。'
                  : '另一台设备有新内容，当前编辑保持原样。'}
              </span>
              <Button variant="outline" onClick={() => navigate('cloud')}>
                比较与处理
              </Button>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <Button variant="outline" onClick={() => void refresh()}>
                重试
              </Button>
            </div>
          )}
          {message && (
            <output className="notice">
              <CheckCheck size={18} />
              <span>{message}</span>
              <Button variant="ghost" onClick={() => setMessage('')}>
                关闭
              </Button>
            </output>
          )}
          {!loaded ? (
            <output>正在读取学习空间…</output>
          ) : (
            <>
              {view === 'today' && (
                <LearningHome state={state} actions={actions} open={open} />
              )}
              {view === 'routes' && (
                <DirectionsView state={state} actions={actions} open={open} />
              )}
              {view === 'learn' &&
                (d ? (
                  <DirectionDetail
                    key={d.id}
                    d={d}
                    state={state}
                    actions={actions}
                    open={open}
                  />
                ) : (
                  <section className="learning-empty">
                    <h1>这个学习方向暂时无法找到</h1>
                    <p>请确认已登录正确账号，或从方向列表重新进入。</p>
                    <Button onClick={() => navigate('routes')}>
                      查看学习方向
                    </Button>
                  </section>
                ))}
              {view === 'progress' && (
                <LearningReview state={state} actions={actions} open={open} />
              )}
              {view === 'materials' && (
                <>
                  <section className="content-panel">
                    <h2>已关联的学习入口 · {w.references.length}</h2>
                    {w.references.length ? (
                      w.references.map((r) => (
                        <div key={r.id}>
                          <button
                            className="text-link"
                            onClick={() => open(r.directionId)}
                          >
                            {
                              w.directions.find((d) => d.id === r.directionId)
                                ?.name
                            }
                          </button>
                          <ReferenceEntry reference={r} material={snap.state.materials.find((m) => m.id === r.target)} actions={actions} />
                        </div>
                      ))
                    ) : (
                      <p>在学习方向中关联主材料、网页、本地路径或笔记。</p>
                    )}
                  </section>
                  <MaterialsView snap={snap} actions={actions} />
                </>
              )}
              {view === 'settings' && (
                <>
                  <SettingsView snap={snap} actions={actions} />
                  <Button variant="outline" onClick={() => navigate('cloud')}>
                    数据导出、同步与版本
                  </Button>
                </>
              )}
              {view === 'cloud' && (
                <CloudView sync={sync} notify={setMessage} />
              )}
              {view === 'legacy' && (
                <LegacyView state={state} actions={actions} />
              )}
            </>
          )}
          <footer className="app-footer">
            <span>学迹 · 留下起点，继续学习</span>
            <Button variant="ghost" onClick={() => navigate('legacy')}>
              旧记录与计划
            </Button>
          </footer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
