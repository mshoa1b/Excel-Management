"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DonutChartProps {
    title: string;
    data: Array<{ name: string; value: number; percentage?: number }>;
    colors?: string[];
    centerLabel?: string;
    centerValue?: string;
}

const DEFAULT_COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
];

export default function DonutChart({
    title,
    data,
    colors = DEFAULT_COLORS,
    centerLabel,
    centerValue,
}: DonutChartProps) {
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

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm">
                        Count: <span className="font-medium">{data.value.toLocaleString()}</span>
                    </p>
                    {data.percentage !== undefined && (
                        <p className="text-sm">
                            Percentage: <span className="font-medium">{data.percentage}%</span>
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
                {centerLabel && centerValue && (
                    <div className="text-center -mt-48 pointer-events-none">
                        <p className="text-sm text-muted-foreground">{centerLabel}</p>
                        <p className="text-2xl font-bold">{centerValue}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
