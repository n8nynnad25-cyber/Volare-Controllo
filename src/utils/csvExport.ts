/**
 * Utility to export data to CSV and trigger a download
 */
export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    // Add byte order mark (BOM) for Excel compatibility with UTF-8
    const BOM = '\uFEFF';

    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => {
            // Escape semicolons and quotes
            const cellStr = String(cell ?? '');
            if (cellStr.includes(';') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(';'))
    ].join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
