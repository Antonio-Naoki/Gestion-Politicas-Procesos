import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function ReportsPage() {
  const [timePeriod, setTimePeriod] = useState("month");
  
  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
  });
  
  const { data: approvals } = useQuery({
    queryKey: ["/api/approvals"],
  });
  
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
  });
  
  const { data: activities } = useQuery({
    queryKey: ["/api/activities"],
  });

  // Processing data for charts
  const documentsByCategory = {
    labels: ['Proceso', 'Política', 'Instructivo', 'Procedimiento', 'Manual', 'Otro'],
    datasets: [
      {
        label: 'Documentos por Categoría',
        data: [
          documents?.filter(d => d.category === 'process').length || 0,
          documents?.filter(d => d.category === 'policy').length || 0,
          documents?.filter(d => d.category === 'instruction').length || 0,
          documents?.filter(d => d.category === 'procedure').length || 0,
          documents?.filter(d => d.category === 'manual').length || 0,
          documents?.filter(d => !['process', 'policy', 'instruction', 'procedure', 'manual'].includes(d.category)).length || 0,
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const documentsByStatus = {
    labels: ['Borrador', 'Pendiente', 'Aprobado', 'Rechazado'],
    datasets: [
      {
        label: 'Documentos por Estado',
        data: [
          documents?.filter(d => d.status === 'draft').length || 0,
          documents?.filter(d => d.status === 'pending').length || 0,
          documents?.filter(d => d.status === 'approved').length || 0,
          documents?.filter(d => d.status === 'rejected').length || 0,
        ],
        backgroundColor: [
          'rgba(128, 128, 128, 0.6)',
          'rgba(255, 193, 7, 0.6)',
          'rgba(40, 167, 69, 0.6)',
          'rgba(220, 53, 69, 0.6)',
        ],
        borderColor: [
          'rgba(128, 128, 128, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(40, 167, 69, 1)',
          'rgba(220, 53, 69, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const tasksByPriority = {
    labels: ['Baja', 'Media', 'Alta', 'Urgente'],
    datasets: [
      {
        label: 'Tareas por Prioridad',
        data: [
          tasks?.filter(t => t.priority === 'low').length || 0,
          tasks?.filter(t => t.priority === 'medium').length || 0,
          tasks?.filter(t => t.priority === 'high').length || 0,
          tasks?.filter(t => t.priority === 'urgent').length || 0,
        ],
        backgroundColor: [
          'rgba(40, 167, 69, 0.6)',
          'rgba(255, 193, 7, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(220, 53, 69, 0.6)',
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(220, 53, 69, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Simulate activity by month (since we don't have date filtering yet)
  const getActivityTimeSeries = () => {
    let labels = [];
    let data = [];
    
    if (timePeriod === 'week') {
      labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      data = [5, 8, 12, 7, 10, 3, 1]; // Example data
    } else if (timePeriod === 'month') {
      labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
      data = [15, 23, 18, 25]; // Example data
    } else if (timePeriod === 'year') {
      labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      data = [30, 45, 40, 35, 60, 55, 65, 70, 60, 50, 65, 75]; // Example data
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Actividad',
          data,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true
        },
      ],
    };
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reportes y Estadísticas</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza métricas y estadísticas del sistema
        </p>
      </div>

      <Tabs defaultValue="documents">
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="approvals">Aprobaciones</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentos por Categoría</CardTitle>
                <CardDescription>Distribución de documentos según su categoría</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Pie data={documentsByCategory} options={{ maintainAspectRatio: false }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos por Estado</CardTitle>
                <CardDescription>Distribución de documentos según su estado actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar data={documentsByStatus} options={{ maintainAspectRatio: false }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Aprobaciones</CardTitle>
              <CardDescription>Resumen del estado de todas las solicitudes de aprobación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Pie 
                  data={{
                    labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
                    datasets: [{
                      data: [
                        approvals?.filter(a => a.status === 'pending').length || 0,
                        approvals?.filter(a => a.status === 'approved').length || 0, 
                        approvals?.filter(a => a.status === 'rejected').length || 0
                      ],
                      backgroundColor: [
                        'rgba(255, 193, 7, 0.6)',
                        'rgba(40, 167, 69, 0.6)',
                        'rgba(220, 53, 69, 0.6)'
                      ],
                      borderColor: [
                        'rgba(255, 193, 7, 1)',
                        'rgba(40, 167, 69, 1)',
                        'rgba(220, 53, 69, 1)'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{ maintainAspectRatio: false }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Tareas por Prioridad</CardTitle>
              <CardDescription>Distribución de tareas según su nivel de prioridad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar 
                  data={tasksByPriority}
                  options={{ maintainAspectRatio: false }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Actividad del Sistema</CardTitle>
                <CardDescription>Volumen de actividad durante el período seleccionado</CardDescription>
              </div>
              <div className="w-48">
                <Label htmlFor="time-period">Período</Label>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger id="time-period">
                    <SelectValue placeholder="Seleccionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                    <SelectItem value="year">Año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line 
                  data={getActivityTimeSeries()}
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}