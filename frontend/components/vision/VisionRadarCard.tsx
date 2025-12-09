import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { VisionInsightCanvas } from './VisionInsightCanvas';

interface RadarDataPoint {
    subject: string;
    A: number;
    B?: number;
    fullMark: number;
}

interface VisionRadarCardProps {
    title: string;
    data: RadarDataPoint[];
    dataKeyA: string;
    dataKeyB?: string;
    colorA?: string;
    colorB?: string;
    className?: string;
}

export const VisionRadarCard: React.FC<VisionRadarCardProps> = ({
    title,
    data,
    dataKeyA,
    dataKeyB,
    colorA = "#8884d8",
    colorB = "#82ca9d",
    className
}) => {
    return (
        <VisionInsightCanvas title={title} className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.7 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                    <Radar
                        name={dataKeyA}
                        dataKey="A"
                        stroke={colorA}
                        fill={colorA}
                        fillOpacity={0.4}
                    />
                    {dataKeyB && (
                        <Radar
                            name={dataKeyB}
                            dataKey="B"
                            stroke={colorB}
                            fill={colorB}
                            fillOpacity={0.4}
                        />
                    )}
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                        }}
                        itemStyle={{ color: '#fff' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </VisionInsightCanvas>
    );
};
