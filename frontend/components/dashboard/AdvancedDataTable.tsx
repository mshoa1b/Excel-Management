"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";

interface Column {
    key: string;
    label: string;
    formatter?: (value: any) => string;
    sortable?: boolean;
}

interface AdvancedDataTableProps {
    title: string;
    data: Array<{ [key: string]: any }>;
    columns: Column[];
    defaultSortKey?: string;
    defaultSortOrder?: "asc" | "desc";
    maxHeight?: string;
}

export default function AdvancedDataTable({
    title,
    data,
    columns,
    defaultSortKey,
    defaultSortOrder = "desc",
    maxHeight = "400px",
}: AdvancedDataTableProps) {
    const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);

    const sortedData = useMemo(() => {
        if (!sortKey) return data;

        return [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];

            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
            }

            const aStr = String(aVal || "").toLowerCase();
            const bStr = String(bVal || "").toLowerCase();

            if (sortOrder === "asc") {
                return aStr.localeCompare(bStr);
            } else {
                return bStr.localeCompare(aStr);
            }
        });
    }, [data, sortKey, sortOrder]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("desc");
        }
    };

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-auto" style={{ maxHeight }}>
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className={`px-4 py-3 text-left font-semibold ${column.sortable !== false ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" : ""
                                            }`}
                                        onClick={() => column.sortable !== false && handleSort(column.key)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {column.label}
                                            {column.sortable !== false && (
                                                <span className="text-muted-foreground">
                                                    {sortKey === column.key ? (
                                                        sortOrder === "asc" ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((row, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-4 py-3">
                                            {column.formatter
                                                ? column.formatter(row[column.key])
                                                : row[column.key]?.toLocaleString() || "-"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Showing {sortedData.length} {sortedData.length === 1 ? "row" : "rows"}
                </p>
            </CardContent>
        </Card>
    );
}
