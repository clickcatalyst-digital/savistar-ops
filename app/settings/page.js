'use client';

import { useEffect, useState } from 'react';
import { api, showToast, capitalize } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { PlusIcon, KeyRoundIcon, Trash2Icon } from 'lucide-react';

const EMPTY = { username: '', password: '', display_name: '', role: 'user' };

export default function SettingsPage() {
  const [users, setUsers] = useState([]);
  const [forbidden, setForbidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [pwFor, setPwFor] = useState(null);
  const [pw, setPw] = useState('');

  async function load() {
    try {
      setUsers(await api('/api/users'));
      setForbidden(false);
    } catch {
      setForbidden(true);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    try {
      await api('/api/users', { method: 'POST', body: form });
      showToast('User created');
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    setBusy(false);
  }

  async function setRole(u, role) {
    await api(`/api/users/${u.id}`, { method: 'PUT', body: { role } });
    load();
  }

  async function toggleActive(u) {
    await api(`/api/users/${u.id}`, { method: 'PUT', body: { active: !u.active } });
    load();
  }

  async function changePw() {
    setBusy(true);
    try {
      await api(`/api/users/${pwFor.id}`, { method: 'PUT', body: { password: pw } });
      showToast('Password changed');
      setPwFor(null);
      setPw('');
    } catch (e) { showToast(e.message, 'error'); }
    setBusy(false);
  }

  async function remove(u) {
    if (!confirm(`Delete user ${u.username}?`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  if (forbidden) {
    return (
      <div className="container py-10">
        <p className="text-center text-muted-foreground">Only admins and managers can manage users.</p>
      </div>
    );
  }

  return (
    <div className="container flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Users & access</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><PlusIcon data-icon="inline-start" />Add user</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New user</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Username</Label>
                  <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Display name</Label>
                  <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="user">Staff</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={busy || !form.username.trim() || !form.password}>{busy ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Staff can use every tab; only admins and managers can delete records or manage users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className="group">
                  <TableCell>
                    <span className="font-medium">{u.display_name || u.username}</span>
                    <span className="ml-2 text-xs text-muted-foreground">@{u.username}</span>
                  </TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={v => setRole(u, v)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="user">Staff</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleActive(u)}>
                      <Badge variant={u.active ? 'secondary' : 'destructive'}>{u.active ? 'Active' : 'Deactivated'}</Badge>
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => setPwFor(u)} aria-label="Change password"><KeyRoundIcon /></Button>
                    <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" onClick={() => remove(u)} aria-label="Delete user">
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!pwFor} onOpenChange={o => !o && setPwFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change password — {pwFor?.username}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>New password</Label>
            <Input type="password" value={pw} onChange={e => setPw(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwFor(null)}>Cancel</Button>
            <Button onClick={changePw} disabled={busy || !pw}>Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
