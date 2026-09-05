import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, UserCog, Search, Shield, Store, ShoppingCart } from 'lucide-react';
import { useStore } from '../store';
import { formatDate } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import type { User } from '../types';

const roles: User['role'][] = ['Administrador', 'Gerente', 'Vendedor', 'Cajero'];

const roleConfig: Record<User['role'], { color: 'purple' | 'blue' | 'green' | 'amber'; icon: typeof Shield }> = {
  Administrador: { color: 'purple', icon: Shield },
  Gerente: { color: 'blue', icon: Store },
  Vendedor: { color: 'green', icon: ShoppingCart },
  Cajero: { color: 'amber', icon: ShoppingCart },
};

const emptyForm: Omit<User, 'id' | 'lastLogin'> = {
  name: '',
  email: '',
  role: 'Vendedor',
  status: 'Activo',
};

export function UsersView() {
  const { users, addUser, updateUser, deleteUser } = useStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const filtered = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [users, search]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, role: u.role, status: u.status });
    setEditingId(u.id);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name || !form.email) return;
    if (editingId) {
      updateUser(editingId, form);
    } else {
      addUser(form);
    }
    setModalOpen(false);
  };

  const activeCount = users.filter((u) => u.status === 'Activo').length;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-ink-500">Total Usuarios</p>
          <p className="text-2xl font-bold text-ink-900">{users.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-ink-500">Activos</p>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-ink-500">Inactivos</p>
          <p className="text-2xl font-bold text-ink-400">{users.length - activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-ink-500">Administradores</p>
          <p className="text-2xl font-bold text-ink-900">
            {users.filter((u) => u.role === 'Administrador').length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} />
          Nuevo Usuario
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-ink-50 border-b border-ink-100">
              <tr>
                <th className="table-header">Usuario</th>
                <th className="table-header">Rol</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Último Acceso</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((u) => {
                const rc = roleConfig[u.role];
                const RIcon = rc.icon;
                return (
                  <tr key={u.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ink-300 to-ink-500 flex items-center justify-center text-white text-sm font-bold">
                          {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-ink-800">{u.name}</p>
                          <p className="text-xs text-ink-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge color={rc.color}>
                        <RIcon size={12} />
                        {u.role}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <Badge color={u.status === 'Activo' ? 'green' : 'gray'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-ink-500 text-xs">{u.lastLogin}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-ink-400">
                    <UserCog size={32} className="mx-auto mb-2 opacity-40" />
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre Completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Nombre del usuario"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="email@nopos.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
                className="input"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as User['status'] })}
                className="input"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={save} className="btn-primary flex-1">
            {editingId ? 'Guardar' : 'Crear Usuario'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Usuario"
        size="sm"
      >
        <p className="text-sm text-ink-600">
          ¿Seguro que deseas eliminar a <strong>{confirmDelete?.name}</strong>?
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) deleteUser(confirmDelete.id);
              setConfirmDelete(null);
            }}
            className="btn-danger flex-1"
          >
            <Trash2 size={16} />
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
