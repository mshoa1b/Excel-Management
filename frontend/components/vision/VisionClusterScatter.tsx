import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, Legend } from 'recharts';
import { VisionInsightCanvas } from './VisionInsightCanvas';

interface ScatterPoint {
    x: number;
    y: number;
    z: number;
    name?: string;
    fill?: string;
}

interface VisionClusterScatterProps {
    title: string;
    data: ScatterPoint[];
    xAxisLabel?: string;
    yAxisLabel?: string;
    className?: string;
}

export const VisionClusterScatter: React.FC<VisionClusterScatterProps> = ({
    title,
    data,
    xAxisLabel,
    yAxisLabel,
    className
}) => {
    return (
        <VisionInsightCanvas title={title} className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis type="number" dataKey="x" name={xAxisLabel} unit="" stroke="rgba(148,163,184,0.5)" tick={{ fontSize: 12 }} />
                    <YAxis type="number" dataKey="y" name={yAxisLabel} unit="" stroke="rgba(148,163,184,0.5)" tick={{ fontSize: 12 }} />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} name="Volume" />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                        }}
                    />
                    <Legend />
                    <Scatter name="Entities" data={data} fill="#8884d8">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill || `hsl(${index * 40}, 70%, 50%)`} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </VisionInsightCanvas>
    );
};
