import { observer } from "mobx-react-lite";
import { tasksStore } from "@/stores/tasks-store";
import { PriorityBadge } from "./TaskBadge";
import type { Task } from "@/lib/api";
import { cn } from "@/utils";

interface Props {
  onEdit: (task: Task) => void;
  onCreateInColumn: (status: Task["status"]) => void;
}

const COLUMNS: { key: Task["status"]; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "border-t-warning-500" },
  { key: "in_progress", label: "In Progress", color: "border-t-blue-500" },
  { key: "completed", label: "Completed", color: "border-t-success-500" },
];

const TaskKanbanView = observer(function TaskKanbanView({ onEdit, onCreateInColumn }: Props) {
  const { tasksByStatus, loading } = tasksStore;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent, targetStatus: Task["status"]) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      tasksStore.moveTask(taskId, targetStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {COLUMNS.map((column) => {
        const tasks = tasksByStatus[column.key];
        return (
          <div
            key={column.key}
            onDrop={(e) => handleDrop(e, column.key)}
            onDragOver={handleDragOver}
            className={cn(
              "flex flex-col rounded-xl border border-gray-200 border-t-4 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50",
              column.color
            )}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {column.label}
                </h3>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {tasks.length}
                </span>
              </div>
              <button
                onClick={() => onCreateInColumn(column.key)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title={`Add task to ${column.label}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
              {tasks.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 dark:border-gray-700">
                  <p className="text-xs text-gray-400">Drop tasks here</p>
                </div>
              )}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => onEdit(task)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-gray-400">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default TaskKanbanView;
