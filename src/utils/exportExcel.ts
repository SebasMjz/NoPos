/**
 * Utility to export structured data to CSV compatible with Microsoft Excel
 * (Uses UTF-8 BOM so Excel opens accented characters and symbols like Bs. perfectly)
 */
export function exportToExcel(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map(escapeCell).join(';'));

  // Data rows
  rows.forEach((row) => {
    csvRows.push(row.map(escapeCell).join(';'));
  });

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
