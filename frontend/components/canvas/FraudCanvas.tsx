import React from 'react';
import { VisionInsightCanvas } from '../vision/VisionInsightCanvas';
import { Anomaly } from '@/types';
import { AlertTriangle, ShieldAlert, Smartphone } from 'lucide-react';

interface FraudCanvasProps {
    anomalies: Anomaly[];
    repeatedImeis?: Array<{ imei: string; count: number }>;
    loading?: boolean;
}

export const FraudCanvas: React.FC<FraudCanvasProps> = ({ anomalies, repeatedImeis = [], loading }) => {
    const highRisk = anomalies.filter(a => a.severity === 'high');
    const mediumRisk = anomalies.filter(a => a.severity === 'medium');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <VisionInsightCanvas title="Active Anomaly Signals" description="Rule-based fraud detection" loading={loading} className="overflow-hidden">
                <div className="space-y-3 overflow-y-auto h-full pr-2">
                    {anomalies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <ShieldAlert className="w-12 h-12 mb-3 opacity-20" />
                            <p>No anomalies detected</p>
                        </div>
                    ) : (
                        anomalies.map(anomaly => (
                            <div key={anomaly.id} className={`p-4 rounded-xl border backdrop-blur-md flex gap-4 ${anomaly.severity === 'high' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                <div className={`mt-1 p-2 rounded-full ${anomaly.severity === 'high' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold uppercase tracking-wider ${anomaly.severity === 'high' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {anomaly.label}
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{anomaly.description}</p>
                                    {anomaly.value && (
                                        <div className="mt-2 text-xs font-mono bg-black/5 dark:bg-white/5 inline-block px-2 py-1 rounded">
                                            Metric: {anomaly.value.toFixed(2)} vs Limit: {anomaly.threshold?.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </VisionInsightCanvas>

            <VisionInsightCanvas title="Repeated Device Returns (IMEI)" description="Devices returned multiple times" loading={loading}>
                <div className="overflow-y-auto h-full">
                    <table className="w-full text-left border-collapse">
                        <thead className="text-xs uppercase text-slate-400 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-3 font-semibold">IMEI Number</th>
                                <th className="p-3 font-semibold text-right">Return Count</th>
                                <th className="p-3 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {repeatedImeis.map((item, i) => (
                                <tr key={item.imei} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 opacity-50" /> {item.imei}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{item.count}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                            High Risk
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {repeatedImeis.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-400">No repeated devices found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </VisionInsightCanvas>
        </div>
    );
};
