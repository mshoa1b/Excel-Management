"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface StackedBarChartProps {
    title: string;
    data: Array<{ [key: string]: any }>;
    xKey: string;
    bars: Array<{ key: string; name: string; color: string }>;
    height?: number;
    showPercentage?: boolean;
}

export default function StackedBarChart({
    title,
    data,
    xKey,
    bars,
    height = 350,
    showPercentage = false,
}: StackedBarChartProps) {
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

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-medium">{entry.value.toLocaleString()}</span>
                            {showPercentage && total > 0 && (
                                <span className="text-muted-foreground ml-1">
                                    ({((entry.value / total) * 100).toFixed(1)}%)
                                </span>
                            )}
                        </p>
                    ))}
                    {showPercentage && (
                        <p className="text-sm font-semibold mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                            Total: {total.toLocaleString()}
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
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                        <XAxis
                            dataKey={xKey}
                            className="text-xs"
                            tick={{ fill: "currentColor" }}
                        />
                        <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {bars.map((bar) => (
                            <Bar
                                key={bar.key}
                                dataKey={bar.key}
                                name={bar.name}
                                fill={bar.color}
                                stackId="a"
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
