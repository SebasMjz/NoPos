import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Phone, Building2, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../store';
import { formatCurrency } from '../components/format';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { exportToExcel } from '../utils/exportExcel';
import { Pagination } from '../components/Pagination';
import type { Customer } from '../types';

const emptyForm: Omit<Customer, 'id' | 'totalPurchases' | 'visits' | 'createdAt'> = {
  name: '',
  phone: '',
  company: '',
};

export function CustomersView() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.toLowerCase().includes(search.toLowerCase()) ||
        (c.company ?? '').toLowerCase().includes(search.toLowerCase()),
    );
  }, [customers, search]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);


  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      phone: c.phone,
      company: c.company ?? '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name || !form.phone) return;
    if (editingId) {
      updateCustomer(editingId, form);
    } else {
      addCustomer(form);
    }
    setModalOpen(false);
  };

  const handleExportToExcel = () => {
    const headers = ['ID', 'Nombre', 'Celular', 'Empresa', 'Compras Totales (Bs.)', 'Visitas', 'Fecha Registro'];
    const rows = filtered.map((c) => [
      c.id,
      c.name,
      c.phone,
      c.company ?? '',
      c.totalPurchases,
      c.visits,
      c.createdAt,
    ]);
    exportToExcel('Cartera_Clientes', headers, rows);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Clientes</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{customers.length}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Compras Totales</p>
          <p className="text-xl font-bold text-brand-600 mt-0.5">
            {formatCurrency(customers.reduce((s, c) => s + c.totalPurchases, 0))}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Visitas Registradas</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">
            {customers.reduce((s, c) => s + c.visits, 0)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por número de celular, nombre o empresa..."
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
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {paginatedCustomers.map((c) => (
            <div key={c.id} className="card card-hover p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-brand-500/20">
                    {c.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-900 text-xs">{c.name}</h4>
                    {c.company && <p className="text-[11px] text-ink-500 font-medium">{c.company}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c)}
                    className="p-1 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-ink-800 font-medium">
                  <Phone size={13} className="text-brand-500 shrink-0" />
                  <span>Celular: {c.phone}</span>
                </div>
                {c.company && (
                  <div className="flex items-center gap-2 text-ink-600 text-[11px]">
                    <Building2 size={13} className="text-ink-400 shrink-0" />
                    <span>{c.company}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-ink-50">
                <div>
                  <p className="text-[10px] text-ink-400">Compras acumuladas</p>
                  <p className="text-xs font-bold text-ink-900">{formatCurrency(c.totalPurchases)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-ink-400">Visitas</p>
                  <Badge color="blue">{c.visits}</Badge>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-ink-400">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              No se encontraron clientes
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={[6, 12, 24, 48]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>


      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label text-xs">Nombre Completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input text-xs"
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label className="label text-xs">Número de Celular</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input pl-8 text-xs"
                placeholder="70000000"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Empresa / Negocio (opcional)</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="input text-xs"
              placeholder="Nombre de empresa"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1 text-xs">
            Cancelar
          </button>
          <button onClick={save} className="btn-primary flex-1 text-xs font-bold">
            {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Cliente"
        size="sm"
      >
        <p className="text-xs text-ink-600">
          ¿Seguro que deseas eliminar a <strong>{confirmDelete?.name}</strong>?
        </p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 text-xs">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) deleteCustomer(confirmDelete.id);
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
