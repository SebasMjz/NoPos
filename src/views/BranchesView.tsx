import { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Warehouse,
  Wrench,
  Store,
  MapPin,
  Phone,
  ArrowRightLeft,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { useStore } from '../store';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { posSound } from '../utils/sound';
import type { Branch } from '../types';

export function BranchesView() {
  const { branches, products, movements, addBranch, updateBranch, deleteBranch } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<Branch['type']>('tienda');
  const [formCity, setFormCity] = useState('La Paz');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formIsMain, setFormIsMain] = useState(false);

  const paginatedBranches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return branches.slice(start, start + pageSize);
  }, [branches, currentPage, pageSize]);

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormCode(`SUC-${String(branches.length + 1).padStart(2, '0')}`);
    setFormType('tienda');
    setFormCity('La Paz');
    setFormAddress('');
    setFormPhone('');
    setFormIsMain(false);
    setModalOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditingId(b.id);
    setFormName(b.name);
    setFormCode(b.code);
    setFormType(b.type);
    setFormCity(b.city);
    setFormAddress(b.address);
    setFormPhone(b.phone);
    setFormIsMain(b.isMain);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      alert('Nombre y código de sucursal son requeridos');
      return;
    }

    if (editingId) {
      updateBranch(editingId, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        type: formType,
        city: formCity.trim(),
        address: formAddress.trim(),
        phone: formPhone.trim(),
        isMain: formIsMain,
      });
    } else {
      addBranch({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        type: formType,
        city: formCity.trim(),
        address: formAddress.trim(),
        phone: formPhone.trim(),
        isMain: formIsMain,
        active: true,
      });
    }

    posSound.playSuccessChime();
    setModalOpen(false);
  };

  const getTypeIcon = (type: Branch['type']) => {
    switch (type) {
      case 'deposito':
        return Warehouse;
      case 'taller':
        return Wrench;
      default:
        return Store;
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3.5">
          <p className="text-xs text-ink-500 font-medium">Total Sucursales / Almacenes</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5">{branches.length}</p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Store size={14} className="text-brand-600" />
            <span className="text-xs text-ink-500 font-medium">Tiendas de Venta</span>
          </div>
          <p className="text-xl font-bold text-brand-600">
            {branches.filter((b) => b.type === 'tienda').length}
          </p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Warehouse size={14} className="text-purple-600" />
            <span className="text-xs text-ink-500 font-medium">Depósitos Centrales</span>
          </div>
          <p className="text-xl font-bold text-purple-600">
            {branches.filter((b) => b.type === 'deposito').length}
          </p>
        </div>
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Wrench size={14} className="text-amber-500" />
            <span className="text-xs text-ink-500 font-medium">Talleres & RMA</span>
          </div>
          <p className="text-xl font-bold text-amber-600">
            {branches.filter((b) => b.type === 'taller').length}
          </p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-ink-900">Red de Bodegas & Puntos de Venta</h3>
          <p className="text-xs text-ink-500">
            Gestión de stock distribuido y trazabilidad de transferencias
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs py-1.5 px-3 font-bold flex items-center gap-1.5">
          <Plus size={15} /> Nueva Sucursal / Bodega
        </button>
      </div>

      {/* Branches Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {branches.map((b) => {
          const Icon = getTypeIcon(b.type);
          return (
            <div
              key={b.id}
              className="card p-4 bg-white border border-ink-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                  <div className="flex items-center gap-1">
                    {b.isMain && (
                      <Badge color="purple">Casa Matriz</Badge>
                    )}
                    <Badge color={b.type === 'tienda' ? 'blue' : b.type === 'deposito' ? 'amber' : 'green'}>
                      {b.type === 'tienda' ? 'Tienda' : b.type === 'deposito' ? 'Bodega' : 'Taller'}
                    </Badge>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-ink-900 line-clamp-1">{b.name}</h4>
                <p className="text-[11px] font-mono text-ink-400 font-semibold mb-2">Código: {b.code}</p>

                <div className="space-y-1 text-xs text-ink-600 border-t border-ink-50 pt-2">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-ink-400 shrink-0" />
                    <span className="truncate">{b.city} - {b.address}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} className="text-ink-400 shrink-0" />
                    <span>{b.phone || 'Sin teléfono'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-ink-100">
                <button
                  onClick={() => openEdit(b)}
                  className="btn-secondary flex-1 py-1 text-xs"
                >
                  <Pencil size={12} /> Editar
                </button>
                {!b.isMain && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la sucursal "${b.name}"?`)) {
                        deleteBranch(b.id);
                      }
                    }}
                    className="p-1 rounded text-ink-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Create / Edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Sucursal / Almacén' : 'Crear Nueva Sucursal / Bodega'}
        subtitle="Configura la ubicación, tipo de establecimiento y parámetros operativos"
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Nombre de Sucursal</label>
              <input
                type="text"
                placeholder="Ej. Sucursal San Miguel"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-xs">Código Interno</label>
              <input
                type="text"
                placeholder="Ej. SMG-03"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="input text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Tipo de Establecimiento</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as Branch['type'])}
                className="input text-xs"
              >
                <option value="tienda">Punto de Venta / Tienda</option>
                <option value="deposito">Depósito Central / Bodega</option>
                <option value="taller">Laboratorio / Taller RMA</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Ciudad / Departamento</label>
              <input
                type="text"
                placeholder="Ej. Santa Cruz, La Paz..."
                required
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs">Dirección Completa</label>
            <input
              type="text"
              placeholder="Av. Principal #123, Zona Centro"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Teléfono / Celular</label>
              <input
                type="text"
                placeholder="+591 2 2441020"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="input text-xs"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsMain}
                  onChange={(e) => setFormIsMain(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="font-semibold text-ink-800">Es Casa Matriz</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1 font-bold">
              Guardar Sucursal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
