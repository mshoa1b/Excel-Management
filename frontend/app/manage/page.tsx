'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import type { Business, User } from '@/types';
import {
  ChevronDown, KeyRound, Plus, RefreshCw, Trash2, ShieldAlert,
  Building2, KeySquare, Pencil, Trash, PlugZap
} from 'lucide-react';

const ROLE_ID = {
  SUPERADMIN: 1,
  BUSINESS_ADMIN: 2,
  USER: 3,
} as const;

type Group = {
  business: Business;
  users: User[];
  businessAdmin: User | null;
};

export default function UsersPage() {
  const { user: me, loading: authLoading } = useAuth();

  const isSuper = useMemo(
    () => (me?.role?.name || '').toLowerCase() === 'superadmin',
    [me?.role?.name]
  );

  // Shared UI state
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Business Admin view state
  const [myUsers, setMyUsers] = useState<User[]>([]);
  const [filteredMine, setFilteredMine] = useState<User[]>([]);
  const [qMine, setQMine] = useState('');

  // Superadmin view state
  const [groups, setGroups] = useState<Group[]>([]);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [qSuper, setQSuper] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);

  // Create USER dialog
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState<number>(ROLE_ID.USER);
  const [newBizId, setNewBizId] = useState<string>(''); // superadmin existing business

  // Create BUSINESS dialog (superadmin top button)
  const [openCreateBiz, setOpenCreateBiz] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bmApiKey, setBmApiKey] = useState('');
  const [bmApiSecret, setBmApiSecret] = useState('');

  // API credentials dialog (edit / BA API+)
  const [openCreds, setOpenCreds] = useState(false);
  const [credsBizId, setCredsBizId] = useState<string>('');
  const [credsBizName, setCredsBizName] = useState<string>('');
  const [credsKey, setCredsKey] = useState<string>('');     // write
  const [credsSecret, setCredsSecret] = useState<string>(''); // write
  const [credsMasked, setCredsMasked] = useState<{ key?: string | null, secret?: string | null } | null>(null);
  const [credsExists, setCredsExists] = useState<boolean>(false);

  // Password dialog
  const [openPassword, setOpenPassword] = useState(false);
  const [pwdUser, setPwdUser] = useState<User | null>(null);
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');

  // Delete dialog
  const [openDelete, setOpenDelete] = useState(false);
  const [delUser, setDelUser] = useState<User | null>(null);

  const loadForBusinessAdmin = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const list = await apiClient.getMyBusinessUsers();
      setMyUsers(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadForSuperAdmin = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const biz = await apiClient.getBusinesses();
      const bizArr: Business[] = Array.isArray(biz) ? biz : [];
      setBusinesses(bizArr);

      const usersPerBiz = await Promise.all(
        bizArr.map((b) => apiClient.getBusinessUsers(Number(b.id)))
      );

      const gs: Group[] = bizArr.map((b, idx) => {
        const us: User[] = Array.isArray(usersPerBiz[idx]) ? usersPerBiz[idx] : [];
        const ba = us.find((u) => (u.role?.name || '').toLowerCase() === 'business admin') || null;
        return { business: b, users: us, businessAdmin: ba };
      });

      setGroups(gs);
      setOpenGroups([]); // collapsed by default
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch businesses/users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return; // let ProtectedRoute handle auth spinner
    if (isSuper) void loadForSuperAdmin();
    else void loadForBusinessAdmin();
  }, [authLoading, isSuper, loadForBusinessAdmin, loadForSuperAdmin]);

  // Search filters for BA view
  useEffect(() => {
    if (isSuper) return;
    const needle = qMine.trim().toLowerCase();
    setFilteredMine(
      !needle
        ? myUsers
        : myUsers.filter(
            (u) =>
              u.username.toLowerCase().includes(needle) ||
              (u.role?.name || '').toLowerCase().includes(needle)
          )
    );
  }, [qMine, myUsers, isSuper]);

  const onRefresh = () => {
    if (isSuper) void loadForSuperAdmin();
    else void loadForBusinessAdmin();
  };

  /** ---------------- Create BUSINESS (Superadmin) ---------------- */
  const resetCreateBiz = () => {
    setBizName('');
    setBmApiKey('');
    setBmApiSecret('');
  };

  const handleCreateBusiness = async () => {
    if (!bizName.trim()) {
      setError('Please enter a business name.');
      return;
    }
    try {
      setBusy(true);
      setError('');
      const created = await apiClient.createBusiness(bizName.trim());
      // If optional API key given, upsert credentials
      if (created?.id && bmApiKey.trim()) {
        await apiClient.upsertBackMarketCreds(String(created.id), bmApiKey.trim(), bmApiSecret.trim() || undefined);
      }
      setOpenCreateBiz(false);
      resetCreateBiz();
      onRefresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to create business');
    } finally {
      setBusy(false);
    }
  };

  /** ---------------- USER creation ---------------- */
  const resetCreateUser = () => {
    setNewUsername('');
    setNewPassword('');
    setNewRoleId(ROLE_ID.USER);
    setNewBizId('');
  };

  const handleCreateUser = async () => {
    try {
      setBusy(true);
      setError('');

      if (!newUsername.trim() || newPassword.length < 8) {
        setError('Provide username and a password with at least 8 characters.');
        setBusy(false);
        return;
      }

      // Superadmin = must select business
      if (isSuper) {
        if (!newBizId) {
          setError('Please select a business.');
          setBusy(false);
          return;
        }
        const payload = {
          username: newUsername.trim(),
          password: newPassword,
          role_id: newRoleId, // 2 (BA) or 3 (User)
          business_id: Number(newBizId),
        };
        await apiClient.createUser(payload);
        setOpenCreateUser(false);
        resetCreateUser();
        onRefresh();
        return;
      }

      // Business Admin creates in own business (server enforces scope)
      await apiClient.createUser({
        username: newUsername.trim(),
        password: newPassword,
        role_id: newRoleId,
      });
      setOpenCreateUser(false);
      resetCreateUser();
      onRefresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to create user');
    } finally {
      setBusy(false);
    }
  };

  /** ---------------- API Creds dialog ---------------- */
  const openCredsForBusiness = async (bizId: string, bizName?: string) => {
    try {
      setError('');
      setBusy(true);
      setCredsBizId(bizId);
      setCredsBizName(bizName || '');
      setCredsKey('');
      setCredsSecret('');
      setCredsMasked(null);
      setCredsExists(false);

      const creds = await apiClient.getBackMarketCreds(bizId);
      // { exists: boolean, api_key_masked?, api_secret_masked? }
      if (creds?.exists) {
        setCredsExists(true);
        setCredsMasked({
          key: creds.api_key_masked || null,
          secret: creds.api_secret_masked || null,
        });
      } else {
        setCredsExists(false);
      }
      setOpenCreds(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to load API credentials');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCreds = async () => {
    try {
      setBusy(true);
      setError('');
      if (!credsBizId) return;

      if (!credsKey.trim()) {
        setError('API Key is required to save.');
        setBusy(false);
        return;
      }
      await apiClient.upsertBackMarketCreds(credsBizId, credsKey.trim(), credsSecret.trim() || undefined);
      setOpenCreds(false);
      onRefresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to save credentials');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCreds = async () => {
    try {
      setBusy(true);
      setError('');
      if (!credsBizId) return;
      await apiClient.deleteBackMarketCreds(credsBizId);
      setOpenCreds(false);
      onRefresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete credentials');
    } finally {
      setBusy(false);
    }
  };

  /** ---------------- Password / Delete ---------------- */
  const openPwdFor = (u: User) => {
    setPwdUser(u);
    setPwdNew('');
    setPwdConfirm('');
    setOpenPassword(true);
  };

  const handleChangePassword = async () => {
    if (!pwdUser) return;
    if (pwdNew.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      setBusy(true);
      setError('');
      await apiClient.setUserPassword(Number(pwdUser.id), pwdNew);
      setOpenPassword(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to update password');
    } finally {
      setBusy(false);
    }
  };

  const openDeleteFor = (u: User) => {
    setDelUser(u);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!delUser) return;
    try {
      setBusy(true);
      setError('');
      await apiClient.deleteUser(Number(delUser.id));
      setOpenDelete(false);
      setDelUser(null);
      onRefresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete user');
    } finally {
      setBusy(false);
    }
  };

  // Loading guard (uses ProtectedRoute spinner before)
  if (authLoading) {
    return null;
  }

  return (
    <ProtectedRoute requiredRole="User">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-1">Users</h1>
              <p className="text-slate-600">
                {isSuper ? 'All businesses grouped by Business Admin' : 'Users in your business'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Business Admin: API + button */}
              {!isSuper && (
                <Button
                  variant="outline"
                  onClick={() => openCredsForBusiness(String(me?.business_id || ''), me?.business?.name)}
                  title="Manage Back Market API credentials"
                >
                  <PlugZap className="h-4 w-4 mr-2" />
                  API +
                </Button>
              )}

              {/* Refresh */}
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              {/* Superadmin: New Business */}
              {isSuper && (
                <Dialog open={openCreateBiz} onOpenChange={setOpenCreateBiz}>
                  <DialogTrigger asChild>
                    <Button>
                      <Building2 className="h-4 w-4 mr-2" />
                      New Business
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Business</DialogTitle>
                      <DialogDescription>
                        Business name is required. Back Market API credentials are optional and can be added later.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="bizName">Business Name</Label>
                        <Input
                          id="bizName"
                          value={bizName}
                          onChange={(e) => setBizName(e.target.value)}
                          placeholder="e.g. Acme Phones LLC"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Back Market API Key (optional)</Label>
                        <Input
                          value={bmApiKey}
                          onChange={(e) => setBmApiKey(e.target.value)}
                          placeholder="Enter API key (optional)"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Back Market API Secret (optional)</Label>
                        <Input
                          value={bmApiSecret}
                          onChange={(e) => setBmApiSecret(e.target.value)}
                          placeholder="Enter API secret (optional)"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={handleCreateBusiness}
                        disabled={busy || !bizName.trim()}
                      >
                        Create Business
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* New User */}
              <Dialog open={openCreateUser} onOpenChange={setOpenCreateUser}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create user</DialogTitle>
                    <DialogDescription>
                      Provide username, password and role. Superadmin must select a business.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-2">
                    {isSuper && (
                      <div className="grid gap-2">
                        <Label>Business</Label>
                        <Select value={newBizId} onValueChange={setNewBizId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select business" />
                          </SelectTrigger>
                          <SelectContent>
                            {businesses.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.name} (ID {b.id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="jane.doe"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Select value={String(newRoleId)} onValueChange={(v) => setNewRoleId(Number(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(ROLE_ID.BUSINESS_ADMIN)}>Business Admin</SelectItem>
                          <SelectItem value={String(ROLE_ID.USER)}>User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleCreateUser}
                      disabled={
                        busy ||
                        !newUsername.trim() ||
                        newPassword.length < 8 ||
                        (isSuper && !newBizId)
                      }
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <span className="truncate">{error}</span>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Retry
              </Button>
            </div>
          )}

          {/* Business Admin view */}
          {!isSuper && (
            <Card className="hover:shadow-sm transition-shadow duration-200">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="w-full">Users in your business</CardTitle>
                <div className="w-full max-w-xs">
                  <Input
                    value={qMine}
                    onChange={(e) => setQMine(e.target.value)}
                    placeholder="Search by username or role"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <UsersTable
                  users={filteredMine}
                  meId={me?.id}
                  onEditPwd={openPwdFor}
                  onDelete={openDeleteFor}
                />
              </CardContent>
            </Card>
          )}

          {/* Superadmin view */}
          {isSuper && (
            <Accordion
              type="multiple"
              value={openGroups}
              onValueChange={(v) => setOpenGroups(v as string[])}
              className="space-y-3"
            >
              <div className="w-full max-w-md ml-auto">
                <Input
                  value={qSuper}
                  onChange={(e) => setQSuper(e.target.value)}
                  placeholder="Global search username/role within groups"
                />
              </div>

              {groups.map((g) => {
                const needle = qSuper.trim().toLowerCase();
                const visibleUsers = !needle
                  ? g.users
                  : g.users.filter(
                      (u) =>
                        u.username.toLowerCase().includes(needle) ||
                        (u.role?.name || '').toLowerCase().includes(needle)
                    );

                return (
                  <Card key={g.business.id} className="hover:shadow-sm transition-shadow duration-200">
                    <AccordionItem value={String(g.business.id)} className="border-none">
                      <CardHeader className="p-0">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronDown className="h-4 w-4 opacity-60" />
                              <CardTitle className="text-lg">
                                {g.business.name} — ID {g.business.id}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCredsForBusiness(String(g.business.id), g.business.name);
                                }}
                                title="Edit Back Market API credentials"
                              >
                                <KeySquare className="h-4 w-4 mr-1" />
                                Edit API
                              </Button>
                              {g.businessAdmin ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Business Admin: {g.businessAdmin.username}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500"></span>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                      </CardHeader>
                      <AccordionContent>
                        <CardContent className="pt-2">
                          <UsersTable
                            users={visibleUsers}
                            meId={me?.id}
                            businessAdminId={g.businessAdmin?.id}
                            onEditPwd={openPwdFor}
                            onDelete={openDeleteFor}
                          />
                        </CardContent>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                );
              })}
            </Accordion>
          )}
        </div>

        {/* Change Password Dialog */}
        <Dialog open={openPassword} onOpenChange={setOpenPassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>
                {pwdUser ? `User: ${pwdUser.username}` : 'N/A'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="pwdNew">New password</Label>
                <Input
                  id="pwdNew"
                  type="password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pwdConfirm">Confirm password</Label>
                <Input
                  id="pwdConfirm"
                  type="password"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  placeholder="Re enter the password"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleChangePassword}
                disabled={busy || pwdNew.length < 8 || pwdNew !== pwdConfirm}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={openDelete} onOpenChange={setOpenDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete user</DialogTitle>
              <DialogDescription>This action is permanent.</DialogDescription>
            </DialogHeader>
            <div className="py-1">
              <p className="text-sm">
                User: <span className="font-medium">{delUser?.username || 'N/A'}</span>
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete} disabled={busy}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Back Market API Credentials Dialog */}
        <Dialog open={openCreds} onOpenChange={setOpenCreds}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Back Market API {credsBizName ? `— ${credsBizName}` : ''}
              </DialogTitle>
              <DialogDescription>
                Add or update credentials. Deleting removes them entirely.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {credsExists && credsMasked && (
                <div className="rounded-md border p-3 text-sm bg-slate-50">
                  <div className="mb-1 text-slate-600">Current (masked):</div>
                  <div>API Key: <span className="font-mono">{credsMasked.key || '—'}</span></div>
                  <div>API Secret: <span className="font-mono">{credsMasked.secret || '—'}</span></div>
                </div>
              )}

              <div className="grid gap-2">
                <Label>API Key {credsExists ? '(leave empty to keep current)' : '(required to save)'}</Label>
                <Input
                  value={credsKey}
                  onChange={(e) => setCredsKey(e.target.value)}
                  placeholder={credsExists ? '••••• (optional if not changing)' : 'Enter API key'}
                />
              </div>

              <div className="grid gap-2">
                <Label>API Secret (optional)</Label>
                <Input
                  value={credsSecret}
                  onChange={(e) => setCredsSecret(e.target.value)}
                  placeholder={credsExists ? '••••• (optional if not changing)' : 'Enter API secret (optional)'}
                />
              </div>
            </div>

            <DialogFooter className="justify-between">
              <div>
                {credsExists && (
                  <Button variant="destructive" onClick={handleDeleteCreds} disabled={busy}>
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={handleSaveCreds} disabled={busy || (!credsKey.trim() && !credsExists)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

/** ---------- Reusable Users Table ---------- */
function UsersTable({
  users,
  meId,
  businessAdminId,
  onEditPwd,
  onDelete,
}: {
  users: User[];
  meId?: string;
  businessAdminId?: string | number;
  onEditPwd: (u: User) => void;
  onDelete: (u: User) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">ID</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right w-[260px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-slate-500 py-6">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          users.map((u) => {
            const isBA = businessAdminId != null && String(u.id) === String(businessAdminId);
            return (
              <TableRow
                key={u.id}
                className={isBA ? 'bg-blue-50/60 hover:bg-blue-50/80' : undefined}
              >
                <TableCell>{u.id}</TableCell>
                <TableCell className="font-medium">{u.username || 'N/A'}</TableCell>
                <TableCell>
                  <span
                    className={
                      isBA
                        ? 'inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 border border-blue-200'
                        : 'text-slate-700'
                    }
                  >
                    {u.role?.name || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEditPwd(u)}>
                      <KeyRound className="h-4 w-4 mr-1" />
                      Edit Password
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(u)}
                      disabled={String(u.id) === String(meId)}
                      title={String(u.id) === String(meId) ? 'You cannot delete yourself' : 'Delete user'}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
