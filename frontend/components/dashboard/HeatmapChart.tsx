"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface HeatmapData {
    row: string;
    col: string;
    value: number;
}

interface HeatmapChartProps {
    title: string;
    data: HeatmapData[];
    valueLabel?: string;
    colorScale?: { min: string; mid: string; max: string };
}

const DEFAULT_COLOR_SCALE = {
    min: "#dbeafe", // blue-100
    mid: "#3b82f6", // blue-500
    max: "#1e3a8a", // blue-900
};

export default function HeatmapChart({
    title,
    data,
    valueLabel = "Count",
    colorScale = DEFAULT_COLOR_SCALE,
}: HeatmapChartProps) {
    const { rows, cols, matrix, maxValue } = useMemo(() => {
        if (!data || data.length === 0) {
            return { rows: [], cols: [], matrix: {}, maxValue: 0 };
        }

        const rowSet = new Set<string>();
        const colSet = new Set<string>();
        const matrix: { [key: string]: number } = {};
        let max = 0;

        data.forEach((item) => {
            rowSet.add(item.row);
            colSet.add(item.col);
            const key = `${item.row}|${item.col}`;
            matrix[key] = item.value;
            max = Math.max(max, item.value);
        });

        return {
            rows: Array.from(rowSet),
            cols: Array.from(colSet),
            matrix,
            maxValue: max,
        };
    }, [data]);

    const getColor = (value: number) => {
        if (maxValue === 0) return colorScale.min;

        const ratio = value / maxValue;

        if (ratio < 0.5) {
            // Interpolate between min and mid
            const localRatio = ratio * 2;
            return interpolateColor(colorScale.min, colorScale.mid, localRatio);
        } else {
            // Interpolate between mid and max
            const localRatio = (ratio - 0.5) * 2;
            return interpolateColor(colorScale.mid, colorScale.max, localRatio);
        }
    };

    const interpolateColor = (color1: string, color2: string, ratio: number) => {
        const hex = (c: string) => parseInt(c.slice(1), 16);
        const r1 = (hex(color1) >> 16) & 255;
        const g1 = (hex(color1) >> 8) & 255;
        const b1 = hex(color1) & 255;
        const r2 = (hex(color2) >> 16) & 255;
        const g2 = (hex(color2) >> 8) & 255;
        const b2 = hex(color2) & 255;

        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);

        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
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
                <div className="overflow-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className="border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800 sticky left-0 z-10"></th>
                                {cols.map((col) => (
                                    <th
                                        key={col}
                                        className="border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row}>
                                    <td className="border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800 font-semibold text-xs sticky left-0 z-10">
                                        {row}
                                    </td>
                                    {cols.map((col) => {
                                        const key = `${row}|${col}`;
                                        const value = matrix[key] || 0;
                                        const bgColor = value > 0 ? getColor(value) : "transparent";
                                        const textColor = value > maxValue * 0.5 ? "#ffffff" : "#000000";

                                        return (
                                            <td
                                                key={col}
                                                className="border border-slate-200 dark:border-slate-700 p-2 text-center transition-all hover:scale-105 cursor-pointer"
                                                style={{ backgroundColor: bgColor, color: textColor }}
                                                title={`${row} → ${col}: ${value} ${valueLabel.toLowerCase()}`}
                                            >
                                                {value > 0 ? value.toLocaleString() : "-"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span>Legend:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: colorScale.min }}></div>
                        <span>Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: colorScale.mid }}></div>
                        <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: colorScale.max }}></div>
                        <span>High</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
