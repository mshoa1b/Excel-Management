import React from 'react';
import { VisionInsightCanvas } from '../vision/VisionInsightCanvas';
import { ProductStat } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Treemap } from 'recharts';

interface ProductCanvasProps {
    data: ProductStat[];
    loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel p-3 text-xs">
                <p className="font-bold mb-1">{label || payload[0].payload.name}</p>
                <p className="text-slate-500">Returns: <span className="text-slate-900 dark:text-white font-mono">{payload[0].value}</span></p>
                {payload[0].payload.refundAmount && (
                    <p className="text-slate-500">Refund Cost: <span className="text-emerald-500 font-mono">${payload[0].payload.refundAmount}</span></p>
                )}
            </div>
        );
    }
    return null;
};

export const ProductCanvas: React.FC<ProductCanvasProps> = ({ data, loading }) => {
    const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 15);
    const treeMapData = data.map(d => ({ name: d.sku, size: d.refundAmount, ...d }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <VisionInsightCanvas title="Top Returned SKUs" description="Products with highest return volume" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={sortedData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            type="category"
                            dataKey="sku"
                            width={100}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            interval={0}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                            {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index < 3 ? '#fb7185' : '#3b82f6'} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </VisionInsightCanvas>

            <VisionInsightCanvas title="Refund Cost Impact" description="SKU Size determined by total refund value" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={treeMapData}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        fill="#8884d8"
                        content={<CustomContent />}
                    >
                        <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                </ResponsiveContainer>
            </VisionInsightCanvas>
        </div>
    );
};

const CustomContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={index % 6 === 0 ? '#6366f1' : index % 6 === 1 ? '#8b5cf6' : index % 6 === 2 ? '#ec4899' : '#3b82f6'}
                fillOpacity={0.6 + (0.02 * (index % 10))}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
                rx={4}
            />
            {width > 40 && height > 25 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={10}
                    fontWeight={600}
                >
                    {name.substring(0, 8)}
                </text>
            )}
        </g>
    );
};
