'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api, showToast, formatDate } from '@/lib/client';
import { toISODate } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem,
} from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, FolderKanbanIcon, MapPinIcon, ArmchairIcon } from 'lucide-react';

const fmtISO = toISODate;

export default function Dashboard() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState({ tasks: [], milestones: [], visits: [], orders: [] });
  const [todayTasks, setTodayTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', due_date: fmtISO(new Date()), assigned_to: '' });
  const [dayOpen, setDayOpen] = useState(null); // ISO date whose details are open
  const [me, setMe] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const canAssign = me && me.role !== 'user';

  useEffect(() => {
    api('/api/me').then(setMe).catch(() => {});
  }, []);
  useEffect(() => {
    if (canAssign) api('/api/users/assignable').then(setAssignableUsers).catch(() => {});
  }, [canAssign]);

  // Month grid range (pad to full weeks, Monday start).
  const { gridStart, gridDays } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const days = [];
    const d = new Date(start);
    for (let i = 0; i < 42; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return { gridStart: start, gridDays: days };
  }, [cursor]);

  const loadCalendar = useCallback(async () => {
    const from = fmtISO(gridDays[0]);
    const to = fmtISO(gridDays[41]);
    setEvents(await api(`/api/calendar?from=${from}&to=${to}`));
  }, [gridDays]);

  const loadToday = useCallback(async () => {
    setTodayTasks(await api('/api/tasks?scope=today'));
  }, []);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);
  useEffect(() => { loadToday(); }, [loadToday]);

  const byDate = useMemo(() => {
    const map = {};
    const add = (date, item) => { if (date) (map[date] ||= []).push(item); };
    for (const t of events.tasks) add(t.date, { ...t, kind: 'task' });
    for (const m of events.milestones) add(m.date, { ...m, kind: 'milestone' });
    for (const v of events.visits) add(v.date, { ...v, kind: 'visit', title: `Site visit · ${v.project_name}` });
    for (const o of events.orders) add(o.date, { ...o, kind: 'order', title: `${o.item} × ${o.qty} due` });
    return map;
  }, [events]);

  async function addTask() {
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: { title: newTask.title, due_date: newTask.due_date, assigned_to: newTask.assigned_to || undefined },
      });
      setNewTask({ title: '', due_date: fmtISO(new Date()), assigned_to: '' });
      loadCalendar();
      loadToday();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function toggleTask(t) {
    await api(`/api/tasks/${t.id}`, { method: 'PUT', body: { status: t.status === 'done' ? 'open' : 'done' } });
    loadCalendar();
    loadToday();
  }

  const todayISO = fmtISO(new Date());
  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="container flex flex-col gap-4 py-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{monthLabel}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
                <ChevronLeftIcon />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
                <ChevronRightIcon />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="bg-muted px-1 py-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
              {gridDays.map(d => {
                const iso = fmtISO(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const items = byDate[iso] || [];
                return (
                  <button key={iso} onClick={() => items.length && setDayOpen(iso)}
                    className={cn('flex min-h-20 flex-col items-stretch gap-0.5 bg-background p-1 text-left transition-colors',
                      !inMonth && 'opacity-40', items.length && 'cursor-pointer hover:bg-muted')}>
                    <span className={cn('self-end rounded-full px-1.5 text-xs',
                      iso === todayISO ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground')}>
                      {d.getDate()}
                    </span>
                    {items.slice(0, 3).map((it, i) => (
                      <span key={i} className={cn('truncate rounded px-1 text-[10px] leading-4',
                        it.kind === 'task' && (it.status === 'done' ? 'bg-muted text-muted-foreground line-through' : 'bg-primary/15 text-primary'),
                        it.kind === 'milestone' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                        it.kind === 'visit' && 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
                        it.kind === 'order' && 'bg-violet-500/15 text-violet-700 dark:text-violet-400')}>
                        {it.title}
                      </span>
                    ))}
                    {items.length > 3 && <span className="px-1 text-[10px] text-muted-foreground">+{items.length - 3} more</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" />Tasks</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" />Milestones</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-sky-500" />Site visits</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-violet-500" />Order due</span>
            </div>
          </CardContent>
        </Card>

        {/* Today & overdue */}
        <Card>
          <CardHeader><CardTitle>Today & overdue</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Input placeholder="New task…" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && newTask.title.trim() && addTask()} className="min-w-32 flex-1" />
              <Input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} className="w-36 shrink-0" />
              {canAssign && (
                <Select value={newTask.assigned_to} onValueChange={v => setNewTask({ ...newTask, assigned_to: v })}>
                  <SelectTrigger className="w-36 shrink-0"><SelectValue placeholder="Assign to me" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {assignableUsers.map(u => (
                        <SelectItem key={u.id} value={u.username}>{u.display_name || u.username}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              <Button size="icon" onClick={addTask} disabled={!newTask.title.trim()} aria-label="Add task"><PlusIcon /></Button>
            </div>
            <div className="flex flex-col gap-1">
              {todayTasks.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">All clear — nothing due.</p>}
              {todayTasks.map(t => {
                const overdue = t.due_date < todayISO;
                return (
                  <div key={t.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted">
                    <Checkbox checked={t.status === 'done'} onCheckedChange={() => toggleTask(t)} />
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    {canAssign && t.assigned_to && <Badge variant="secondary" className="shrink-0">{t.assigned_to}</Badge>}
                    {t.client_name && <Badge variant="outline" className="shrink-0">{t.client_name}</Badge>}
                    <span className={cn('shrink-0 text-xs', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                      {overdue ? formatDate(t.due_date) : 'today'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day details */}
      <Dialog open={!!dayOpen} onOpenChange={o => !o && setDayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dayOpen ? formatDate(dayOpen) : ''}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2">
            {(byDate[dayOpen] || []).map((it, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                {it.kind === 'task' && (
                  <>
                    <Checkbox checked={it.status === 'done'} onCheckedChange={() => { toggleTask(it); setDayOpen(null); }} />
                    <span className={cn('flex-1', it.status === 'done' && 'text-muted-foreground line-through')}>{it.title}</span>
                    {it.client_name && <Badge variant="outline">{it.client_name}</Badge>}
                  </>
                )}
                {it.kind === 'milestone' && (
                  <>
                    <FolderKanbanIcon className="size-4 shrink-0 text-amber-600" />
                    <span className="flex-1">{it.title}</span>
                    <Link href={`/projects/${it.project_id}`} className="text-xs text-primary hover:underline">{it.project_name}</Link>
                  </>
                )}
                {it.kind === 'visit' && (
                  <>
                    <MapPinIcon className="size-4 shrink-0 text-sky-600" />
                    <span className="flex-1">{it.notes || 'Site visit'}</span>
                    <Link href={`/projects/${it.project_id}`} className="text-xs text-primary hover:underline">{it.project_name}</Link>
                  </>
                )}
                {it.kind === 'order' && (
                  <>
                    <ArmchairIcon className="size-4 shrink-0 text-violet-600" />
                    <span className="flex-1">{it.title}</span>
                    <Link href={`/orders/${it.id}`} className="text-xs text-primary hover:underline">Open</Link>
                  </>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
