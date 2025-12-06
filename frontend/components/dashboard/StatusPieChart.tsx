import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusPieChartProps {
    title: string;
    data: Array<{
        status: string;
        count: number;
    }>;
    height?: number;
}

const COLORS = {
    'Pending': '#fbbf24',
    'In Progress': '#3b82f6',
    'Resolved': '#10b981',
    'default': '#94a3b8'
};

export default function StatusPieChart({ title, data, height = 300 }: StatusPieChartProps) {
    const formattedData = data.map(item => ({
        name: item.status,
        value: item.count
    }));

    const getColor = (status: string) => {
        return COLORS[status as keyof typeof COLORS] || COLORS.default;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={height}>
                    <PieChart>
                        <Pie
                            data={formattedData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {formattedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px'
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
