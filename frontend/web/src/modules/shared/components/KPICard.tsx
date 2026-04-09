import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconColor?: string;
  type?: 'success' | 'info' | 'warning' | 'danger';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  iconColor,
  type = 'info',
}) => {
  const theme = useTheme();

  // Colores según tipo (usa palette del tema)
  const getIconColor = () => {
    if (iconColor) return iconColor;
    switch (type) {
      case 'success':
        return theme.palette.success.main;
      case 'info':
        return theme.palette.info.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'danger':
        return theme.palette.error.main;
      default:
        return theme.palette.primary.main;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          height: '100%',
          bgcolor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          borderRadius: '8px',
          transition: 'box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                bgcolor: '#f9fafb',
                borderRadius: '10px',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getIconColor(),
              }}
            >
              {icon}
            </Box>
            {trend && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: trend.isPositive ? theme.palette.success.main : theme.palette.error.main,
                }}
              >
                {trend.isPositive ? (
                  <TrendingUp sx={{ fontSize: 16 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16 }} />
                )}
                <Typography 
                  variant="caption" 
                  fontWeight={600}
                  sx={{ fontSize: '0.75rem' }}
                >
                  {trend.value}
                </Typography>
              </Box>
            )}
          </Box>

          <Typography
            variant="h3"
            fontWeight={700}
            sx={{
              mb: 0.5,
              color: '#111827',
              fontSize: '2rem',
            }}
          >
            {value}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: '#6b7280',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            {title}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};
