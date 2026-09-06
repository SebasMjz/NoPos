import { useState, useRef, useEffect } from 'react';
import { QrCode, CheckCircle2, AlertCircle, Trash2, Clipboard, ListPlus, Sparkles } from 'lucide-react';
import { posSound } from '../utils/sound';

interface SerialBatchInputProps {
  quantity: number;
  serials: string[];
  onChange: (serials: string[]) => void;
  mode?: 'entrada' | 'salida' | 'ajuste';
  availableSerials?: string[];
  productName?: string;
  disabled?: boolean;
}

export function SerialBatchInput({
  quantity,
  serials,
  onChange,
  mode = 'entrada',
  availableSerials = [],
  productName = '',
  disabled = false,
}: SerialBatchInputProps) {
  const [quickScanInput, setQuickScanInput] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Normalize serials array to match exactly the required quantity length
  const normalizedSerials = Array.from({ length: Math.max(1, quantity) }, (_, i) => serials[i] || '');

  const filledCount = normalizedSerials.filter((s) => s.trim().length > 0).length;
  const isComplete = filledCount === quantity && quantity > 0;

  // Check for duplicates within current serials
  const duplicateIndices = new Set<number>();
  const seenMap = new Map<string, number>();
  normalizedSerials.forEach((sn, idx) => {
    const trimmed = sn.trim().toUpperCase();
    if (!trimmed) return;
    if (seenMap.has(trimmed)) {
      duplicateIndices.add(idx);
      duplicateIndices.add(seenMap.get(trimmed)!);
    } else {
      seenMap.set(trimmed, idx);
    }
  });

  const handleSlotChange = (index: number, value: string) => {
    const updated = [...normalizedSerials];
    updated[index] = value.trim();
    onChange(updated.slice(0, quantity));
    setErrorMessage(null);
  };

  // Quick scanner barcode submit
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = quickScanInput.trim();
    if (!code) return;

    // Check if in salida mode and availableSerials is provided, whether the SN exists in stock
    if (mode === 'salida' && availableSerials.length > 0) {
      if (!availableSerials.includes(code)) {
        setErrorMessage(`El SN "${code}" no existe en el stock actual disponible de este producto.`);
        posSound.playErrorAlert();
        return;
      }
    }

    // Check if already in current list
    if (normalizedSerials.includes(code)) {
      setErrorMessage(`El número de serie "${code}" ya fue ingresado.`);
      posSound.playErrorAlert();
      return;
    }

    // Find the first empty slot
    const firstEmptyIndex = normalizedSerials.findIndex((s) => !s.trim());
    if (firstEmptyIndex === -1 && normalizedSerials.length >= quantity) {
      setErrorMessage(`Ya se completaron los ${quantity} números de serie requeridos.`);
      posSound.playErrorAlert();
      return;
    }

    const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : normalizedSerials.length;
    const updated = [...normalizedSerials];
    updated[targetIndex] = code;

    onChange(updated.slice(0, quantity));
    setQuickScanInput('');
    setErrorMessage(null);
    posSound.playScannerBeep();

    // Re-focus scanner input for instant continuous scanning
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 30);
  };

  const handleBulkApply = () => {
    if (!bulkText.trim()) {
      setBulkMode(false);
      return;
    }

    const parsed = bulkText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const validNewSerials: string[] = [];
    const seen = new Set<string>();

    parsed.forEach((sn) => {
      if (validNewSerials.length < quantity && !seen.has(sn.toUpperCase())) {
        seen.add(sn.toUpperCase());
        validNewSerials.push(sn);
      }
    });

    onChange(validNewSerials);
    setBulkText('');
    setBulkMode(false);
    posSound.playSuccessChime();
  };

  const handleAutoGenerateMock = () => {
    const prefix = productName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD') || 'SN';
    const randomSNs = Array.from({ length: quantity }, (_, i) => {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      return `${prefix}-${new Date().getFullYear().toString().slice(2)}${randNum}-${i + 1}`;
    });
    onChange(randomSNs);
    posSound.playSuccessChime();
  };

  const handleClearAll = () => {
    onChange([]);
    setErrorMessage(null);
  };

  return (
    <div className="p-3 bg-ink-50/80 rounded-xl border border-ink-200 space-y-2.5">
      {/* Header Status & Quantity requirement */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <QrCode size={15} className="text-purple-600" />
          <span className="font-bold text-ink-900">
            Requeridos: {quantity} Serial{quantity > 1 ? 'es' : ''} (SN)
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              isComplete
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {filledCount} de {quantity} asignados
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'entrada' && (
            <button
              type="button"
              onClick={handleAutoGenerateMock}
              className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1 px-2 py-0.5 rounded hover:bg-brand-50"
              title="Generar números de serie automáticos para pruebas"
            >
              <Sparkles size={12} /> Auto-generar
            </button>
          )}
          <button
            type="button"
            onClick={() => setBulkMode((b) => !b)}
            className="text-[11px] text-ink-600 hover:text-ink-900 font-semibold flex items-center gap-1 px-2 py-0.5 rounded hover:bg-ink-200"
          >
            <Clipboard size={12} /> {bulkMode ? 'Modo Normal' : 'Pegar Lote'}
          </button>
          {filledCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-red-50"
            >
              <Trash2 size={11} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-1.5 animate-shake">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Barcode/QR Scanner Fast Input */}
      {!bulkMode && (
        <form onSubmit={handleScanSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <QrCode
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-600 animate-pulse"
            />
            <input
              ref={scanInputRef}
              type="text"
              disabled={disabled || isComplete}
              value={quickScanInput}
              onChange={(e) => {
                setQuickScanInput(e.target.value);
                setErrorMessage(null);
              }}
              placeholder={
                isComplete
                  ? '✓ Todos los seriales completados'
                  : 'Escanear con pistola Barcode/QR o presionar Enter...'
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg font-mono placeholder:text-ink-400 placeholder:font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={disabled || !quickScanInput.trim() || isComplete}
            className="btn-primary py-1 px-3 text-xs bg-purple-600 hover:bg-purple-700 font-semibold flex items-center gap-1 shrink-0 disabled:opacity-40"
          >
            <ListPlus size={13} />
            Asignar
          </button>
        </form>
      )}

      {/* Bulk Textarea Mode */}
      {bulkMode && (
        <div className="space-y-2">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={3}
            placeholder={`Pega hasta ${quantity} seriales separados por comas o saltos de línea...`}
            className="w-full p-2 bg-white border border-ink-300 rounded-lg text-xs font-mono focus:outline-none focus:border-brand-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBulkMode(false)}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBulkApply}
              className="btn-primary text-xs py-1 px-3"
            >
              Aplicar {quantity} Seriales
            </button>
          </div>
        </div>
      )}

      {/* Individual Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 pt-1">
        {normalizedSerials.map((sn, idx) => {
          const isFilled = sn.trim().length > 0;
          const isDuplicate = duplicateIndices.has(idx);

          return (
            <div
              key={idx}
              className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs transition-colors ${
                isDuplicate
                  ? 'bg-red-50 border-red-300 ring-1 ring-red-400'
                  : isFilled
                  ? 'bg-purple-50/60 border-purple-200'
                  : 'bg-white border-dashed border-ink-300'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-ink-200 text-ink-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                #{idx + 1}
              </span>

              {mode === 'salida' && availableSerials.length > 0 ? (
                <select
                  value={sn}
                  onChange={(e) => handleSlotChange(idx, e.target.value)}
                  className="flex-1 bg-transparent text-xs font-mono font-semibold text-ink-900 focus:outline-none"
                >
                  <option value="">-- Seleccionar SN Disponible --</option>
                  {availableSerials.map((availSn) => (
                    <option key={availSn} value={availSn}>
                      {availSn}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={sn}
                  onChange={(e) => handleSlotChange(idx, e.target.value)}
                  placeholder={`Serial SN #${idx + 1}`}
                  className="flex-1 bg-transparent text-xs font-mono font-semibold text-ink-900 placeholder:text-ink-400 placeholder:font-sans focus:outline-none"
                />
              )}

              {isFilled && (
                <button
                  type="button"
                  onClick={() => handleSlotChange(idx, '')}
                  className="text-ink-400 hover:text-red-500 p-0.5"
                  title="Borrar serial"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
