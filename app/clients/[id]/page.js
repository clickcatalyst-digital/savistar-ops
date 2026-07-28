'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, showToast, formatDate, capitalize } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem,
} from '@/components/ui/select';
import { ArrowLeftIcon, PencilIcon, SendIcon } from 'lucide-react';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function ClientDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgProject, setMsgProject] = useState('none');
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setClient(await api(`/api/clients/${id}`)); }
    catch (e) { showToast(e.message, 'error'); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function sendMessage() {
    setBusy(true);
    try {
      await api(`/api/clients/${id}/conversations`, {
        method: 'POST',
        body: { body: msg, project_id: msgProject === 'none' ? null : Number(msgProject) },
      });
      setMsg('');
      load();
    } catch (e) { showToast(e.message, 'error'); }
    setBusy(false);
  }

  async function saveEdit() {
    setBusy(true);
    try {
      await api(`/api/clients/${id}`, { method: 'PUT', body: edit });
      showToast('Client updated');
      setEditOpen(false);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Delete ${client.name}? This removes their conversations too.`)) return;
    try {
      await api(`/api/clients/${id}`, { method: 'DELETE' });
      showToast('Client deleted');
      router.push('/clients');
    } catch (e) { showToast(e.message, 'error'); }
  }

  if (!client) return <div className="container py-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="container flex flex-col gap-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm"><Link href="/clients"><ArrowLeftIcon /></Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[client.phone, client.email, client.address].filter(Boolean).join(' · ') || 'No contact details'}
          </p>
        </div>
        <Dialog open={editOpen} onOpenChange={o => { setEditOpen(o); if (o) setEdit({ name: client.name, phone: client.phone || '', email: client.email || '', address: client.address || '', notes: client.notes || '' }); }}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><PencilIcon data-icon="inline-start" />Edit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit client</DialogTitle></DialogHeader>
            {edit && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Name</Label>
                  <Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label>Phone</Label>
                    <Input value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Email</Label>
                    <Input value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Address</Label>
                  <Input value={edit.address} onChange={e => setEdit({ ...edit, address: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Notes</Label>
                  <Textarea value={edit.notes} onChange={e => setEdit({ ...edit, notes: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" className="text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20" onClick={remove}><TrashIcon data-icon="inline-start" />Delete</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={saveEdit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {client.notes && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{client.notes}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Conversations */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Conversations</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Textarea placeholder="Log a call, meeting or message…" value={msg} onChange={e => setMsg(e.target.value)} />
              <div className="flex items-center gap-2">
                {client.projects.length > 0 && (
                  <Select value={msgProject} onValueChange={setMsgProject}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">No project</SelectItem>
                        {client.projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" onClick={sendMessage} disabled={busy || !msg.trim()} className="ml-auto">
                  <SendIcon data-icon="inline-start" />Log
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {client.conversations.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No conversations logged yet.</p>}
              {client.conversations.map(cv => (
                <div key={cv.id} className="rounded-lg border p-3">
                  <p className="whitespace-pre-wrap text-sm">{cv.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {cv.created_by || 'unknown'} · {formatDate(cv.created_at)}
                    {cv.project_name && <> · <Badge variant="outline" className="align-middle">{cv.project_name}</Badge></>}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Projects & Orders */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Savistar projects</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {client.projects.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {client.projects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  <span className="truncate font-medium">{p.name}</span>
                  <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{capitalize(p.status)}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Saag orders</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {client.orders.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {client.orders.map(o => (
                <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  <span className="truncate font-medium">{o.item} × {o.qty}</span>
                  <Badge variant={o.status === 'delivered' ? 'secondary' : 'default'}>{capitalize(o.status).replace('_', ' ')}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
