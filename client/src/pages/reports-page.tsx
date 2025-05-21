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
import { Download, FileText, ClipboardList, CheckCircle, Loader2 } from "lucide-react";

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
  const [isExportingAll, setIsExportingAll] = useState(false);

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
    select: (data) => data || []
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
      let summary = '';

      switch (activeTab) {
        case 'documents':
          element = documentsChartRef.current;
          title = 'Reporte de Documentos';
          summary = `Total de Documentos: ${documents.length}\n` +
                   `Documentos Aprobados: ${documents.filter(d => d.status === 'approved').length}\n` +
                   `Documentos Pendientes: ${documents.filter(d => d.status === 'pending').length}\n` +
                   `Documentos en Borrador: ${documents.filter(d => d.status === 'draft').length}\n` +
                   `Documentos Rechazados: ${documents.filter(d => d.status === 'rejected').length}`;
          break;
        case 'approvals':
          element = approvalsChartRef.current;
          title = 'Reporte de Aprobaciones';
          summary = `Total de Aprobaciones: ${approvals.length}\n` +
                   `Aprobaciones Pendientes: ${approvals.filter(a => a.status === 'pending').length}\n` +
                   `Aprobaciones Aprobadas: ${approvals.filter(a => a.status === 'approved').length}\n` +
                   `Aprobaciones Rechazadas: ${approvals.filter(a => a.status === 'rejected').length}`;
          break;
        case 'tasks':
          element = tasksChartRef.current;
          title = 'Reporte de Tareas';
          summary = `Total de Tareas: ${tasks.length}\n` +
                   `Tareas Urgentes: ${tasks.filter(t => t.priority === 'urgent').length}\n` +
                   `Tareas de Alta Prioridad: ${tasks.filter(t => t.priority === 'high').length}\n` +
                   `Tareas de Media Prioridad: ${tasks.filter(t => t.priority === 'medium').length}\n` +
                   `Tareas de Baja Prioridad: ${tasks.filter(t => t.priority === 'low').length}`;
          break;
        case 'activity':
          element = activityChartRef.current;
          title = 'Reporte de Actividad';
          const activityData = getActivityTimeSeries();
          const totalActivity = activityData.datasets[0].data.reduce((a, b) => a + b, 0);
          summary = `Período: ${timePeriod === 'week' ? 'Semanal' : timePeriod === 'month' ? 'Mensual' : 'Anual'}\n` +
                   `Total de Actividades: ${totalActivity}\n` +
                   `Promedio de Actividades: ${(totalActivity / activityData.datasets[0].data.length).toFixed(1)}\n` +
                   `Máximo de Actividades: ${Math.max(...activityData.datasets[0].data)}\n` +
                   `Mínimo de Actividades: ${Math.min(...activityData.datasets[0].data)}`;
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

      // Add header with logo and title
      pdf.setFillColor(240, 240, 240);
      pdf.rect(0, 0, pdfWidth, 30, 'F');
      
      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.text(title, pdfWidth / 2, 20, { align: 'center' });

      // Add date and time
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const now = new Date();
      pdf.text(`Generado: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, pdfWidth / 2, 28, { align: 'center' });

      // Add executive summary
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Resumen Ejecutivo', 15, 40);
      
      pdf.setFontSize(10);
      const summaryLines = summary.split('\n');
      let yPosition = 45;
      summaryLines.forEach(line => {
        pdf.text(line, 15, yPosition);
        yPosition += 5;
      });

      // Add charts
      yPosition += 5;
      const imgWidth = pdfWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);

      // Add detailed statistics
      yPosition += imgHeight + 10;
      pdf.setFontSize(12);
      pdf.text('Estadísticas Detalladas', 15, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setDrawColor(0);
      pdf.setFillColor(240, 240, 240);

      // Add detailed statistics based on active tab
      if (activeTab === 'documents') {
        // Document categories
        pdf.text('Categorías de Documentos', 15, yPosition);
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
          pdf.text(`${category}: ${categoryValues[index]}`, 20, yPosition);
          yPosition += 5;
        });

        yPosition += 5;
        pdf.text('Estados de Documentos', 15, yPosition);
        yPosition += 6;

        const statuses = ['Borrador', 'Pendiente', 'Aprobado', 'Rechazado'];
        const statusValues = [
          documents.filter(d => d.status === 'draft').length,
          documents.filter(d => d.status === 'pending').length,
          documents.filter(d => d.status === 'approved').length,
          documents.filter(d => d.status === 'rejected').length
        ];

        statuses.forEach((status, index) => {
          pdf.text(`${status}: ${statusValues[index]}`, 20, yPosition);
          yPosition += 5;
        });
      } else if (activeTab === 'approvals') {
        // Approval details
        pdf.text('Detalles de Aprobaciones', 15, yPosition);
        yPosition += 6;

        const statuses = ['Pendientes', 'En Progreso', 'Aprobadas', 'Rechazadas'];
        const statusValues = [
          (approvals as Approval[]).filter(a => a.status === 'pending').length,
          (approvals as Approval[]).filter(a => a.status === 'in_progress').length,
          (approvals as Approval[]).filter(a => a.status === 'approved').length,
          (approvals as Approval[]).filter(a => a.status === 'rejected').length
        ];

        statuses.forEach((status, index) => {
          pdf.text(`${status}: ${statusValues[index]}`, 20, yPosition);
          yPosition += 5;
        });

        // Add approval timeline
        yPosition += 5;
        pdf.text('Línea de Tiempo de Aprobaciones', 15, yPosition);
        yPosition += 6;

        const recentApprovals = approvals
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        recentApprovals.forEach(approval => {
          const date = new Date(approval.createdAt).toLocaleDateString();
          pdf.text(`${date} - ${approval.status}`, 20, yPosition);
          yPosition += 5;
        });
      } else if (activeTab === 'tasks') {
        // Task details
        pdf.text('Detalles de Tareas', 15, yPosition);
        yPosition += 6;

        const priorities = ['Urgente', 'Alta', 'Media', 'Baja'];
        const priorityValues = [
          tasks.filter(t => t.priority === 'urgent').length,
          tasks.filter(t => t.priority === 'high').length,
          tasks.filter(t => t.priority === 'medium').length,
          tasks.filter(t => t.priority === 'low').length
        ];

        priorities.forEach((priority, index) => {
          pdf.text(`${priority}: ${priorityValues[index]}`, 20, yPosition);
          yPosition += 5;
        });

        // Add task status
        yPosition += 5;
        pdf.text('Estado de Tareas', 15, yPosition);
        yPosition += 6;

        const statuses = ['Pendiente', 'En Progreso', 'Completada'];
        const statusValues = [
          tasks.filter(t => t.status === 'pending').length,
          tasks.filter(t => t.status === 'in_progress').length,
          tasks.filter(t => t.status === 'completed').length
        ];

        statuses.forEach((status, index) => {
          pdf.text(`${status}: ${statusValues[index]}`, 20, yPosition);
          yPosition += 5;
        });
      } else if (activeTab === 'activity') {
        // Activity details
        pdf.text('Detalles de Actividad', 15, yPosition);
        yPosition += 6;

        const activityData = getActivityTimeSeries();
        activityData.labels.forEach((label, index) => {
          pdf.text(`${label}: ${activityData.datasets[0].data[index]} actividades`, 20, yPosition);
          yPosition += 5;
        });

        // Add activity trends
        yPosition += 5;
        pdf.text('Tendencias de Actividad', 15, yPosition);
        yPosition += 6;

        const data = activityData.datasets[0].data;
        const trend = data[data.length - 1] > data[0] ? 'Ascendente' : 'Descendente';
        const avgActivity = data.reduce((a, b) => a + b, 0) / data.length;
        
        pdf.text(`Tendencia: ${trend}`, 20, yPosition);
        yPosition += 5;
        pdf.text(`Promedio de Actividad: ${avgActivity.toFixed(1)}`, 20, yPosition);
      }

      // Add footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `Página ${i} de ${pageCount} - TaskTrackMaster`,
          pdfWidth / 2,
          pdfHeight - 10,
          { align: 'center' }
        );
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

  // Function to export all reports to PDF
  const exportAllToPdf = async () => {
    setIsExportingAll(true);

    try {
      const { jsPDF, html2canvas } = await loadPdfLibraries();

      if (!jsPDF || !html2canvas) {
        alert('Error loading PDF libraries. Please try again.');
        setIsExportingAll(false);
        return;
      }

      const doc = new jsPDF();
      let yOffset = 20;

      // Título del reporte
      doc.setFontSize(20);
      doc.text("Reporte General del Sistema", 105, yOffset, { align: "center" });
      yOffset += 20;

      // Fecha del reporte
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, yOffset, { align: "center" });
      yOffset += 20;

      // Resumen ejecutivo (3 líneas)
      doc.setFontSize(14);
      doc.text("Resumen Ejecutivo", 20, yOffset);
      yOffset += 10;

      doc.setFontSize(12);
      const summary = [
        `Total de documentos: ${documents?.length || 0}`,
        `Total de tareas: ${tasks?.length || 0}`,
        `Total de aprobaciones: ${approvals?.length || 0}`
      ];

      summary.forEach(line => {
        doc.text(line, 20, yOffset);
        yOffset += 10;
      });
      yOffset += 10;

      // Gráficas
      const charts = document.querySelectorAll('.chart-container');
      for (let i = 0; i < charts.length; i++) {
        try {
          const chart = charts[i];
          const canvas = await html2canvas(chart as HTMLElement);
          const imgData = canvas.toDataURL('image/png');
          
          // Añadir nueva página si es necesario
          if (yOffset > 250) {
            doc.addPage();
            yOffset = 20;
          }

          // Título de la gráfica
          doc.setFontSize(14);
          doc.text(chart.getAttribute('data-title') || `Gráfica ${i + 1}`, 20, yOffset);
          yOffset += 10;

          // Añadir la gráfica
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          doc.addImage(imgData, 'PNG', 20, yOffset, imgWidth, imgHeight);
          yOffset += imgHeight + 20;
        } catch (error) {
          console.error(`Error al procesar la gráfica ${i + 1}:`, error);
          continue;
        }
      }

      // Tablas de datos
      doc.addPage();
      yOffset = 20;

      // Tabla de documentos por departamento
      if (documents && documents.length > 0) {
        doc.setFontSize(14);
        doc.text("Documentos por Departamento", 20, yOffset);
        yOffset += 10;

        const docData = documents.map(item => [item.department || 'Sin Departamento', '1']);
        doc.autoTable({
          startY: yOffset,
          head: [['Departamento', 'Cantidad']],
          body: docData,
          theme: 'grid'
        });
        yOffset = (doc as any).lastAutoTable.finalY + 10;
      }

      // Tabla de tareas por estado
      if (tasks && tasks.length > 0) {
        doc.setFontSize(14);
        doc.text("Tareas por Estado", 20, yOffset);
        yOffset += 10;

        const taskData = tasks.map(item => [item.status || 'Sin Estado', '1']);
        doc.autoTable({
          startY: yOffset,
          head: [['Estado', 'Cantidad']],
          body: taskData,
          theme: 'grid'
        });
        yOffset = (doc as any).lastAutoTable.finalY + 10;
      }

      // Tabla de aprobaciones por estado
      if (approvals && approvals.length > 0) {
        doc.setFontSize(14);
        doc.text("Aprobaciones por Estado", 20, yOffset);
        yOffset += 10;

        const approvalData = approvals.map(item => [item.status || 'Sin Estado', '1']);
        doc.autoTable({
          startY: yOffset,
          head: [['Estado', 'Cantidad']],
          body: approvalData,
          theme: 'grid'
        });
      }

      // Guardar el PDF
      doc.save(`reporte_general_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setIsExportingAll(false);
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

  const approvalsByStatus = {
    labels: ['Pendientes', 'En Progreso', 'Aprobadas', 'Rechazadas'],
    datasets: [{
      data: [
        (approvals as Approval[]).filter(a => a.status === 'pending').length,
        (approvals as Approval[]).filter(a => a.status === 'in_progress').length,
        (approvals as Approval[]).filter(a => a.status === 'approved').length,
        (approvals as Approval[]).filter(a => a.status === 'rejected').length
      ],
      backgroundColor: [
        'rgba(255, 193, 7, 0.6)',   // Amarillo para pendientes
        'rgba(54, 162, 235, 0.6)',  // Azul para en progreso
        'rgba(40, 167, 69, 0.6)',   // Verde para aprobadas
        'rgba(220, 53, 69, 0.6)'    // Rojo para rechazadas
      ],
      borderColor: [
        'rgba(255, 193, 7, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(40, 167, 69, 1)',
        'rgba(220, 53, 69, 1)'
      ],
      borderWidth: 1
    }]
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

          <div className="flex gap-2">
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

            {/* <Button 
              variant="default" 
              size="sm" 
              onClick={exportAllToPdf} 
              disabled={isExportingAll}
              className="flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              {isExportingAll ? 'Exportando Todo...' : 'Exportar Todo'}
            </Button> */}
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={approvalsChartRef}>
            <Card>
              <CardHeader>
                <CardTitle>Estado de Aprobaciones</CardTitle>
                <CardDescription>Distribución de aprobaciones por estado</CardDescription>
              </CardHeader>
              <CardContent>
                {approvals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
                    <p>No hay datos de aprobaciones disponibles</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <Pie 
                      data={approvalsByStatus}
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              padding: 20,
                              font: {
                                size: 12
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline de Aprobaciones</CardTitle>
                <CardDescription>Actividad de aprobaciones en el tiempo</CardDescription>
              </CardHeader>
              <CardContent>
                {approvals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
                    <p>No hay datos de aprobaciones disponibles</p>
                  </div>
                ) : (
                  <div className="h-80">
                    <Bar 
                      data={{
                        labels: ['Pendientes', 'En Progreso', 'Aprobadas', 'Rechazadas'],
                        datasets: [{
                          label: 'Cantidad de Aprobaciones',
                          data: [
                            (approvals as Approval[]).filter(a => a.status === 'pending').length,
                            (approvals as Approval[]).filter(a => a.status === 'in_progress').length,
                            (approvals as Approval[]).filter(a => a.status === 'approved').length,
                            (approvals as Approval[]).filter(a => a.status === 'rejected').length
                          ],
                          backgroundColor: [
                            'rgba(255, 193, 7, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(40, 167, 69, 0.6)',
                            'rgba(220, 53, 69, 0.6)'
                          ],
                          borderColor: [
                            'rgba(255, 193, 7, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(40, 167, 69, 1)',
                            'rgba(220, 53, 69, 1)'
                          ],
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            display: false
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
