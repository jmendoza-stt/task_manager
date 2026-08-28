import { observer } from "mobx-react-lite";
import { Button } from "@/elements/ui/button";
import { StatusBadge, PriorityBadge } from "./TaskBadge";
import type { Task } from "@/lib/api";

interface Props {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const TaskDetailModal = observer(function TaskDetailModal({ task, onClose, onEdit, onDelete }: Props) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              Title
            </p>
            <p className="mt-1 text-base font-medium text-gray-800 dark:text-white/90">
              {task.title}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
              Description
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {task.description || "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                Status
              </p>
              <div className="mt-1.5">
                <StatusBadge status={task.status} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                Priority
              </p>
              <div className="mt-1.5">
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                Created
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {new Date(task.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                Updated
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {new Date(task.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="destructive" onClick={() => onDelete(task)}>
            Delete
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onEdit(task)}>Edit</Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TaskDetailModal;
