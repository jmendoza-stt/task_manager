import { getAccessToken } from "@/lib/auth";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Task entity as returned by the API.
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
}

/**
 * Authenticated fetch wrapper — injects Cognito access token.
 */
async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res;
}

/**
 * List all tasks for the authenticated user.
 */
export async function listTasks(): Promise<Task[]> {
  const res = await authFetch("/tasks");
  const data = await res.json();
  return data.tasks;
}

/**
 * Create a new task.
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await authFetch("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = await res.json();
  return data.task;
}

/**
 * Update an existing task.
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const res = await authFetch(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  const data = await res.json();
  return data.task;
}

/**
 * Delete a task.
 */
export async function deleteTask(id: string): Promise<void> {
  await authFetch(`/tasks/${id}`, { method: "DELETE" });
}
