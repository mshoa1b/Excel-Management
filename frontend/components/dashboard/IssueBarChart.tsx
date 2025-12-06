import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IssueBarChartProps {
    title: string;
    data: Array<{
        issue?: string;
        name?: string;
        count: number;
        percentage?: number;
    }>;
    height?: number;
}

export default function IssueBarChart({ title, data, height = 300 }: IssueBarChartProps) {
    // Truncate long issue names for display
    const formattedData = data.map(item => {
        const label = item.issue || item.name || 'Unknown';
        return {
            ...item,
            displayIssue: label.length > 30 ? label.substring(0, 27) + '...' : label,
            originalLabel: label
        };
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={formattedData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            type="number"
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            type="category"
                            dataKey="displayIssue"
                            stroke="#64748b"
                            style={{ fontSize: '11px' }}
                            width={150}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px'
                            }}
                            formatter={(value: any, name: string) => {
                                if (name === 'count') return [value, 'Count'];
                                if (name === 'percentage') return [`${value}%`, 'Percentage'];
                                return [value, name];
                            }}
                            labelFormatter={(label: string) => {
                                const item = formattedData.find(d => d.displayIssue === label);
                                return item?.originalLabel || label;
                            }}
                        />
                        <Bar
                            dataKey="count"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                            name="Count"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
