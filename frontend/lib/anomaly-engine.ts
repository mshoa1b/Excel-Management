import { Anomaly, TrendData, ProductStat, AgentStat } from '@/types';

// Utility to calculate average
const average = (arr: number[]) => arr.reduce((p, c) => p + c, 0) / arr.length;

// Utility to calculate standard deviation
const stdDev = (arr: number[], avg: number) => {
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(average(squareDiffs));
};

export function detectAnomalies(
    trends: TrendData[],
    products: ProductStat[],
    agents: AgentStat[],
    repeatedImeis: Array<{ imei: string; count: number }> = [],
    attachmentGap: number = 0 // percentage of cases without attachments
): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // 1. REFUND SPIKE DETECTION
    // Look at the last 3 days of trend data vs the rolling average of the previous 30
    if (trends.length > 7) {
        const sortedTrends = [...trends].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const recent = sortedTrends.slice(-3);
        const historical = sortedTrends.slice(0, -3);

        const historicalAvgRefunds = average(historical.map(t => t.refundAmount));
        const recentAvgRefunds = average(recent.map(t => t.refundAmount));

        // Sensitivity: if recent is > 150% of historical average
        if (recentAvgRefunds > historicalAvgRefunds * 1.5 && recentAvgRefunds > 500) {
            anomalies.push({
                id: 'refund-spike',
                type: 'refund_spike',
                label: 'Refund Volume Spike',
                description: `Recent calculated refund volume (${recentAvgRefunds.toFixed(0)}) is 50% higher than historical average.`,
                severity: 'high',
                value: recentAvgRefunds,
                threshold: historicalAvgRefunds * 1.5
            });
        }
    }

    // 2. SKY FAILURE SPIKE
    // Check if any single SKU accounts for more than 15% of total returns (if total > 20)
    const totalReturns = products.reduce((acc, p) => acc + p.count, 0);
    if (totalReturns > 20) {
        products.forEach(product => {
            const rate = product.count / totalReturns;
            if (rate > 0.15) {
                anomalies.push({
                    id: `sku-${product.sku}`,
                    type: 'sku_failure',
                    label: 'SKU Failure Rate',
                    description: `Product ${product.sku} accounts for ${(rate * 100).toFixed(1)}% of all returns.`,
                    severity: rate > 0.25 ? 'high' : 'medium',
                    value: rate,
                    threshold: 0.15
                });
            }
        });
    }

    // 3. AGENT DEVIATION
    // This would ideally need "total cases handled" vs "refunded", but using raw counts for now:
    // If one agent has > 2x average refund value of others
    if (agents.length > 2) {
        const avgAgentRefund = average(agents.map(a => a.refundAmount));
        agents.forEach(agent => {
            if (agent.refundAmount > avgAgentRefund * 2.5 && agent.refundAmount > 1000) {
                anomalies.push({
                    id: `agent-${agent.agentName}`,
                    type: 'agent_deviation',
                    label: 'Agent Refund Anomaly',
                    description: `Agent ${agent.agentName} has processed 2.5x more refunds than team average.`,
                    severity: 'medium',
                    value: agent.refundAmount,
                    threshold: avgAgentRefund * 2.5
                });
            }
        });
    }

    // 4. REPEATED IMEI
    if (repeatedImeis.length > 0) {
        anomalies.push({
            id: 'imei-repeats',
            type: 'imei_repeat',
            label: 'Repeated Devices',
            description: `${repeatedImeis.length} devices have been returned multiple times. Potential fraud or repair failure.`,
            severity: 'high',
            value: repeatedImeis.length,
            threshold: 0
        });
    }

    // 5. ATTACHMENT GAP
    if (attachmentGap > 0.4) {
        anomalies.push({
            id: 'attachment-gap',
            type: 'attachment_missing',
            label: 'Documentation Gap',
            description: `${(attachmentGap * 100).toFixed(0)}% of recent returns are missing required photo attachments.`,
            severity: attachmentGap > 0.7 ? 'high' : 'medium',
            value: attachmentGap,
            threshold: 0.4
        });
    }

    return anomalies;
}
