import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Clock, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { User, Document, Approval } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface PendingApprovalsProps {
  onViewDocument: (document: Document) => void;
  recentApprovals: Array<{
    id: number;
    document: Document;
    status: string;
    createdAt: string;
  }>;
}

export function PendingApprovals({ onViewDocument, recentApprovals }: PendingApprovalsProps) {
  const { user } = useAuth();
  
  const { data: approvals, isLoading, refetch } = useQuery<ExtendedApproval[]>({
    queryKey: ["/api/approvals"],
    select: (data) => {
      // Filter only pending approvals
      return data.filter((approval) => approval.status === "pending");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-secondary" />
          Aprobaciones Pendientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentApprovals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No hay aprobaciones pendientes
          </div>
        ) : (
          <div className="space-y-4">
            {recentApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start justify-between p-3 rounded-lg hover:bg-accent"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {approval.document.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {approval.document.department}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(approval.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-500"
                    onClick={() => onViewDocument(approval.document)}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Detalles
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
