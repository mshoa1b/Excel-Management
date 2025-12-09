import React from 'react';
import { VisionInsightCanvas } from '../vision/VisionInsightCanvas';
import { AgentStat } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { VisionGlassCard } from '../vision/VisionGlassCard';
import { Clock, CheckCircle } from 'lucide-react';

interface AgentsCanvasProps {
    data: AgentStat[];
    loading?: boolean;
}

export const AgentsCanvas: React.FC<AgentsCanvasProps> = ({ data, loading }) => {
    const sortedByVolume = [...data].sort((a, b) => b.count - a.count);

    return (
        <div className="flex flex-col gap-6 h-full">
            <VisionInsightCanvas title="Agent Performance Leaderboard" description="Cases processed vs Refund Value" loading={loading} className="min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedByVolume} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="agentName" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px'
                            }}
                        />
                        <Bar yAxisId="left" dataKey="count" name="Calls Processed" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar yAxisId="right" dataKey="refundAmount" name="Refund Value ($)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </VisionInsightCanvas>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sortedByVolume.slice(0, 3).map((agent, i) => (
                    <VisionGlassCard key={agent.agentName} variant="interactive" className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-slate-300/20 text-slate-300' : 'bg-orange-700/20 text-orange-700'}`}>
                            #{i + 1}
                        </div>
                        <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{agent.agentName}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {agent.count} cases</span>
                                {agent.avgResolutionTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {agent.avgResolutionTime}h</span>}
                            </div>
                        </div>
                    </VisionGlassCard>
                ))}
            </div>
        </div>
    );
};
