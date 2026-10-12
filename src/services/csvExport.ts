export function exportToCsv(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  // Format cell with Excel CSV safety (quotes, escaping)
  const formatCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map(formatCell).join(',');
  const rowLines = rows.map((r) => r.map(formatCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n'); // BOM for Excel UTF-8 support

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.endsWith('.csv') ? filename : `${filename}.csv`}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
