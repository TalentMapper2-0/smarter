import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Panel, type PanelPosition } from "@xyflow/react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type FlowAlertStatus = "success" | "warning" | "error" | "info";

type FlowAlertPanelProps = {
  status?: FlowAlertStatus;
  title?: string;
  message: string;
  position?: PanelPosition;
  className?: string;
};

const alertStyles: Record<FlowAlertStatus, string> = {
  success: "border-green-300 bg-green-50 text-green-900 [&>svg]:text-green-600",
  warning:
    "border-yellow-300 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-600",
  error: "border-red-300 bg-red-50 text-red-900 [&>svg]:text-red-600",
  info: "border-blue-300 bg-blue-50 text-blue-900 [&>svg]:text-blue-600",
};

const alertIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const defaultTitles: Record<FlowAlertStatus, string> = {
  success: "Success",
  warning: "Warning",
  error: "Error",
  info: "Info",
};

export function FlowAlertPanel({
  status = "info",
  title,
  message,
  position = "top-center",
  className,
}: FlowAlertPanelProps) {
  const Icon = alertIcons[status];

  return (
    <Panel position={position} className="pointer-events-none w-full px-4">
      <div className="mx-auto mt-3 max-w-xl">
        <Alert
          className={cn(
            "pointer-events-auto shadow-md",
            alertStyles[status],
            className
          )}
        >
          <Icon className="h-4 w-4" />
          <AlertTitle>{title ?? defaultTitles[status]}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </div>
    </Panel>
  );
}
