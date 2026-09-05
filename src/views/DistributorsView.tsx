import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Truck, Search, Phone, MapPin, User, FileText, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../store';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { exportToExcel } from '../utils/exportExcel';
import type { Supplier } from '../types';

const emptyForm: Omit<Supplier, 'id' | 'createdAt'> = {
  name: '',
  contactName: '',
  phone: '',
  city: 'La Paz',
  address: '',
  notes: '',
};

const cities = ['La Paz', 'Santa Cruz', 'Cochabamba', 'El Alto', 'Tarija', 'Oruro', 'Sucre', 'Potosí'];

export function DistributorsView() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.contactName.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase()) ||
        (s.notes ?? '').toLowerCase().includes(search.toLowerCase()),
    );
  }, [suppliers, search]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      city: s.city,
      address: s.address ?? '',
      notes: s.notes ?? '',
    });
    setEditingId(s.id);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name || !form.phone) return;
    if (editingId) {
      updateSupplier(editingId, form);
    } else {
      addSupplier(form);
    }
    setModalOpen(false);
  };

  const handleExportToExcel = () => {
    const headers = ['ID', 'Empresa / Distribuidor', 'Persona de Contacto', 'Teléfono / Celular', 'Ciudad', 'Dirección', 'Notas'];
    const rows = filtered.map((s) => [
      s.id,
      s.name,
      s.contactName,
      s.phone,
      s.city,
      s.address ?? '',
      s.notes ?? '',
    ]);
    exportToExcel('Distribuidores_Proveedores', headers, rows);
  };

  const uniqueCities = new Set(suppliers.map((s) => s.city)).size;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Distribuidores</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{suppliers.length}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Ciudades de Cobertura</p>
          <p className="text-xl font-bold text-brand-600 mt-0.5">{uniqueCities}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Contactos Registrados</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">
            {suppliers.filter((s) => Boolean(s.contactName)).length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, contacto, celular o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleExportToExcel}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold text-emerald-700 hover:bg-emerald-50"
            title="Exportar a Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-1.5 px-3 font-bold">
            <Plus size={15} />
            Nuevo Distribuidor
          </button>
        </div>
      </div>

      {/* Cards grid with Scroll */}
      <div className="max-h-[calc(100vh-17rem)] overflow-y-auto pr-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="card card-hover p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
                      <Truck size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-ink-900 text-xs leading-snug">{s.name}</h4>
                      <Badge color="blue">{s.city}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(s)}
                      className="p-1 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs mt-3">
                  <div className="flex items-center gap-2 text-ink-700 font-medium">
                    <User size={13} className="text-brand-500 shrink-0" />
                    <span>{s.contactName || 'Sin contacto directo'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-600">
                    <Phone size={13} className="text-ink-400 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                  {s.address && (
                    <div className="flex items-center gap-2 text-ink-600">
                      <MapPin size={13} className="text-ink-400 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                  {s.notes && (
                    <div className="flex items-start gap-1.5 text-ink-500 text-[11px] mt-2 pt-1.5 border-t border-ink-100">
                      <FileText size={12} className="text-ink-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{s.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-ink-400">
              <Truck size={32} className="mx-auto mb-2 opacity-40" />
              No se encontraron distribuidores
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
        size="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label text-xs">Nombre de la Empresa / Distribuidor</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input text-xs"
              placeholder="Ej. Importadora Tech Bolivia S.R.L."
            />
          </div>
          <div>
            <label className="label text-xs">Persona de Contacto</label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="input text-xs"
              placeholder="Nombre de contacto"
            />
          </div>
          <div>
            <label className="label text-xs">Teléfono / Celular</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input text-xs"
              placeholder="70000000"
            />
          </div>
          <div>
            <label className="label text-xs">Ciudad</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input text-xs"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Dirección (opcional)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input text-xs"
              placeholder="Av. Principal #123"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs">Notas / Observaciones</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[60px] resize-none text-xs"
              placeholder="Marcas que distribuye, condiciones de crédito, etc."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1 text-xs">
            Cancelar
          </button>
          <button onClick={save} className="btn-primary flex-1 text-xs font-bold">
            {editingId ? 'Guardar Cambios' : 'Crear Distribuidor'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Distribuidor"
        size="sm"
      >
        <p className="text-xs text-ink-600">
          ¿Seguro que deseas eliminar el distribuidor <strong>{confirmDelete?.name}</strong>?
        </p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 text-xs">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) deleteSupplier(confirmDelete.id);
              setConfirmDelete(null);
            }}
            className="btn-danger flex-1 text-xs font-bold"
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
