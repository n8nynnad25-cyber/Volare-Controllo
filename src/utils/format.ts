export const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-MZ', {
        style: 'currency',
        currency: 'MZN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).replace('MZN', 'MT');
};

export const parseCurrency = (value: string): number => {
    if (!value) return 0;
    // Remove symbols (R$, MT, MZN) and normalize separators
    // Assumes input like "1.000,00" or "1000.00"
    const cleaned = value
        .replace(/[^\d.,-]/g, '') // Keep digits, dot, comma, minus
        .replace('R$', '')
        .replace('MT', '')
        .replace('MZN', '')
        .trim();

    // Check if it uses comma as decimal separator (pt-BR/pt-MZ style)
    if (cleaned.includes(',') && !cleaned.includes('.')) {
        return parseFloat(cleaned.replace(',', '.'));
    }

    // Check if it uses both (e.g. 1.000,00)
    if (cleaned.includes('.') && cleaned.includes(',')) {
        // Remove dots (thousands) and replace comma with dot
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }

    // Default or simple dot decimal
    return parseFloat(cleaned) || 0;
};
