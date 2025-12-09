import React from 'react';
import { VisionInsightCanvas } from '../vision/VisionInsightCanvas';
import { TrendData } from '@/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';

interface ReturnsCanvasProps {
    data: TrendData[];
    loading?: boolean;
}

export const ReturnsCanvas: React.FC<ReturnsCanvasProps> = ({ data, loading }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <VisionInsightCanvas
                title="Returns & Refunds Timeline"
                description="Daily volume of returns vs orders"
                loading={loading}
                className="lg:col-span-2"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRefunds" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(d) => format(new Date(d), 'MMM d')}
                            stroke="rgba(148,163,184,0.5)"
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis stroke="rgba(148,163,184,0.5)" tick={{ fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: '#fff'
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="orders" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} name="Total Orders" />
                        <Area type="monotone" dataKey="refunds" stroke="#ef4444" fillOpacity={1} fill="url(#colorRefunds)" strokeWidth={2} name="Returns" />
                    </AreaChart>
                </ResponsiveContainer>
            </VisionInsightCanvas>

            <div className="flex flex-col gap-6">
                <VisionInsightCanvas title="Refund Volume" description="Monetary value of refunds" loading={loading} className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                            <XAxis hide dataKey="date" />
                            <YAxis stroke="rgba(148,163,184,0.5)" tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(val: number) => [`$${val}`, 'Refund Amount']}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '12px'
                                }}
                            />
                            <Area type="monotone" dataKey="refundAmount" stroke="#10b981" fill="url(#colorValue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </VisionInsightCanvas>
            </div>
        </div>
    );
};
