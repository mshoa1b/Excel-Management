import React from 'react';
import { VisionInsightCanvas } from '../vision/VisionInsightCanvas';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip } from 'recharts';

interface AttachmentsCanvasProps {
    stats: { with: number; without: number };
    loading?: boolean;
}

export const AttachmentsCanvas: React.FC<AttachmentsCanvasProps> = ({ stats, loading }) => {
    const total = stats.with + stats.without || 1;
    const complianceRate = (stats.with / total) * 100;

    const data = [
        { name: 'Missing', uv: stats.without, fill: '#ef4444' },
        { name: 'Compliant', uv: stats.with, fill: '#10b981' },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <VisionInsightCanvas title="Documentation Compliance" description="Cases with required photo evidence" loading={loading}>
                <div className="flex flex-col items-center justify-center h-full">
                    <ResponsiveContainer width="100%" height={250}>
                        <RadialBarChart
                            innerRadius="30%"
                            outerRadius="100%"
                            data={data}
                            startAngle={180}
                            endAngle={0}
                        >
                            <RadialBar background dataKey="uv" cornerRadius={10} label={{ position: 'insideStart', fill: '#fff' }} />
                            <Legend iconSize={10} width={120} height={140} layout="vertical" verticalAlign="middle" align="right" />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', backgroundColor: 'rgba(15,23,42,0.9)', color: '#fff' }} />
                        </RadialBarChart>
                    </ResponsiveContainer>

                    <div className="text-center mt-4">
                        <div className="text-4xl font-bold text-slate-900 dark:text-white">
                            {complianceRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-slate-500">Global Attachment Compliance Rate</p>
                    </div>
                </div>
            </VisionInsightCanvas>

            <VisionInsightCanvas title="Why this matters?" description="Impact of missing evidence" className="flex flex-col justify-center">
                <div className="space-y-6 px-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">1</div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Dispute Protection</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Proper photos protect against 95% of customer damage claims.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">2</div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Carrier Insurance</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Required for claims over $100 on all major platforms.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">3</div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Audit Trail</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Visual proof of condition upon receipt.</p>
                        </div>
                    </div>
                </div>
            </VisionInsightCanvas>
        </div>
    );
};
