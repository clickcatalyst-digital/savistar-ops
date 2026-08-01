'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { api, showToast, formatDate } from '@/lib/client';
import { toISODate } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, FolderKanbanIcon, MapPinIcon, ArmchairIcon, ListTodoIcon, Trash2Icon, CalendarIcon, UserIcon } from 'lucide-react';

const fmtISO = toISODate;

// Shared between the year-view dot indicators and the legend below the calendar — keep colors in sync.
const EVENT_KIND_ORDER = ['task', 'milestone', 'visit', 'order'];
const EVENT_KIND_DOT = {
  task: 'bg-primary',
  milestone: 'bg-amber-500',
  visit: 'bg-teal-500',
  order: 'bg-violet-500',
};
// Lighter fills for the year-view day bubbles.
const EVENT_KIND_LIGHT = {
  task: 'bg-primary/35',
  milestone: 'bg-amber-500/35',
  visit: 'bg-teal-500/35',
  order: 'bg-violet-500/35',
};

function DaySection({ label, icon, onAdd, addColorClass = 'bg-muted-foreground/40 hover:bg-muted-foreground/70', count, children }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        {onAdd && (
          <Button variant="ghost" size="icon-sm" onClick={onAdd} aria-label={`Add ${label.toLowerCase()}`}
            className={cn('size-6 rounded-full text-white/75 transition-colors hover:text-white', addColorClass)}>
            <PlusIcon className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {count === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Nothing due</p>}
        {children}
      </div>
    </div>
  );
}

function QuickAddRow({ placeholder, onSubmit }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-1.5 pt-1">
      <Input autoFocus placeholder={placeholder} value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSubmit(value.trim()); setValue(''); } }}
        className="h-8 flex-1 text-sm" />
      <Button size="icon-sm" className="size-8 shrink-0" disabled={!value.trim()}
        onClick={() => { onSubmit(value.trim()); setValue(''); }}>
        <PlusIcon className="size-4" />
      </Button>
    </div>
  );
}

// NOTE: assumes shadcn's Calendar component (react-day-picker) is already set up at
// @/components/ui/calendar — this is the standard shadcn "Date Picker" pattern.
// Icon-only: the date defaults to today so there's nothing to show most of the time;
// a small dot appears once a non-default date is picked, and the full date is in the title tooltip.
function DueDatePicker({ value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const isDefault = value === fmtISO(new Date());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon"
          title={value ? format(selected, 'PPP') : 'Pick a date'}
          className={cn('relative size-9 shrink-0 rounded-full', className)}>
          <CalendarIcon className="size-4" />
          {!isDefault && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected}
          onSelect={d => { if (d) { onChange(fmtISO(d)); setOpen(false); } }} />
      </PopoverContent>
    </Popover>
  );
}

// Round icon button + a tiny popover list, mirroring DueDatePicker's icon-only, dot-when-set pattern.
function AssignPicker({ users, value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const assigned = users.find(u => u.username === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon"
          title={assigned ? `Assigned to ${assigned.display_name || assigned.username}` : 'Assign to…'}
          className={cn('relative size-9 shrink-0 rounded-full', className)}>
          <UserIcon className="size-4" />
          {assigned && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <button type="button" onClick={() => { onChange(''); setOpen(false); }}
          className={cn('flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted', !value && 'font-medium text-primary')}>
          Unassigned
        </button>
        {users.map(u => (
          <button key={u.id} type="button" onClick={() => { onChange(u.username); setOpen(false); }}
            className={cn('flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted', value === u.username && 'font-medium text-primary')}>
            {u.display_name || u.username}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// NOTE: /api/projects is a guess (list of { id, name }). Confirm the real route/shape.
let projectsCache = null;   // resolved list, shared across every mount
let projectsPromise = null; // in-flight request, so parallel mounts share one fetch

function useProjectOptions() {
  const [projects, setProjects] = useState(projectsCache); // null = loading, [] = failed/empty
  useEffect(() => {
    if (projectsCache) return; // already have it
    projectsPromise ||= api('/api/projects').catch(() => []);
    projectsPromise.then(result => {
      projectsCache = result;
      setProjects(result);
    });
  }, []);
  return projects;
}

function MilestoneQuickAdd({ date, onDone }) {
  const projects = useProjectOptions();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || !projectId) return;
    setSaving(true);
    try {
      await api('/api/milestones', { method: 'POST', body: { project_id: projectId, title: title.trim(), due_date: date } });
      onDone();
    } catch (e) { showToast(e.message, 'error'); } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      {projects === null ? (
        <p className="px-2 text-xs text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="px-2 text-xs text-destructive">Couldn't load projects — check the projects API.</p>
      ) : (
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Project…" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectGroup>
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-1.5">
        <Input autoFocus placeholder="Milestone title…" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} className="h-8 flex-1 text-sm" />
        <Button size="icon-sm" className="size-8 shrink-0" disabled={!title.trim() || !projectId || saving} onClick={submit}>
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function VisitQuickAdd({ date, onDone }) {
  const projects = useProjectOptions();
  const [notes, setNotes] = useState('');
  const [projectId, setProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!projectId) return;
    setSaving(true);
    try {
      await api('/api/site-visits', { method: 'POST', body: { project_id: projectId, visit_date: date, notes: notes.trim() || undefined } });
      onDone();
    } catch (e) { showToast(e.message, 'error'); } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      {projects === null ? (
        <p className="px-2 text-xs text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="px-2 text-xs text-destructive">Couldn't load projects — check the projects API.</p>
      ) : (
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Project…" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>{projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectGroup>
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-1.5">
        <Input autoFocus placeholder="Notes (optional)…" value={notes} onChange={e => setNotes(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} className="h-8 flex-1 text-sm" />
        <Button size="icon-sm" className="size-8 shrink-0" disabled={!projectId || saving} onClick={submit}>
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState({ tasks: [], milestones: [], visits: [], orders: [] });
  const [todayTasks, setTodayTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', due_date: fmtISO(new Date()), assigned_to: '' });
  const [dayOpen, setDayOpen] = useState(null); // ISO date whose details are open
  const [me, setMe] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);
  // 'mine' | 'all' — owners/admins default to their own plate. Staff are server-side
  // restricted to their own tasks either way, so they never see the switch.
  const [taskScope, setTaskScope] = useState('mine');
  const [filterUser, setFilterUser] = useState(''); // username to filter by; only meaningful when taskScope === 'all'
  const canAssign = me && me.role !== 'user';

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'year'
  const [dragOverDate, setDragOverDate] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null); // 'task' | 'milestone' | 'visit' | null — which add-form is open in the day dialog
  const [editingId, setEditingId] = useState(null); // id of the item currently being renamed inline
  const [editValue, setEditValue] = useState('');
  const draggedTaskRef = useRef(null);

  useEffect(() => {
    api('/api/me').then(setMe).catch(() => {});
  }, []);
  useEffect(() => {
    if (canAssign) api('/api/users/assignable').then(setAssignableUsers).catch(() => {});
  }, [canAssign]);

  // Grid range: full weeks for month view (Monday start), single week for week view.
  const gridDays = useMemo(() => {
    const days = [];
    if (viewMode === 'week') {
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
      const d = new Date(start);
      for (let i = 0; i < 7; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
      return days;
    }
    if (viewMode === 'year') {
      const d = new Date(cursor.getFullYear(), 0, 1);
      const end = new Date(cursor.getFullYear(), 11, 31);
      while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
      return days;
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const d = new Date(start);
    for (let i = 0; i < 42; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return days;
  }, [cursor, viewMode]);

  function navigateCursor(dir) {
    setCursor(prev => {
      if (viewMode === 'week') { const d = new Date(prev); d.setDate(d.getDate() + dir * 7); return d; }
      if (viewMode === 'year') return new Date(prev.getFullYear() + dir, 0, 1);
      return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
    });
  }

  // Jumping straight to `new Date()` works for all three modes: month/year only read
  // getMonth()/getFullYear() off cursor, and week mode derives its start from cursor's weekday.
  function goToToday() {
    setCursor(new Date());
  }

  const loadCalendar = useCallback(async () => {
    const from = fmtISO(gridDays[0]);
    const to = fmtISO(gridDays[gridDays.length - 1]);
    setLoading(true);
    try {
      setEvents(await api(`/api/calendar?from=${from}&to=${to}&who=${taskScope}`));
    } finally {
      setLoading(false);
    }
  }, [gridDays, taskScope]);

  // The API's ?who= only supports mine|all — there's no per-user filter param — so when
  // taskScope is 'all' we fetch everyone's tasks and narrow to filterUser client-side below.
  const loadToday = useCallback(async () => {
    setTodayTasks(await api(`/api/tasks?scope=today&who=${taskScope}`));
  }, [taskScope]);

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

  // NOTE: assumes DELETE /api/tasks/:id, /api/milestones/:id, /api/site-visits/:id exist. Confirm the real routes.
  async function saveEdit(it) {
    const value = editValue.trim();
    setEditingId(null);
    const original = it.kind === 'visit' ? (it.notes || '') : it.title;
    if (value === original) return;
    if (it.kind !== 'visit' && !value) return; // task/milestone titles can't be blank
    const endpoint = it.kind === 'task' ? `/api/tasks/${it.id}`
      : it.kind === 'milestone' ? `/api/milestones/${it.id}`
      : `/api/site-visits/${it.id}`;
    const body = it.kind === 'visit' ? { notes: value || undefined } : { title: value };
    try {
      await api(endpoint, { method: 'PUT', body });
      loadCalendar(); loadToday();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function deleteEvent(kind, id) {
    const endpoint = kind === 'task' ? `/api/tasks/${id}`
      : kind === 'milestone' ? `/api/milestones/${id}`
      : `/api/site-visits/${id}`;
    try {
      await api(endpoint, { method: 'DELETE' });
      loadCalendar(); loadToday();
    } catch (e) { showToast(e.message, 'error'); }
  }

  const todayISO = fmtISO(new Date());
  const visibleTasks = taskScope === 'all' && filterUser
    ? todayTasks.filter(t => t.assigned_to === filterUser)
    : todayTasks;
  const monthLabel = viewMode === 'week'
    ? (() => {
        const start = gridDays[0];
        const end = gridDays[gridDays.length - 1];
        const sameMonth = start.getMonth() === end.getMonth();
        const startStr = start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const endStr = end.toLocaleDateString('en-IN', sameMonth ? { day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startStr} – ${endStr}`;
      })()
    : cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const visibleCount = viewMode === 'week' ? 6 : 3;
  const cellMinH = viewMode === 'week' ? 'h-[calc(100vh-22rem)] min-h-48' : 'min-h-24';

  const dayItems = byDate[dayOpen] || [];
  const dayTasks = dayItems.filter(it => it.kind === 'task');
  const dayMilestones = dayItems.filter(it => it.kind === 'milestone');
  const dayVisits = dayItems.filter(it => it.kind === 'visit');
  const dayOrders = dayItems.filter(it => it.kind === 'order');

  return (
    <div className="container flex flex-col gap-4 py-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="overflow-hidden rounded-2xl border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex w-full flex-nowrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {viewMode === 'year' ? cursor.getFullYear() : monthLabel}
              </h2>
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="h-8">
                  <TabsTrigger value="week" className="px-3 text-xs font-medium">Week</TabsTrigger>
                  <TabsTrigger value="month" className="px-3 text-xs font-medium">Month</TabsTrigger>
                  <TabsTrigger value="year" className="px-3 text-xs font-medium">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode !== 'year' && (
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
                  const isSat = d === 'Sat', isSun = d === 'Sun';
                  return (
                    <div key={d} className={cn('border-b border-border/60 px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide',
                      isSun ? 'bg-rose-500/5 text-rose-500/80' : isSat ? 'bg-muted/30 text-muted-foreground/80' : 'text-muted-foreground')}>
                      {d}
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'year' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 12 }, (_, m) => {
                  const monthDate = new Date(cursor.getFullYear(), m, 1);
                  const first = new Date(cursor.getFullYear(), m, 1);
                  const start = new Date(first);
                  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
                  const cells = [];
                  const d2 = new Date(start);
                  for (let i = 0; i < 42; i++) { cells.push(new Date(d2)); d2.setDate(d2.getDate() + 1); }
                  return (
                    <button key={m}
                      onClick={() => { setCursor(new Date(cursor.getFullYear(), m, 1)); setViewMode('month'); }}
                      className="flex flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
                      <span className="text-sm font-semibold tracking-tight text-foreground">
                        {monthDate.toLocaleDateString('en-IN', { month: 'long' })}
                      </span>
                      <div className="grid grid-cols-7 gap-0.5">
                        {cells.map((cd, i) => {
                          const iso = fmtISO(cd);
                          const inMonth = cd.getMonth() === m;
                          const isToday = iso === todayISO;
                          if (!inMonth) return <span key={i} className="size-4" />;
                          const dayKinds = EVENT_KIND_ORDER.filter(k => byDate[iso]?.some(it => it.kind === k));
                          return (
                            <span key={i} className={cn('relative flex size-4 items-center justify-center rounded-full text-[9px] font-medium leading-none',
                              dayKinds.length === 0 && 'text-muted-foreground',
                              isToday && 'font-semibold text-primary ring-2 ring-primary')}>
                              {dayKinds.length === 1 && (
                                <span className={cn('absolute inset-0 rounded-full', EVENT_KIND_LIGHT[dayKinds[0]])} />
                              )}
                              {dayKinds.length === 2 && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  {dayKinds.map(k => <span key={k} className={cn('size-2 rounded-full', EVENT_KIND_LIGHT[k])} />)}
                                </span>
                              )}
                              {dayKinds.length === 3 && (
                                <span className="absolute inset-0 flex flex-col items-center justify-between">
                                  <span className={cn('size-2 rounded-full', EVENT_KIND_LIGHT[dayKinds[0]])} />
                                  <span className="flex">
                                    {dayKinds.slice(1).map(k => <span key={k} className={cn('size-2 rounded-full', EVENT_KIND_LIGHT[k])} />)}
                                  </span>
                                </span>
                              )}
                              {dayKinds.length > 3 && (
                                <span className="absolute inset-0 grid grid-cols-2 grid-rows-2 place-items-center">
                                  {dayKinds.map(k => <span key={k} className={cn('size-2 rounded-full', EVENT_KIND_LIGHT[k])} />)}
                                </span>
                              )}
                              <span className="relative z-10">{cd.getDate()}</span>
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : loading ? (
              <div className="grid grid-cols-7 gap-1">
                {gridDays.map((d, i) => (
                  <div key={i} className={cn('animate-pulse rounded-2xl bg-muted/50', cellMinH, i >= 7 && 'border-t border-border/60')} />
                ))}
              </div>
            ) : (
              <div key={fmtISO(gridDays[0]) + viewMode}
                className="grid grid-cols-7 gap-1 animate-in fade-in duration-200">
                {gridDays.map((d, i) => {
                  const iso = fmtISO(d);
                  const inMonth = viewMode === 'week' || d.getMonth() === cursor.getMonth();
                  const isSaturday = d.getDay() === 6;
                  const isSunday = d.getDay() === 0;
                  const items = byDate[iso] || [];
                  const visible = items.slice(0, visibleCount);
                  const hidden = items.slice(visibleCount);
                  return (
                    <button
                      key={iso}
                      onClick={() => setDayOpen(iso)}
                      onDragOver={e => { if (draggedTaskRef.current) { e.preventDefault(); setDragOverDate(iso); } }}
                      onDragLeave={() => setDragOverDate(prev => (prev === iso ? null : prev))}
                      onDrop={async e => {
                        e.preventDefault();
                        const dragged = draggedTaskRef.current;
                        draggedTaskRef.current = null;
                        setDragOverDate(null);
                        if (!dragged || dragged.date === iso) return;
                        try {
                          await api(`/api/tasks/${dragged.id}`, { method: 'PUT', body: { due_date: iso } });
                          loadCalendar();
                          loadToday();
                        } catch (err) { showToast(err.message, 'error'); }
                      }}
                      className={cn('group relative flex flex-col items-center gap-1 rounded-2xl p-1.5 pt-2 text-left transition-all duration-150',
                        cellMinH,
                        i >= 7 && 'border-t border-border/60',
                        !inMonth && 'opacity-40',
                        (isSaturday || isSunday) && 'bg-muted/30',
                        'cursor-pointer hover:z-10 hover:bg-background hover:shadow-md',
                        dragOverDate === iso && 'z-10 ring-2 ring-primary ring-offset-1')}
                    >
                      <span className={cn('relative flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-colors',
                        iso === todayISO
                          ? 'font-semibold text-primary ring-2 ring-primary'
                          : isSunday
                            ? 'text-rose-500 group-hover:bg-rose-500/10'
                            : isSaturday
                              ? 'text-rose-400/80 group-hover:bg-rose-400/10'
                              : 'text-foreground group-hover:bg-primary/10')}>
                        {d.getDate()}
                        {iso === todayISO && <span className="absolute -bottom-1 size-1 rounded-full bg-primary" />}
                      </span>
                      <div className="flex w-full flex-1 flex-col gap-0.5 overflow-visible">
                        {visible.map((it, idx) => (
                          <span
                            key={idx}
                            draggable={it.kind === 'task'}
                            onDragStart={e => {
                              if (it.kind !== 'task') return;
                              e.stopPropagation();
                              draggedTaskRef.current = it;
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            className={cn('truncate rounded-full px-2 py-0.5 text-[10px] font-medium leading-4',
                              it.kind === 'task' && 'cursor-grab active:cursor-grabbing',
                              it.kind === 'task' && (it.status === 'done' ? 'bg-muted text-muted-foreground line-through' : 'bg-primary/15 text-primary'),
                              it.kind === 'milestone' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                              it.kind === 'visit' && 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
                              it.kind === 'order' && 'bg-violet-500/15 text-violet-700 dark:text-violet-400')}>
                            {it.title}
                          </span>
                        ))}
                        {hidden.length > 0 && (
                          <div className="relative">
                            <span className="peer/more block cursor-default px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                              +{hidden.length} more
                            </span>
                            <div className="invisible absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border bg-popover p-1.5 opacity-0 shadow-lg transition-all duration-150 peer-hover/more:visible peer-hover/more:opacity-100">
                              {hidden.map((it, idx) => (
                                <div key={idx} className="truncate rounded-md px-2 py-1 text-xs text-popover-foreground hover:bg-muted">
                                  {it.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Tasks', color: 'bg-primary' },
                  { label: 'Milestones', color: 'bg-amber-500' },
                  { label: 'Site visits', color: 'bg-teal-500' },
                  { label: 'Order due', color: 'bg-violet-500' },
                ].map(({ label, color }) => (
                  <span key={label} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    <span className={cn('size-2 rounded-full', color)} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => navigateCursor(-1)} aria-label="Previous">
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={goToToday} aria-label="Go to today"
                  className="bg-muted-foreground/25 font-serif text-base italic text-foreground hover:bg-muted-foreground/40">
                  t
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => navigateCursor(1)} aria-label="Next">
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex w-full flex-nowrap items-center justify-between gap-2">
              <CardTitle>Tasks</CardTitle>
              {canAssign && (
                <div className="flex items-center gap-2">
                  <Tabs value={taskScope} onValueChange={v => { setTaskScope(v); if (v === 'mine') setFilterUser(''); }}>
                    <TabsList className="h-8">
                      <TabsTrigger value="mine" className="px-3 text-xs font-medium">Mine</TabsTrigger>
                      <TabsTrigger value="all" className="px-3 text-xs font-medium">All</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {taskScope === 'all' && (
                    <Select value={filterUser || '__all__'} onValueChange={v => setFilterUser(v === '__all__' ? '' : v)}>
                      <SelectTrigger className="h-8 w-32 text-xs" aria-label="Filter by user">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="__all__">All users</SelectItem>
                          {assignableUsers.map(u => (
                            <SelectItem key={u.id} value={u.username}>{u.display_name || u.username}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Input placeholder="New task…" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && newTask.title.trim() && addTask()} className="min-w-32 flex-1" />
              <DueDatePicker value={newTask.due_date} onChange={v => setNewTask({ ...newTask, due_date: v })} />
              {canAssign && (
                <AssignPicker users={assignableUsers} value={newTask.assigned_to}
                  onChange={v => setNewTask({ ...newTask, assigned_to: v })} />
              )}
              <Button type="button" size="icon" onClick={addTask} disabled={!newTask.title.trim()} aria-label="Add task"><PlusIcon /></Button>
            </div>
            <div className="flex flex-col gap-1">
              {visibleTasks.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {taskScope === 'mine' && canAssign ? 'Nothing on your plate — check All.' : 'All clear — nothing due.'}
                </p>
              )}
              {visibleTasks.map(t => {
                const overdue = t.due_date < todayISO;
                return (
                  <div key={t.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted">
                    <Checkbox checked={t.status === 'done'} onCheckedChange={() => toggleTask(t)} />
                    {editingId === t.id ? (
                      <Input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit({ ...t, kind: 'task' })}
                        onBlur={() => saveEdit({ ...t, kind: 'task' })}
                        className="h-7 min-w-0 flex-1 text-sm" />
                    ) : (
                      <span onClick={() => { setEditingId(t.id); setEditValue(t.title); }}
                        className="min-w-0 flex-1 cursor-text truncate text-sm">{t.title}</span>
                    )}
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
      <Dialog open={!!dayOpen} onOpenChange={o => { if (!o) { setDayOpen(null); setQuickAdd(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{dayOpen ? formatDate(dayOpen) : ''}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <DaySection label="Tasks" icon={<ListTodoIcon className="size-3.5 text-primary" />}
              addColorClass="bg-primary/50 hover:bg-primary"
              count={dayTasks.length} onAdd={() => setQuickAdd(q => (q === 'task' ? null : 'task'))}>
              {dayTasks.map((it, i) => (
                <div key={i} className={cn('group flex items-center gap-2 rounded-md px-1 py-1.5 text-sm transition-colors',
                  it.status === 'done' ? 'bg-muted/50 hover:bg-muted' : 'bg-primary/10 hover:bg-primary/15')}>
                  <Checkbox checked={it.status === 'done'} onCheckedChange={() => toggleTask(it)}
  className="border-2 border-muted-foreground/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white" />
                  {editingId === it.id ? (
                    <Input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(it)} onBlur={() => saveEdit(it)}
                      className="h-6 flex-1 text-sm" />
                  ) : (
                    <span onClick={() => { setEditingId(it.id); setEditValue(it.title); }}
                      className={cn('flex-1 cursor-text truncate', it.status === 'done' && 'text-muted-foreground line-through')}>{it.title}</span>
                  )}
                  {it.client_name && <Badge variant="outline" className="shrink-0">{it.client_name}</Badge>}
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteEvent('task', it.id)} aria-label="Delete task"
                    className="size-6 shrink-0 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100">
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
              {quickAdd === 'task' && (
                <QuickAddRow placeholder="New task…" onSubmit={async (title) => {
                  try {
                    await api('/api/tasks', { method: 'POST', body: { title, due_date: dayOpen } });
                    setQuickAdd(null);
                    loadCalendar(); loadToday();
                  } catch (e) { showToast(e.message, 'error'); }
                }} />
              )}
            </DaySection>

            <DaySection label="Milestones" icon={<FolderKanbanIcon className="size-3.5 text-amber-600" />}
              addColorClass="bg-amber-500/50 hover:bg-amber-500"
              count={dayMilestones.length} onAdd={() => setQuickAdd(q => (q === 'milestone' ? null : 'milestone'))}>
              {dayMilestones.map((it, i) => (
                <div key={i} className="group flex items-center gap-2 rounded-md bg-amber-500/10 px-1 py-1.5 text-sm transition-colors hover:bg-amber-500/15">
                  {editingId === it.id ? (
                    <Input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(it)} onBlur={() => saveEdit(it)}
                      className="h-6 flex-1 text-sm" />
                  ) : (
                    <span onClick={() => { setEditingId(it.id); setEditValue(it.title); }}
                      className="flex-1 cursor-text truncate">{it.title}</span>
                  )}
                  <Link href={`/projects/${it.project_id}`} className="shrink-0 text-xs text-primary hover:underline">{it.project_name}</Link>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteEvent('milestone', it.id)} aria-label="Delete milestone"
                    className="size-6 shrink-0 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100">
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
              {quickAdd === 'milestone' && <MilestoneQuickAdd date={dayOpen} onDone={() => { setQuickAdd(null); loadCalendar(); }} />}
            </DaySection>

            <DaySection label="Site visits" icon={<MapPinIcon className="size-3.5 text-teal-600" />}
              addColorClass="bg-teal-500/50 hover:bg-teal-500"
              count={dayVisits.length} onAdd={() => setQuickAdd(q => (q === 'visit' ? null : 'visit'))}>
              {dayVisits.map((it, i) => (
                <div key={i} className="group flex items-center gap-2 rounded-md bg-teal-500/10 px-1 py-1.5 text-sm transition-colors hover:bg-teal-500/15">
                  {editingId === it.id ? (
                    <Input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(it)} onBlur={() => saveEdit(it)}
                      placeholder="Notes…" className="h-6 flex-1 text-sm" />
                  ) : (
                    <span onClick={() => { setEditingId(it.id); setEditValue(it.notes || ''); }}
                      className="flex-1 cursor-text truncate">{it.notes || 'Site visit'}</span>
                  )}
                  <Link href={`/projects/${it.project_id}`} className="shrink-0 text-xs text-primary hover:underline">{it.project_name}</Link>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteEvent('visit', it.id)} aria-label="Delete visit"
                    className="size-6 shrink-0 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100">
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              ))}
              {quickAdd === 'visit' && <VisitQuickAdd date={dayOpen} onDone={() => { setQuickAdd(null); loadCalendar(); }} />}
            </DaySection>

            <DaySection label="Order due" icon={<ArmchairIcon className="size-3.5 text-violet-600" />} count={dayOrders.length}>
              {dayOrders.map((it, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md bg-violet-500/10 px-1 py-1.5 text-sm transition-colors hover:bg-violet-500/15">
                  <span className="flex-1 truncate">{it.title}</span>
                  <Link href={`/orders/${it.id}`} className="shrink-0 text-xs text-primary hover:underline">Open</Link>
                </div>
              ))}
            </DaySection>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
