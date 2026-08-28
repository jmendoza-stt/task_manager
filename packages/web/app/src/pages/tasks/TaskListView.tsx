import { observer } from "mobx-react-lite";
import { tasksStore } from "@/stores/tasks-store";
import { StatusBadge, PriorityBadge } from "./TaskBadge";
import type { Task } from "@/lib/api";

interface Props {
  onEdit: (task: Task) => void;
  onRowClick: (task: Task) => void;
}

const TaskListView = observer(function TaskListView({ onEdit, onRowClick }: Props) {
  const { tasks, loading } = tasksStore;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">No tasks yet</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          Create your first task to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th className="px-5 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Title
            </th>
            <th className="px-5 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th className="px-5 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Priority
            </th>
            <th className="px-5 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Created
            </th>
            <th className="px-5 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => onRowClick(task)}
              className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
            >
              <td className="px-5 py-4">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white/90">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={task.status} />
              </td>
              <td className="px-5 py-4">
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                {new Date(task.createdAt).toLocaleDateString()}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    className="text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                    title="Advance status"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      tasksStore.removeTask(task.id);
                    }}
                    className="text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default TaskListView;
