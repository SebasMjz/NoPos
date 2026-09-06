import { useRef } from 'react';
import { Printer, CheckCircle2, Lock, X, FileText } from 'lucide-react';
import { formatCurrency, formatDateTime } from './format';
import type { CashRegisterSession } from '../types';

interface CashClosingPrintProps {
  session: CashRegisterSession;
  onClose?: () => void;
}

export function CashClosingPrint({ session, onClose }: CashClosingPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const totalSales = session.cashSales + session.cardSales + session.transferSales + session.otherSales;

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between no-print border-b border-ink-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Lock size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink-900">Acta de Arqueo y Cierre de Caja</h3>
            <p className="text-xs text-ink-500 font-mono">Turno: {session.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn-primary text-xs py-1.5 px-3 bg-brand-600 hover:bg-brand-700 shadow-sm flex items-center gap-1.5 font-bold"
          >
            <Printer size={14} /> Imprimir Acta de Arqueo
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-ink-400 hover:text-ink-700 rounded-lg">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Thermal Printable Container */}
      <div
        ref={printRef}
        className="printable-ticket bg-white text-ink-900 p-5 rounded-2xl border border-ink-200 font-mono text-xs max-w-sm mx-auto shadow-sm space-y-3"
      >
        {/* Header */}
        <div className="text-center space-y-1 border-b border-dashed border-ink-300 pb-3">
          <img src="/logo.png" alt="NoPosTech Logo" className="w-12 h-12 object-contain mx-auto mb-1" />
          <h2 className="text-sm font-black tracking-wider uppercase text-ink-950">
            NOPOSTECH ELECTRÓNICA & HARDWARE
          </h2>
          <p className="text-[10px] text-ink-600">ACTA OFICIAL DE ARQUEO Y CIERRE DE TURNO</p>
          <p className="text-[10px] font-bold text-ink-800">TURNO Nº: {session.id}</p>
        </div>

        {/* Turno Details */}
        <div className="space-y-1 text-[11px] border-b border-dashed border-ink-300 pb-2">
          <div className="flex justify-between">
            <span className="text-ink-500">Cajero / Responsable:</span>
            <span className="font-bold">{session.cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Apertura:</span>
            <span>{formatDateTime(session.openedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Cierre:</span>
            <span>{session.closedAt ? formatDateTime(session.closedAt) : 'En curso'}</span>
          </div>
        </div>

        {/* Sales by Payment Method */}
        <div className="space-y-1.5 border-b border-dashed border-ink-300 pb-3">
          <span className="font-bold text-[10px] text-ink-600 uppercase block">
            Desglose de Ventas por Método:
          </span>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Ventas en Efectivo:</span>
              <span className="font-bold">{formatCurrency(session.cashSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tarjeta / POS (Vouchers):</span>
              <span className="font-bold">{formatCurrency(session.cardSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Transferencias QR:</span>
              <span className="font-bold">{formatCurrency(session.transferSales)}</span>
            </div>
            {session.otherSales > 0 && (
              <div className="flex justify-between">
                <span>Otros Métodos:</span>
                <span className="font-bold">{formatCurrency(session.otherSales)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-ink-200 font-bold text-emerald-800">
              <span>TOTAL RECAUDACIÓN:</span>
              <span>{formatCurrency(totalSales)}</span>
            </div>
          </div>
        </div>

        {/* Physical Cash Calculation */}
        <div className="space-y-1.5 border-b border-dashed border-ink-300 pb-3 text-[11px]">
          <span className="font-bold text-[10px] text-ink-600 uppercase block">
            Cuadre de Efectivo en Gaveta:
          </span>
          <div className="flex justify-between">
            <span>Fondo Inicial de Caja:</span>
            <span>{formatCurrency(session.openingAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>(+) Ventas Efectivo:</span>
            <span>+{formatCurrency(session.cashSales)}</span>
          </div>
          <div className="flex justify-between">
            <span>(+) Ingresos Manuales:</span>
            <span>+{formatCurrency(session.cashIn)}</span>
          </div>
          <div className="flex justify-between">
            <span>(-) Egresos / Gastos:</span>
            <span>-{formatCurrency(session.cashOut)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-ink-200 font-bold text-ink-900">
            <span>EFECTIVO ESPERADO:</span>
            <span>{formatCurrency(session.expectedCash)}</span>
          </div>
          <div className="flex justify-between font-black text-ink-950 text-xs pt-1">
            <span>CONTEO FÍSICO REAL:</span>
            <span className="text-brand-700">
              {formatCurrency(session.actualCash ?? session.expectedCash)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-ink-200">
            <span>DIFERENCIA DEL ARQUEO:</span>
            <span
              className={
                session.difference === 0
                  ? 'text-emerald-700'
                  : (session.difference ?? 0) > 0
                    ? 'text-blue-700'
                    : 'text-red-600'
              }
            >
              {session.difference === 0
                ? '0.00 (CUADRE EXACTO)'
                : (session.difference ?? 0) > 0
                  ? `+${formatCurrency(session.difference ?? 0)} (SOBRANTE)`
                  : `${formatCurrency(session.difference ?? 0)} (FALTANTE)`}
            </span>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-6 space-y-8 text-center text-[10px] text-ink-600">
          <div className="flex justify-between gap-4">
            <div className="flex-1 border-t border-ink-400 pt-1">
              <p className="font-bold text-ink-800">Cajero Responsable</p>
              <p className="text-[9px]">{session.cashierName}</p>
            </div>
            <div className="flex-1 border-t border-ink-400 pt-1">
              <p className="font-bold text-ink-800">Supervisor / Admin</p>
              <p className="text-[9px]">Firma y Sello</p>
            </div>
          </div>
          <p className="text-[8px] text-ink-400">Documento de control interno de arqueo de caja</p>
        </div>
      </div>
    </div>
  );
}
