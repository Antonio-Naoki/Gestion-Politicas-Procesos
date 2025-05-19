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
import { useState, useRef } from "react";
import { Document, Approval, Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("documents");
  const [isExporting, setIsExporting] = useState(false);

  // References to chart containers
  const documentsChartRef = useRef(null);
  const approvalsChartRef = useRef(null);
  const tasksChartRef = useRef(null);
  const activityChartRef = useRef(null);

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: approvals = [] } = useQuery<Approval[]>({
    queryKey: ["/api/approvals"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ["/api/activities"],
  });

  // Function to dynamically load jsPDF and html2canvas
  const loadPdfLibraries = async () => {
    try {
      const jsPDFModule = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm');
      const html2canvasModule = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
      return {
        jsPDF: jsPDFModule.default,
        html2canvas: html2canvasModule.default
      };
    } catch (error) {
      console.error('Error loading PDF libraries:', error);
      return null;
    }
  };

  // Function to export the current tab to PDF
  const exportToPdf = async () => {
    setIsExporting(true);

    try {
      const { jsPDF, html2canvas } = await loadPdfLibraries();

      if (!jsPDF || !html2canvas) {
        alert('Error loading PDF libraries. Please try again.');
        setIsExporting(false);
        return;
      }

      let element;
      let title = '';

      switch (activeTab) {
        case 'documents':
          element = documentsChartRef.current;
          title = 'Reporte de Documentos';
          break;
        case 'approvals':
          element = approvalsChartRef.current;
          title = 'Reporte de Aprobaciones';
          break;
        case 'tasks':
          element = tasksChartRef.current;
          title = 'Reporte de Tareas';
          break;
        case 'activity':
          element = activityChartRef.current;
          title = 'Reporte de Actividad';
          break;
        default:
          element = null;
      }

      if (!element) {
        alert('No se pudo generar el PDF. Inténtelo de nuevo.');
        setIsExporting(false);
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add title
      pdf.setFontSize(16);
      pdf.text(title, pdfWidth / 2, 15, { align: 'center' });

      // Add date
      pdf.setFontSize(10);
      pdf.text(`Generado: ${new Date().toLocaleDateString()}`, pdfWidth / 2, 22, { align: 'center' });

      // Calculate image dimensions to fit the page
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image
      pdf.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);

      // Add data table for the report
      let yPosition = 30 + imgHeight + 10;

      // Add table header
      pdf.setFontSize(12);
      pdf.text('Datos del Reporte', 10, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setDrawColor(0);
      pdf.setFillColor(240, 240, 240);

      // Add table content based on active tab
      if (activeTab === 'documents') {
        // Document statistics
        pdf.text('Categoría', 15, yPosition);
        pdf.text('Cantidad', 80, yPosition);
        yPosition += 6;

        const categories = ['Proceso', 'Política', 'Instructivo', 'Procedimiento', 'Manual', 'Otro'];
        const categoryValues = [
          documents.filter(d => d.category === 'process').length,
          documents.filter(d => d.category === 'policy').length,
          documents.filter(d => d.category === 'instruction').length,
          documents.filter(d => d.category === 'procedure').length,
          documents.filter(d => d.category === 'manual').length,
          documents.filter(d => !['process', 'policy', 'instruction', 'procedure', 'manual'].includes(d.category)).length
        ];

        categories.forEach((category, index) => {
          pdf.text(category, 15, yPosition);
          pdf.text(categoryValues[index].toString(), 80, yPosition);
          yPosition += 6;
        });

        yPosition += 6;
        pdf.text('Estado', 15, yPosition);
        pdf.text('Cantidad', 80, yPosition);
        yPosition += 6;

        const statuses = ['Borrador', 'Pendiente', 'Aprobado', 'Rechazado'];
        const statusValues = [
          documents.filter(d => d.status === 'draft').length,
          documents.filter(d => d.status === 'pending').length,
          documents.filter(d => d.status === 'approved').length,
          documents.filter(d => d.status === 'rejected').length
        ];

        statuses.forEach((status, index) => {
          pdf.text(status, 15, yPosition);
          pdf.text(statusValues[index].toString(), 80, yPosition);
          yPosition += 6;
        });
      } else if (activeTab === 'approvals') {
        // Approval statistics
        pdf.text('Estado', 15, yPosition);
        pdf.text('Cantidad', 80, yPosition);
        yPosition += 6;

        const statuses = ['Pendientes', 'Aprobadas', 'Rechazadas'];
        const statusValues = [
          approvals.filter(a => a.status === 'pending').length,
          approvals.filter(a => a.status === 'approved').length,
          approvals.filter(a => a.status === 'rejected').length
        ];

        statuses.forEach((status, index) => {
          pdf.text(status, 15, yPosition);
          pdf.text(statusValues[index].toString(), 80, yPosition);
          yPosition += 6;
        });
      } else if (activeTab === 'tasks') {
        // Task statistics
        pdf.text('Prioridad', 15, yPosition);
        pdf.text('Cantidad', 80, yPosition);
        yPosition += 6;

        const priorities = ['Baja', 'Media', 'Alta', 'Urgente'];
        const priorityValues = [
          tasks.filter(t => t.priority === 'low').length,
          tasks.filter(t => t.priority === 'medium').length,
          tasks.filter(t => t.priority === 'high').length,
          tasks.filter(t => t.priority === 'urgent').length
        ];

        priorities.forEach((priority, index) => {
          pdf.text(priority, 15, yPosition);
          pdf.text(priorityValues[index].toString(), 80, yPosition);
          yPosition += 6;
        });
      } else if (activeTab === 'activity') {
        // Activity statistics
        pdf.text('Período', 15, yPosition);
        pdf.text('Actividades', 80, yPosition);
        yPosition += 6;

        const activityData = getActivityTimeSeries();

        activityData.labels.forEach((label, index) => {
          pdf.text(label, 15, yPosition);
          pdf.text(activityData.datasets[0].data[index].toString(), 80, yPosition);
          yPosition += 6;
        });
      }

      // Save PDF
      pdf.save(`reporte_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

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

      <Tabs defaultValue="documents" onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="approvals">Aprobaciones</TabsTrigger>
            <TabsTrigger value="tasks">Tareas</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
          </TabsList>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToPdf} 
            disabled={isExporting}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </div>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={documentsChartRef}>
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
          <Card ref={approvalsChartRef}>
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
          <Card ref={tasksChartRef}>
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
          <Card ref={activityChartRef}>
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
