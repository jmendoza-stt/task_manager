import { cn } from "@/utils";
import type { Task } from "@/lib/api";

const statusConfig: Record<Task["status"], { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    className: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  },
};

const priorityConfig: Record<Task["priority"], { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  },
  medium: {
    label: "Medium",
    className: "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400",
  },
  high: {
    label: "High",
    className: "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400",
  },
};

export function StatusBadge({ status }: { status: Task["status"] }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Task["priority"] }) {
  const config = priorityConfig[priority];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
