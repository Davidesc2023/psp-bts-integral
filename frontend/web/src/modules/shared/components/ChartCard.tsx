import { Card, CardContent, CardHeader, Box, useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: 'line' | 'area' | 'bar' | 'pie';
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  colors?: string[];
  height?: number;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  type,
  data,
  dataKey,
  xAxisKey = 'name',
  color,
  colors,
  height = 300,
}) => {
  const theme = useTheme();
  const defaultColor = color || theme.palette.primary.main;
  const defaultColors = colors || [
    theme.palette.primary.main,
    theme.palette.info.main,
    theme.palette.warning.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
  ];
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    // Configuración común para tooltips Sypher
    const tooltipStyle = {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    };

    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey={xAxisKey} 
                stroke="#6b7280" 
                style={{ fontSize: '12px', fontWeight: 500 }} 
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px', fontWeight: 500 }} 
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={defaultColor}
                strokeWidth={2.5}
                dot={{ fill: defaultColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={defaultColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={defaultColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey={xAxisKey} 
                stroke="#6b7280" 
                style={{ fontSize: '12px', fontWeight: 500 }} 
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px', fontWeight: 500 }} 
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={defaultColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey={xAxisKey} 
                stroke="#6b7280" 
                style={{ fontSize: '12px', fontWeight: 500 }} 
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '12px', fontWeight: 500 }} 
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey={dataKey} fill={defaultColor} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill={defaultColor}
                dataKey={dataKey}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        bgcolor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        borderRadius: '8px',
        '&:hover': {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
        transition: 'box-shadow 0.2s ease-in-out',
      }}
    >
      <CardHeader
        title={title}
        subheader={subtitle}
        titleTypographyProps={{ 
          variant: 'h6', 
          fontWeight: 600,
          sx: { color: '#111827', fontSize: '1rem' }
        }}
        subheaderTypographyProps={{ 
          variant: 'body2', 
          sx: { color: '#6b7280', fontSize: '0.875rem' }
        }}
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        <Box sx={{ width: '100%', height }}>
          {renderChart()}
        </Box>
      </CardContent>
    </Card>
  );
};
