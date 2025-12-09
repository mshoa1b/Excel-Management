import React from 'react';
import { VisionInsightCanvas } from '../vision/VisionInsightCanvas';
import { PlatformStat, IssueStat } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface PlatformCanvasProps {
    platformData: PlatformStat[];
    issueData: IssueStat[];
    loading?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const PlatformCanvas: React.FC<PlatformCanvasProps> = ({ platformData, issueData, loading }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <VisionInsightCanvas title="Platform Returns Breakdown" description="Distribution of return origin" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={platformData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="platform"
                        >
                            {platformData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px'
                            }}
                        />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </VisionInsightCanvas>

            <VisionInsightCanvas title="Top Issues by Volume" description="Most common reasons for return" loading={loading}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={issueData.slice(0, 10)} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            type="category"
                            dataKey="issue"
                            width={120}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            interval={0}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px'
                            }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} fill="#f59e0b" fillOpacity={0.8} />
                    </BarChart>
                </ResponsiveContainer>
            </VisionInsightCanvas>
        </div>
    );
};
