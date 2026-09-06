import { useState } from 'react';
import {
  Settings,
  Building,
  Printer,
  QrCode,
  Volume2,
  VolumeX,
  ShieldCheck,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Save,
  Bell,
  Sparkles,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { useStore } from '../store';
import { posSound } from '../utils/sound';
import type { SystemSettings } from '../types';

export function SettingsView() {
  const {
    systemSettings,
    updateSystemSettings,
    products,
    suppliers,
    customers,
    movements,
    sales,
    branches,
    creditAccounts,
    restoreDatabase,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'company' | 'hardware' | 'inventory' | 'backup'>(
    'company',
  );
  const [settings, setSettings] = useState<SystemSettings>(systemSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFieldChange = <K extends keyof SystemSettings>(key: K, val: SystemSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setSaveSuccess(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings(settings);
    posSound.setEnabled(settings.scannerBeepEnabled);
    posSound.playSuccessChime();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestScannerSound = () => {
    posSound.playScannerBeep();
  };

  const handleTestSuccessChime = () => {
    posSound.playSuccessChime();
  };

  // Export full DB backup JSON
  const handleExportBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      systemVersion: 'NoPosTech Enterprise v3.2.0',
      systemSettings: settings,
      products,
      suppliers,
      customers,
      movements,
      sales,
      branches,
      creditAccounts,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `NoPosTech_Backup_Enterprise_${new Date().toISOString().split('T')[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    posSound.playSuccessChime();
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Formato JSON inválido.');
        }

        restoreDatabase(parsed);
        if (parsed.systemSettings) {
          setSettings(parsed.systemSettings);
        }
        posSound.playSuccessChime();
        alert('✓ ¡Copia de seguridad restaurada con éxito!');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo de respaldo.';
        setImportError(msg);
        posSound.playErrorAlert();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 animate-slide-up max-w-6xl mx-auto">
      {/* Enterprise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-ink-900 to-brand-950 p-5 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-brand-500/30 text-brand-300 border border-brand-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} /> Enterprise Suite
            </span>
            <span className="text-xs text-ink-300 font-mono">v3.2 PRO</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">Centro de Control & Configuración</h2>
          <p className="text-xs text-ink-300">
            Ajustes globales de facturación, periféricos de hardware, políticas de seriales y backups
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="btn-primary bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs py-2 px-4 shadow-md flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Save size={15} />
          {saveSuccess ? '¡Cambios Guardados!' : 'Guardar Parámetros'}
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex bg-white p-1.5 rounded-xl border border-ink-200 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'company'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
              : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          <Building size={15} className={activeTab === 'company' ? 'text-brand-600' : 'text-ink-400'} />
          Empresa & Facturación
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'hardware'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
              : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          <Printer size={15} className={activeTab === 'hardware' ? 'text-brand-600' : 'text-ink-400'} />
          Hardware & Escáner POS
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'inventory'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
              : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          <ShieldCheck size={15} className={activeTab === 'inventory' ? 'text-brand-600' : 'text-ink-400'} />
          Políticas de Inventario & SN
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'backup'
              ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
              : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          <Database size={15} className={activeTab === 'backup' ? 'text-brand-600' : 'text-ink-400'} />
          Respaldo & Base de Datos
        </button>
      </div>

      {/* Main Settings Content */}
      <div className="card p-6 bg-white border border-ink-200 space-y-6">
        {/* Tab 1: Company & Billing */}
        {activeTab === 'company' && (
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-ink-900 border-b border-ink-100 pb-2">
              Identidad Comercial y Datos Fiscales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Razón Social / Nombre Comercial</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => handleFieldChange('companyName', e.target.value)}
                  className="input text-xs font-bold"
                />
              </div>

              <div>
                <label className="label text-xs">NIT / RUC / Identificación Fiscal</label>
                <input
                  type="text"
                  value={settings.nitRfc}
                  onChange={(e) => handleFieldChange('nitRfc', e.target.value)}
                  className="input text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="label text-xs">Ciudad & País</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs">Dirección Matriz</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs">Teléfonos de Contacto</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs">Correo Electrónico Comercial</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            <h3 className="text-sm font-bold text-ink-900 border-b border-ink-100 pb-2 pt-2">
              Moneda e Impuestos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label text-xs">Símbolo de Moneda</label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) => handleFieldChange('currencySymbol', e.target.value)}
                  className="input text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="label text-xs">Nombre de Moneda</label>
                <input
                  type="text"
                  value={settings.currencyName}
                  onChange={(e) => handleFieldChange('currencyName', e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label text-xs">Tasa de Impuesto / IVA (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.taxRate}
                  onChange={(e) => handleFieldChange('taxRate', parseFloat(e.target.value) || 0)}
                  className="input text-xs font-bold font-mono"
                />
              </div>
            </div>

            <h3 className="text-sm font-bold text-ink-900 border-b border-ink-100 pb-2 pt-2">
              Textos de Comprobantes y Tickets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Encabezado de Ticket (Impresión Térmica)</label>
                <textarea
                  rows={3}
                  value={settings.receiptHeader}
                  onChange={(e) => handleFieldChange('receiptHeader', e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>

              <div>
                <label className="label text-xs">Pie de Página / Leyenda de Garantía</label>
                <textarea
                  rows={3}
                  value={settings.receiptFooter}
                  onChange={(e) => handleFieldChange('receiptFooter', e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Hardware & POS Peripherals */}
        {activeTab === 'hardware' && (
          <div className="space-y-5 text-xs">
            <h3 className="text-sm font-bold text-ink-900 border-b border-ink-100 pb-2">
              Pistola Lectora de Códigos de Barra / QR
            </h3>

            <div className="p-4 bg-ink-50 rounded-xl border border-ink-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink-900">Feedback Sonoro (Beep de Escáner)</p>
                  <p className="text-ink-500 text-[11px]">
                    Emite un pitido de confirmación sonora instantáneo vía Web Audio API al leer seriales o códigos
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.scannerBeepEnabled}
                    onChange={(e) => handleFieldChange('scannerBeepEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:width-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>

              <div className="pt-2 border-t border-ink-200/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestScannerSound}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-brand-700 bg-white"
                >
                  <Volume2 size={14} className="text-brand-600" />
                  Probar Pitido de Escáner (Laser Beep)
                </button>
                <button
                  type="button"
                  onClick={handleTestSuccessChime}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold text-emerald-700 bg-white"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Probar Chime de Transacción Exitosa
                </button>
              </div>
            </div>

            <h3 className="text-sm font-bold text-ink-900 border-b border-ink-100 pb-2 pt-2">
              Impresoras Térmicas POS (Recibos / Tickets)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => handleFieldChange('paperWidth', '80mm')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.paperWidth === '80mm'
                    ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                    : 'border-ink-200 bg-white hover:border-ink-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-ink-900">Formato Estándar 80mm</span>
                  {settings.paperWidth === '80mm' && (
                    <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-ink-500">
                  Recomendado para impresoras Epson TM-T20, Bixolon, Xprinter 80mm con detalle completo
                </p>
              </div>

              <div
                onClick={() => handleFieldChange('paperWidth', '58mm')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.paperWidth === '58mm'
                    ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                    : 'border-ink-200 bg-white hover:border-ink-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-ink-900">Formato Compacto 58mm</span>
                  {settings.paperWidth === '58mm' && (
                    <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-ink-500">
                  Para impresoras portátiles Bluetooth de 58mm o puntos de venta móviles
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Inventory & Serial Number Policies */}
        {activeTab === 'inventory' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-ink-900 border-b border-ink-100 pb-2">
              Reglas de Control de Stock y Seriales
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 bg-ink-50 rounded-xl border border-ink-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink-900">
                    Exigir Número de Serie (SN) Obligatorio en Venta
                  </p>
                  <p className="text-ink-500 text-[11px]">
                    Impide concretar una venta si un producto configurado con control SN no tiene su número de serie asignado
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enforceSerialOnSale}
                    onChange={(e) => handleFieldChange('enforceSerialOnSale', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:width-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="p-3.5 bg-ink-50 rounded-xl border border-ink-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-ink-900">Alerta de Stock Crítico en Dashboard</p>
                  <p className="text-ink-500 text-[11px]">
                    Muestra insignias y notificaciones de advertencia cuando las existencias caigan por debajo del stock mínimo
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.lowStockAlert}
                    onChange={(e) => handleFieldChange('lowStockAlert', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-ink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:width-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Backup & DB Management */}
        {activeTab === 'backup' && (
          <div className="space-y-5 text-xs">
            <h3 className="text-sm font-bold text-ink-900 border-b border-ink-100 pb-2">
              Respaldo Integral y Migración de Datos (JSON)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold">
                    <Download size={16} /> Exportar Copia de Seguridad Completa
                  </div>
                  <p className="text-ink-600 text-[11px] mb-3">
                    Genera un archivo JSON con todos los productos, seriales, clientes, ventas, movimientos y sucursales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="btn-primary py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                >
                  <Download size={14} /> Descargar Backup JSON
                </button>
              </div>

              <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-brand-800 font-bold">
                    <Upload size={16} /> Restaurar desde Archivo de Respaldo
                  </div>
                  <p className="text-ink-600 text-[11px] mb-3">
                    Carga un archivo JSON previamente exportado para recuperar la base de datos completa.
                  </p>
                </div>

                <label className="btn-secondary py-2 text-xs font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 bg-white">
                  <Upload size={14} className="text-brand-600" /> Seleccionar Archivo JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {importError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
