import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { tasksStore } from "@/stores/tasks-store";
import { Button } from "@/elements/ui/button";
import TaskListView from "./TaskListView";
import TaskKanbanView from "./TaskKanbanView";
import CreateTaskModal from "./CreateTaskModal";
import TaskDetailModal from "./TaskDetailModal";
import TaskEditModal from "./TaskEditModal";
import type { Task } from "@/lib/api";

type ViewMode = "kanban" | "list";

const TasksPage = observer(function TasksPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<Task["status"]>("pending");
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  useEffect(() => {
    tasksStore.fetchTasks();
  }, []);

  // Open the read-only detail modal.
  const openDetails = (task: Task) => {
    setDetailTask(task);
  };

  // Open the editable modal (also closes the detail modal if open).
  const openEdit = (task: Task) => {
    setDetailTask(null);
    setEditTask(task);
  };

  // Delete a task (used by list actions, kanban dropdown, and detail modal).
  const handleDelete = (task: Task) => {
    setDetailTask(null);
    tasksStore.removeTask(task.id);
  };

  const handleCreateInColumn = (status: Task["status"]) => {
    setCreateDefaultStatus(status);
    setShowCreate(true);
  };

  const handleCreateNew = () => {
    setCreateDefaultStatus("pending");
    setShowCreate(true);
  };

  return (
    <div className="p-5 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your tasks and track progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setView("kanban")}
              className={`rounded-l-lg px-3 py-2 text-sm font-medium transition ${
                view === "kanban"
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-r-lg px-3 py-2 text-sm font-medium transition ${
                view === "list"
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          <Button onClick={handleCreateNew} size="sm">
            + New Task
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {tasksStore.error && (
        <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {tasksStore.error}
          <button
            onClick={() => tasksStore.clearError()}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View */}
      {view === "kanban" ? (
        <TaskKanbanView
          onCardClick={openDetails}
          onEdit={openEdit}
          onDelete={handleDelete}
          onCreateInColumn={handleCreateInColumn}
        />
      ) : (
        <TaskListView onEdit={openEdit} onRowClick={openDetails} />
      )}

      {/* Create modal */}
      <CreateTaskModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        defaultStatus={createDefaultStatus}
      />

      {/* Detail modal (read-only) */}
      <TaskDetailModal
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* Edit modal */}
      <TaskEditModal task={editTask} onClose={() => setEditTask(null)} />
    </div>
  );
});

export default TasksPage;
