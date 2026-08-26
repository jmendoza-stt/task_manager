import { makeAutoObservable, runInAction } from "mobx";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/api";

class TasksStore {
  tasks: Task[] = [];
  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  /** Tasks grouped by status (for Kanban view). */
  get tasksByStatus() {
    return {
      pending: this.tasks.filter((t) => t.status === "pending"),
      in_progress: this.tasks.filter((t) => t.status === "in_progress"),
      completed: this.tasks.filter((t) => t.status === "completed"),
    };
  }

  /** Fetch all tasks from the API. */
  async fetchTasks() {
    this.loading = true;
    this.error = null;
    try {
      const tasks = await listTasks();
      runInAction(() => {
        this.tasks = tasks;
      });
    } catch (err) {
      runInAction(() => {
        this.error = (err as Error).message;
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  /** Create a new task and add to the list. */
  async addTask(input: CreateTaskInput) {
    this.error = null;
    try {
      const task = await createTask(input);
      runInAction(() => {
        this.tasks.unshift(task);
      });
      return task;
    } catch (err) {
      runInAction(() => {
        this.error = (err as Error).message;
      });
      return null;
    }
  }

  /** Update a task in place. */
  async editTask(id: string, input: UpdateTaskInput) {
    this.error = null;
    try {
      const updated = await updateTask(id, input);
      runInAction(() => {
        const idx = this.tasks.findIndex((t) => t.id === id);
        if (idx !== -1) this.tasks[idx] = updated;
      });
      return updated;
    } catch (err) {
      runInAction(() => {
        this.error = (err as Error).message;
      });
      return null;
    }
  }

  /** Move a task to a new status (used by Kanban drag or quick action). */
  async moveTask(id: string, status: Task["status"]) {
    return this.editTask(id, { status });
  }

  /** Remove a task. */
  async removeTask(id: string) {
    this.error = null;
    try {
      await deleteTask(id);
      runInAction(() => {
        this.tasks = this.tasks.filter((t) => t.id !== id);
      });
    } catch (err) {
      runInAction(() => {
        this.error = (err as Error).message;
      });
    }
  }

  clearError() {
    this.error = null;
  }
}

export const tasksStore = new TasksStore();
