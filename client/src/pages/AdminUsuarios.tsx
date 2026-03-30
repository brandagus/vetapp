import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  Key,
  Trash2,
  Pencil,
  Users,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import { useLocation } from "wouter";

type UserItem = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: Date;
  lastSignedIn: Date;
};

export default function AdminUsuarios() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  // State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [changingPasswordFor, setChangingPasswordFor] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"user" | "admin">("user");
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Queries
  const { data: usersList, isLoading } = trpc.adminUsers.list.useQuery();

  // Mutations
  const createUser = trpc.adminUsers.create.useMutation({
    onSuccess: () => {
      toast.success("Usuario creado exitosamente");
      utils.adminUsers.list.invalidate();
      resetCreateForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateUser = trpc.adminUsers.update.useMutation({
    onSuccess: () => {
      toast.success("Usuario actualizado");
      utils.adminUsers.list.invalidate();
      setEditingUser(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const changePassword = trpc.adminUsers.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña cambiada exitosamente");
      setChangingPasswordFor(null);
      setNewPassword("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUser = trpc.adminUsers.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuario eliminado");
      utils.adminUsers.list.invalidate();
      setDeletingUser(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActive = trpc.adminUsers.update.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado");
      utils.adminUsers.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetCreateForm() {
    setShowCreateForm(false);
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("user");
    setShowCreatePassword(false);
  }

  function handleCreate() {
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      toast.error("Completá todos los campos");
      return;
    }
    createUser.mutate({
      name: createName.trim(),
      email: createEmail.trim(),
      password: createPassword,
      role: createRole,
    });
  }

  function handleEdit(user: UserItem) {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditRole(user.role);
  }

  function handleSaveEdit() {
    if (!editingUser) return;
    updateUser.mutate({
      id: editingUser.id,
      name: editName.trim() || undefined,
      email: editEmail.trim() || undefined,
      role: editRole,
    });
  }

  function handleChangePassword() {
    if (!changingPasswordFor || !newPassword.trim()) {
      toast.error("Ingresá la nueva contraseña");
      return;
    }
    changePassword.mutate({
      id: changingPasswordFor.id,
      newPassword: newPassword,
    });
  }

  function getRoleBadge(role: string) {
    if (role === "admin") {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
        <User className="h-3 w-3 mr-1" />
        Veterinaria
      </Badge>
    );
  }

  function getLoginMethodBadge(method: string | null) {
    if (method === "email") {
      return (
        <Badge variant="outline" className="text-xs">
          <Mail className="h-3 w-3 mr-1" />
          Email
        </Badge>
      );
    }
    if (method) {
      return (
        <Badge variant="outline" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          OAuth
        </Badge>
      );
    }
    return null;
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso restringido</h2>
            <p className="text-sm text-muted-foreground">
              Solo los administradores pueden acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-display flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Administrar Usuarios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Creá y gestioná las cuentas del equipo
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Crear Nuevo Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nombre completo</Label>
                <Input
                  id="create-name"
                  placeholder="Ej: María García"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="Ej: maria@email.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Rol</Label>
                <Select value={createRole} onValueChange={(v) => setCreateRole(v as "user" | "admin")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Veterinaria</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={resetCreateForm}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Usuario
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {usersList?.map((u) => {
            const isSelf = u.id === currentUser?.id;
            return (
              <Card
                key={u.id}
                className={`transition-all ${!u.isActive ? "opacity-60" : ""} ${isSelf ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base truncate">
                          {u.name || "Sin nombre"}
                        </span>
                        {isSelf && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Vos
                          </Badge>
                        )}
                        {getRoleBadge(u.role)}
                        {getLoginMethodBadge(u.loginMethod)}
                        {!u.isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {u.email || "Sin email"}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Creado: {formatDate(u.createdAt)} · Último acceso: {formatDate(u.lastSignedIn)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isSelf && (
                        <div className="flex items-center gap-2 mr-2">
                          <Label htmlFor={`active-${u.id}`} className="text-xs text-muted-foreground">
                            {u.isActive ? "Activo" : "Inactivo"}
                          </Label>
                          <Switch
                            id={`active-${u.id}`}
                            checked={u.isActive}
                            onCheckedChange={(checked) =>
                              toggleActive.mutate({ id: u.id, isActive: checked })
                            }
                          />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(u as UserItem)}
                        className="gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      {u.loginMethod === "email" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setChangingPasswordFor(u as UserItem);
                            setNewPassword("");
                            setShowNewPassword(false);
                          }}
                          className="gap-1"
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Contraseña</span>
                        </Button>
                      )}
                      {!isSelf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingUser(u as UserItem)}
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {usersList?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay usuarios registrados</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription>
              Modificá los datos de {editingUser?.name || "este usuario"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as "user" | "admin")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Veterinaria</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={!!changingPasswordFor}
        onOpenChange={(open) => {
          if (!open) {
            setChangingPasswordFor(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Nueva contraseña para {changingPasswordFor?.name || "este usuario"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangingPasswordFor(null)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={changePassword.isPending}>
              {changePassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Eliminar Usuario
            </DialogTitle>
            <DialogDescription>
              ¿Estás segura de que querés eliminar a <strong>{deletingUser?.name}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingUser && deleteUser.mutate({ id: deletingUser.id })}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
