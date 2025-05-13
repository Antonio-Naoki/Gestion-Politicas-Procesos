import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image,
  Paperclip,
  X,
  Plus
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDocumentSchema, InsertDocument } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface NewDocumentModalProps {
  open: boolean;
  onClose: () => void;
}

// Extended schema with validation
const documentFormSchema = insertDocumentSchema.extend({
  // Ensure title and content are not empty
  title: z.string().min(1, { message: "El título es obligatorio" }),
  content: z.string().min(1, { message: "El contenido es obligatorio" }),
  department: z.string().min(1, { message: "El departamento es obligatorio" }),
  category: z.string().min(1, { message: "La categoría es obligatoria" }),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

export function NewDocumentModal({ open, onClose }: NewDocumentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewers, setReviewers] = useState<number[]>([]);
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      department: user?.department || "",
      category: "",
      status: "draft",
      version: "1.0",
      createdBy: user?.id || 0,
    },
  });
  
  // Query to get users who can be reviewers (managers, coordinators)
  const { data: potentialReviewers } = useQuery({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => 
      ["manager", "coordinator", "admin"].includes(user.role)
    ),
    enabled: open && (user?.role === "admin" || user?.role === "manager" || user?.role === "coordinator"),
  });
  
  const createDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormValues) => {
      const response = await apiRequest("POST", "/api/documents", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento creado",
        description: "El documento se ha creado exitosamente.",
      });
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Hubo un error al crear el documento",
        variant: "destructive",
      });
    },
  });
  
  const submitForApprovalMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/submit`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento enviado",
        description: "El documento se ha enviado para aprobación exitosamente.",
      });
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Hubo un error al enviar el documento para aprobación",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (data: DocumentFormValues, asDraft: boolean = true) => {
    try {
      // Create document
      const document = await createDocumentMutation.mutateAsync({
        ...data,
        status: asDraft ? "draft" : "pending",
      });
      
      // If not draft, submit for approval
      if (!asDraft) {
        await submitForApprovalMutation.mutateAsync(document.id);
      }
    } catch (error) {
      // Error is handled in the mutation callbacks
    }
  };
  
  const handleSaveAsDraft = () => {
    handleSubmit((data) => onSubmit(data, true))();
  };
  
  const handleSubmitForApproval = () => {
    handleSubmit((data) => onSubmit(data, false))();
  };
  
  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-neutral-900">Crear Nuevo Documento</DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          <form className="space-y-6">
            <div>
              <Label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
                Título del Documento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Ingrese el título del documento"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department" className="block text-sm font-medium text-neutral-700 mb-1">
                  Departamento <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Production">Producción</SelectItem>
                        <SelectItem value="Quality">Control de Calidad</SelectItem>
                        <SelectItem value="HR">Recursos Humanos</SelectItem>
                        <SelectItem value="Logistics">Logística</SelectItem>
                        <SelectItem value="Sales">Ventas</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.department && (
                  <p className="text-xs text-destructive mt-1">{errors.department.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-1">
                  Categoría <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="process">Proceso Operativo</SelectItem>
                        <SelectItem value="policy">Política</SelectItem>
                        <SelectItem value="instruction">Instructivo</SelectItem>
                        <SelectItem value="procedure">Procedimiento</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-xs text-destructive mt-1">{errors.category.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                Descripción
              </Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Breve descripción del documento"
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="content" className="block text-sm font-medium text-neutral-700 mb-1">
                Contenido <span className="text-destructive">*</span>
              </Label>
              <div className="border border-neutral-300 rounded-md shadow-sm">
                <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-300 flex items-center space-x-2">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Bold className="h-4 w-4 text-neutral-700" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Italic className="h-4 w-4 text-neutral-700" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <List className="h-4 w-4 text-neutral-700" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <ListOrdered className="h-4 w-4 text-neutral-700" />
                  </Button>
                  <div className="h-4 w-px bg-neutral-300 mx-1"></div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <LinkIcon className="h-4 w-4 text-neutral-700" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Image className="h-4 w-4 text-neutral-700" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Paperclip className="h-4 w-4 text-neutral-700" />
                  </Button>
                </div>
                <Textarea
                  id="content"
                  {...register("content")}
                  rows={8}
                  className="w-full border-none focus:outline-none focus:ring-0"
                  placeholder="Escriba el contenido del documento aquí..."
                />
              </div>
              {errors.content && (
                <p className="text-xs text-destructive mt-1">{errors.content.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="reviewers" className="block text-sm font-medium text-neutral-700 mb-1">
                Revisores
              </Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione revisores" />
                </SelectTrigger>
                <SelectContent>
                  {potentialReviewers ? (
                    potentialReviewers.map((reviewer) => (
                      <SelectItem key={reviewer.id} value={reviewer.id.toString()}>
                        {reviewer.name} ({reviewer.role === "manager" ? "Manager" : 
                         reviewer.role === "coordinator" ? "Coordinador" : "Admin"} de {reviewer.department})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading">Cargando revisores...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-neutral-500">
                Los revisores serán asignados automáticamente según la jerarquía.
              </p>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end space-x-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="secondary"
            onClick={handleSaveAsDraft}
            disabled={isSubmitting}
          >
            Guardar como Borrador
          </Button>
          <Button 
            type="button" 
            variant="default"
            className="bg-primary hover:bg-primary/90"
            onClick={handleSubmitForApproval}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              <span>Enviar para Aprobación</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
