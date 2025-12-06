import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PlatformComparisonProps {
    title: string;
    platforms: {
        [key: string]: {
            totalOrders: number;
            totalRefunds: number;
            avgRefund: number;
        };
    };
    height?: number;
}

export default function PlatformComparison({ title, platforms, height = 300 }: PlatformComparisonProps) {
    // Transform platforms object into array for chart
    const data = Object.entries(platforms).map(([name, stats]) => ({
        platform: name.charAt(0).toUpperCase() + name.slice(1),
        orders: stats.totalOrders,
        refunds: stats.totalRefunds,
        avgRefund: stats.avgRefund
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="platform"
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px'
                            }}
                            formatter={(value: any, name: string) => {
                                if (name === 'orders') return [value, 'Total Orders'];
                                if (name === 'refunds') return [`$${value.toFixed(2)}`, 'Total Refunds'];
                                if (name === 'avgRefund') return [`$${value.toFixed(2)}`, 'Avg Refund'];
                                return [value, name];
                            }}
                        />
                        <Legend />
                        <Bar dataKey="orders" fill="#ff9900" name="Orders" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="refunds" fill="#00a699" name="Refunds ($)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
