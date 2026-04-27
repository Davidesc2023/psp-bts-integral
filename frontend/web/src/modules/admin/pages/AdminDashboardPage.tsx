import React from 'react';
import { Grid, Card, CardActionArea, CardContent, Typography, Box } from '@mui/material';
import {
  Business,
  LocalHospital,
  LocalShipping,
  LocationCity,
  MedicalServices,
  Science,
  Biotech,
  People,
  Medication,
  LocalPharmacy,
  History,
  Tune,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface AdminCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const adminCards: AdminCard[] = [
  {
    title: 'EPS',
    description: 'Gestión de Entidades Promotoras de Salud',
    icon: <Business sx={{ fontSize: 40 }} />,
    path: '/admin/eps',
    color: '#0E7490',
  },
  {
    title: 'IPS',
    description: 'Instituciones Prestadoras de Servicios de Salud',
    icon: <LocalHospital sx={{ fontSize: 40 }} />,
    path: '/admin/ips',
    color: '#0369A1',
  },
  {
    title: 'Operadores Logísticos',
    description: 'Empresas de distribución y logística',
    icon: <LocalShipping sx={{ fontSize: 40 }} />,
    path: '/admin/logistics-operators',
    color: '#7C3AED',
  },
  {
    title: 'Ciudades',
    description: 'Gestión de municipios y ciudades',
    icon: <LocationCity sx={{ fontSize: 40 }} />,
    path: '/admin/cities',
    color: '#059669',
  },
  {
    title: 'Diagnósticos CIE-10',
    description: 'Catálogo de diagnósticos internacionales',
    icon: <MedicalServices sx={{ fontSize: 40 }} />,
    path: '/admin/diagnosticos-cie10',
    color: '#DC2626',
  },
  {
    title: 'Programas PSP',
    description: 'Programas de soporte a pacientes',
    icon: <Science sx={{ fontSize: 40 }} />,
    path: '/admin/programas-psp',
    color: '#D97706',
  },
  {
    title: 'Tipos Paraclínico',
    description: 'Tipos de exámenes y estudios paraclínicos',
    icon: <Biotech sx={{ fontSize: 40 }} />,
    path: '/admin/tipos-paraclinico',
    color: '#0891B2',
  },
  {
    title: 'Medicamentos',
    description: 'Catálogo de medicamentos del sistema',
    icon: <Medication sx={{ fontSize: 40 }} />,
    path: '/admin/medicamentos',
    color: '#B91C1C',
  },
  {
    title: 'Médicos Prescriptores',
    description: 'Médicos autorizados para prescripciones',
    icon: <LocalPharmacy sx={{ fontSize: 40 }} />,
    path: '/admin/medicos',
    color: '#4338CA',
  },
  {
    title: 'Usuarios',
    description: 'Gestión de cuentas y roles de usuario',
    icon: <People sx={{ fontSize: 40 }} />,
    path: '/admin/users',
    color: '#374151',
  },
  {
    title: 'Auditoría',
    description: 'Registro de operaciones críticas del sistema',
    icon: <History sx={{ fontSize: 40 }} />,
    path: '/admin/auditoria',
    color: '#6D28D9',
  },
  {
    title: 'Estados de Paciente',
    description: 'Configura los estados disponibles y sus campos requeridos',
    icon: <Tune sx={{ fontSize: 40 }} />,
    path: '/admin/estados-config',
    color: '#0E7490',
  },
];

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5}>
        Panel de Administración
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Gestiona los catálogos del sistema y los usuarios de la plataforma PSP
      </Typography>

      <Grid container spacing={3}>
        {adminCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={card.path}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                height: '100%',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 4 },
              }}
            >
              <CardActionArea
                onClick={() => navigate(card.path)}
                sx={{ height: '100%', p: 0.5 }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Box sx={{ color: card.color, mb: 1.5 }}>{card.icon}</Box>
                  <Typography variant="h6" fontWeight={700} color="#111827" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdminDashboardPage;
