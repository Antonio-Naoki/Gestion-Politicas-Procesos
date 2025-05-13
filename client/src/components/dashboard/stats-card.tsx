import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  changeValue?: number;
  changeText?: string;
  progress?: number;
  progressColor?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  changeValue,
  changeText,
  progress,
  progressColor = "bg-info"
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${iconBgColor} ${iconColor}`}>
            {icon}
          </div>
          <div className="ml-4">
            <h3 className="text-sm text-neutral-500 font-medium">{title}</h3>
            <span className="text-2xl font-semibold text-neutral-900">{value}</span>
          </div>
        </div>
        <div className="mt-4">
          {changeValue !== undefined && changeText && (
            <div className="flex items-center text-sm">
              <span className={`${changeValue >= 0 ? 'text-success' : 'text-destructive'} flex items-center`}>
                {changeValue >= 0 ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                {Math.abs(changeValue)}%
              </span>
              <span className="ml-2 text-neutral-500">{changeText}</span>
            </div>
          )}
          
          {progress !== undefined && (
            <>
              <div className="flex items-center text-sm">
                <span className="text-neutral-500">{progress}% de aceptación</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-1">
                <div className={`${progressColor} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
