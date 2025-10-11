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
import { ChevronDown, KeyRound, Plus, RefreshCw, Trash2, ShieldAlert, Building2, Sparkles } from 'lucide-react';

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

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState<number>(ROLE_ID.USER);
  const [newBizId, setNewBizId] = useState<string>(''); // for superadmin (existing biz)
  const [newBizMode, setNewBizMode] = useState<boolean>(false); // one-shot mode
  const [newBizName, setNewBizName] = useState<string>(''); // new business name

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

  const resetCreateForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewRoleId(ROLE_ID.USER);
    setNewBizId('');
    setNewBizMode(false);
    setNewBizName('');
  };

  const handleCreate = async () => {
    try {
      setBusy(true);
      setError('');

      // SUPERADMIN: One-shot create (Business + Admin)
      if (isSuper && newBizMode) {
        if (!newBizName.trim()) {
          setError('Please enter a business name.');
          setBusy(false);
          return;
        }
        if (!newUsername.trim() || newPassword.length < 8) {
          setError('Provide username and a password with at least 8 characters.');
          setBusy(false);
          return;
        }
        // One-shot: force role to Business Admin
        await apiClient.createBusiness(newBizName.trim(), {
          username: newUsername.trim(),
          password: newPassword,
        });
        setOpenCreate(false);
        resetCreateForm();
        onRefresh();
        return;
      }

      // SUPERADMIN: create user under an existing business
      if (isSuper) {
        if (!newBizId) {
          setError('Please select a business.');
          setBusy(false);
          return;
        }
        if (!newUsername.trim() || newPassword.length < 8) {
          setError('Provide username and a password with at least 8 characters.');
          setBusy(false);
          return;
        }
        const payload = {
          username: newUsername.trim(),
          password: newPassword,
          role_id: newRoleId, // 2 BA or 3 User
          business_id: Number(newBizId),
        };
        await apiClient.createUser(payload);
        setOpenCreate(false);
        resetCreateForm();
        onRefresh();
        return;
      }

      // BUSINESS ADMIN: create user in their own business
      if (!me?.business_id) {
        setError('Your account is not linked to a business. Contact an administrator.');
        setBusy(false);
        return;
      }
      if (!newUsername.trim() || newPassword.length < 8) {
        setError('Provide username and a password with at least 8 characters.');
        setBusy(false);
        return;
      }
      const payload = {
        username: newUsername.trim(),
        password: newPassword,
        role_id: newRoleId, // BA or User (server will prevent BA from creating Superadmin anyway)
        business_id: Number(me.business_id),
      };
      await apiClient.createUser(payload);
      setOpenCreate(false);
      resetCreateForm();
      onRefresh();
    } catch (e: any) {
      console.error('❌ Create failed:', e);
      setError(e?.message || 'Failed to create');
    } finally {
      setBusy(false);
    }
  };

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
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isSuper
                        ? 'Create user (or one-shot create business + admin)'
                        : 'Create user'}
                    </DialogTitle>
                    <DialogDescription>
                      {isSuper
                        ? 'Pick an existing business, or click “Add new business” to create a business and its Business Admin in one step.'
                        : 'Provide username, password and role.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-2">
                    {isSuper && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">Business</Label>
                          <Button
                            type="button"
                            variant={newBizMode ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setNewBizMode((v) => !v)}
                          >
                            {newBizMode ? (
                              <>
                                <Building2 className="h-4 w-4 mr-1" />
                                Cancel new business
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-1" />
                                + Add new business
                              </>
                            )}
                          </Button>
                        </div>

                        {!newBizMode ? (
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
                        ) : (
                          <div className="grid gap-2">
                            <Label htmlFor="bizName">Business Name</Label>
                            <Input
                              id="bizName"
                              value={newBizName}
                              onChange={(e) => setNewBizName(e.target.value)}
                              placeholder="e.g. Acme Phones LLC"
                            />
                            <p className="text-xs text-slate-500">
                              This will create the business and a Business Admin in one step.
                            </p>
                          </div>
                        )}
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

                    {/* Role selection:
                        - Superadmin + newBizMode: force Business Admin (one-shot)
                        - Otherwise: allow BA/User
                    */}
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Select
                        value={
                          isSuper && newBizMode
                            ? String(ROLE_ID.BUSINESS_ADMIN)
                            : String(newRoleId)
                        }
                        onValueChange={(v) => setNewRoleId(Number(v))}
                        disabled={isSuper && newBizMode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(ROLE_ID.BUSINESS_ADMIN)}>Business Admin</SelectItem>
                          <SelectItem value={String(ROLE_ID.USER)}>User</SelectItem>
                        </SelectContent>
                      </Select>
                      {isSuper && newBizMode && (
                        <p className="text-xs text-slate-500">
                          One-shot creation always creates a <b>Business Admin</b>.
                        </p>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleCreate}
                      disabled={
                        busy ||
                        !newUsername.trim() ||
                        newPassword.length < 8 ||
                        (isSuper && !newBizMode && !newBizId) ||
                        (isSuper && newBizMode && !newBizName.trim())
                      }
                    >
                      {isSuper && newBizMode ? 'Create Business + Admin' : 'Create'}
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
                              {g.businessAdmin ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Business Admin: {g.businessAdmin.username}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">No Business Admin found</span>
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

        {/* Delete Dialog */}
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Reusable users table with BA highlight and actions
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
