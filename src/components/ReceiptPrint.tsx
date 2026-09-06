import { useRef } from 'react';
import { Printer, CheckCircle2, QrCode, FileText, Receipt as ReceiptIcon, X } from 'lucide-react';
import { formatCurrency, formatDateTime } from './format';
import type { Sale } from '../types';

interface ReceiptPrintProps {
  sale: Sale;
  onClose?: () => void;
}

export function ReceiptPrint({ sale, onClose }: ReceiptPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top action bar (hidden during print) */}
      <div className="flex items-center justify-between no-print border-b border-ink-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
            {sale.documentType === 'Factura' ? <FileText size={18} /> : <ReceiptIcon size={18} />}
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink-900">
              {sale.documentType === 'Factura' ? 'Factura Computarizada' : 'Nota de Venta / Recibo'}
            </h3>
            <p className="text-xs text-ink-500 font-mono">Folio: {sale.folio}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="btn-primary text-xs py-1.5 px-3 bg-brand-600 hover:bg-brand-700 shadow-sm flex items-center gap-1.5 font-bold"
          >
            <Printer size={14} /> Imprimir Comprobante
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-ink-400 hover:text-ink-700 rounded-lg">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Printable Thermal Receipt Container */}
      <div
        ref={printRef}
        className="printable-ticket bg-white text-ink-900 p-5 rounded-2xl border border-ink-200 font-mono text-xs max-w-sm mx-auto shadow-sm space-y-3"
      >
        {/* Company Header */}
        <div className="text-center space-y-1 border-b border-dashed border-ink-300 pb-3">
          <img src="/logo.png" alt="NoPosTech Logo" className="w-12 h-12 object-contain mx-auto mb-1" />
          <h2 className="text-sm font-black tracking-wider uppercase text-ink-950">
            NOPOSTECH ELECTRÓNICA & HARDWARE
          </h2>
          <p className="text-[10px] text-ink-600">Casa Matriz: Av. 6 de Agosto #2410 - La Paz, Bolivia</p>
          <p className="text-[10px] text-ink-600">Teléfono: +591 2 2441980 / 70123456</p>
          <p className="text-[10px] font-bold text-ink-800">NIT: 1029384756</p>
        </div>

        {/* Document Meta */}
        <div className="text-center py-1 border-b border-dashed border-ink-300">
          <p className="font-extrabold text-xs uppercase text-ink-900">
            {sale.documentType === 'Factura'
              ? 'FACTURA - DERECHO A CRÉDITO FISCAL'
              : 'NOTA DE VENTA / RECIBO DE CAJA'}
          </p>
          <p className="font-bold text-sm text-brand-700 mt-0.5">Nº: {sale.folio}</p>
        </div>

        {/* Customer & Transaction details */}
        <div className="space-y-1 text-[11px] border-b border-dashed border-ink-300 pb-2">
          <div className="flex justify-between">
            <span className="text-ink-500">Fecha / Hora:</span>
            <span className="font-semibold">{formatDateTime(sale.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Señor(es):</span>
            <span className="font-bold text-right truncate max-w-[180px]">{sale.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Cajero:</span>
            <span>{sale.cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Forma de Pago:</span>
            <span className="font-bold">{sale.paymentMethod}</span>
          </div>
        </div>

        {/* Items Detail Table */}
        <div className="space-y-1.5 border-b border-dashed border-ink-300 pb-3">
          <div className="flex justify-between font-bold text-[10px] text-ink-600 border-b border-ink-200 pb-1 uppercase">
            <span>Cant / Descripción</span>
            <span className="text-right">Importe</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {sale.items.map((item, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-[11px] items-start">
                  <span className="font-bold leading-tight flex-1 pr-2">
                    {item.quantity} x {item.name}
                  </span>
                  <span className="font-extrabold text-right shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
                {item.serialNumber && (
                  <div className="text-[10px] text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded font-bold inline-block">
                    SN: {item.serialNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Financial Totals */}
        <div className="space-y-1 text-[11px] pt-1">
          <div className="flex justify-between">
            <span className="text-ink-500">Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>

          {sale.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Descuento:</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}

          {sale.documentType === 'Factura' && (
            <div className="flex justify-between text-brand-700">
              <span>IVA Ley (13%):</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs font-black pt-1.5 border-t border-ink-300 text-ink-950">
            <span>TOTAL VENTA:</span>
            <span className="text-sm text-brand-700">{formatCurrency(sale.total)}</span>
          </div>

          {/* Payment Split & Advance / Anticipo breakdown */}
          {sale.isAdvance && typeof sale.advanceAmount === 'number' && (
            <div className="pt-2 mt-2 border-t border-dashed border-amber-300 bg-amber-50/70 p-2 rounded-lg space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-amber-900">
                <span>ADELANTO / A CUENTA:</span>
                <span>{formatCurrency(sale.advanceAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600">
                <span>SALDO PENDIENTE:</span>
                <span>{formatCurrency(sale.pendingBalance ?? (sale.total - sale.advanceAmount))}</span>
              </div>
            </div>
          )}

          {sale.paymentMethod === 'Pago Mixto' && sale.paymentSplits && sale.paymentSplits.length > 0 && (
            <div className="pt-1.5 border-t border-ink-200 text-[10px] text-ink-600 space-y-0.5">
              <span className="font-bold uppercase text-[9px]">Desglose Pago Mixto:</span>
              {sale.paymentSplits.map((split, sIdx) => (
                <div key={sIdx} className="flex justify-between">
                  <span>• {split.method}:</span>
                  <span className="font-bold">{formatCurrency(split.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Mock & Fiscal Disclaimer */}
        <div className="text-center pt-3 border-t border-dashed border-ink-300 space-y-1">
          <div className="w-14 h-14 bg-ink-100 border border-ink-300 rounded flex items-center justify-center mx-auto text-ink-600">
            <QrCode size={36} />
          </div>
          <p className="text-[9px] text-ink-400 font-bold uppercase tracking-wide">
            {sale.documentType === 'Factura'
              ? '"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS"'
              : 'COMPROBANTE DE VENTA INTERNO'}
          </p>
          <p className="text-[9px] text-ink-400">¡Gracias por su preferencia!</p>
        </div>
      </div>
    </div>
  );
}
