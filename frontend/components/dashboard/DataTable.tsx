import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataTableProps {
    title: string;
    columns: string[];
    data: Array<Record<string, any>>;
    formatters?: Record<string, (value: any) => string>;
}

export default function DataTable({ title, columns, data, formatters = {} }: DataTableProps) {
    const formatValue = (column: string, value: any) => {
        if (formatters[column]) {
            return formatters[column](value);
        }
        return value?.toString() || '-';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className="text-left py-3 px-4 font-semibold text-slate-700"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="text-center py-8 text-slate-500"
                                    >
                                        No data available
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, rowIdx) => (
                                    <tr
                                        key={rowIdx}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        {columns.map((col, colIdx) => {
                                            const key = col.toLowerCase().replace(/\s+/g, '_');
                                            return (
                                                <td key={colIdx} className="py-3 px-4 text-slate-600">
                                                    {formatValue(key, row[key])}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
