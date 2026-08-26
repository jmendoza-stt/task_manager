/**
 * Tasks Lambda Handler — Single function handling all task CRUD operations.
 *
 * This is the "mono-lambda" pattern: one function handles multiple routes.
 * API Gateway sends the HTTP method and path, and we route internally.
 *
 * ## Why mono-lambda instead of one-function-per-route?
 *
 * Pros:
 * - Simpler deployment (one function to manage)
 * - Shared cold start (once warm, all routes are fast)
 * - Easier local testing
 *
 * Cons:
 * - Larger bundle size (all routes in one package)
 * - IAM permissions are broader (one role for all operations)
 *
 * For a small API like ours, mono-lambda is the pragmatic choice.
 *
 * ## How the event gets here:
 *
 * 1. Client sends: POST https://abc123.execute-api.us-east-1.amazonaws.com/tasks
 * 2. API Gateway validates JWT token (Cognito authorizer)
 * 3. API Gateway invokes this Lambda with an event containing:
 *    - routeKey: "POST /tasks"
 *    - body: the JSON payload
 *    - requestContext.authorizer.jwt.claims: user info from the token
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

// ─── DynamoDB Client Setup ───────────────────────────────────────────────────

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TASKS_TABLE_NAME!;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

interface ApiGatewayEvent {
  routeKey: string;
  body?: string;
  pathParameters?: Record<string, string>;
  requestContext: {
    authorizer?: {
      jwt?: {
        claims: {
          sub: string;
          email?: string;
        };
      };
    };
  };
}

interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function response(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function getUserId(event: ApiGatewayEvent): string {
  const sub = event.requestContext.authorizer?.jwt?.claims.sub;
  if (!sub) throw new Error('Unauthorized: no user ID in token');
  return sub;
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

/**
 * GET /tasks — List all tasks for the authenticated user.
 *
 * DynamoDB Query: pk = "USER#<userId>"
 * This is efficient because DynamoDB can retrieve all items with
 * the same partition key in a single read operation.
 */
async function listTasks(event: ApiGatewayEvent): Promise<ApiResponse> {
  const userId = getUserId(event);

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':prefix': 'TASK#',
    },
  }));

  const tasks = (result.Items ?? []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return response(200, { tasks, count: tasks.length });
}

/**
 * POST /tasks — Create a new task.
 *
 * Writes to DynamoDB with composite keys:
 * - pk: USER#<userId> (partition key — groups items by user)
 * - sk: TASK#<taskId> (sort key — unique within the user partition)
 * - gsi1pk: STATUS#<status> (for querying by status across all users)
 * - gsi1sk: <createdAt>#<taskId> (for ordering within a status)
 */
async function createTask(event: ApiGatewayEvent): Promise<ApiResponse> {
  const userId = getUserId(event);

  if (!event.body) {
    return response(400, { error: 'Request body is required' });
  }

  const body = JSON.parse(event.body);

  if (!body.title) {
    return response(400, { error: 'Title is required' });
  }

  const taskId = randomUUID();
  const now = new Date().toISOString();

  const task: Task = {
    id: taskId,
    userId,
    title: body.title,
    description: body.description ?? '',
    status: body.status ?? 'pending',
    priority: body.priority ?? 'medium',
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      pk: `USER#${userId}`,
      sk: `TASK#${taskId}`,
      gsi1pk: `STATUS#${task.status}`,
      gsi1sk: `${now}#${taskId}`,
      ...task,
    },
  }));

  return response(201, { task });
}

/**
 * GET /tasks/{id} — Get a specific task by ID.
 *
 * Uses GetItem (not Query) because we know both pk and sk exactly.
 * GetItem is a single-item read — the fastest DynamoDB operation.
 */
async function getTask(event: ApiGatewayEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  const taskId = event.pathParameters?.id;

  if (!taskId) {
    return response(400, { error: 'Task ID is required' });
  }

  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: `USER#${userId}`,
      sk: `TASK#${taskId}`,
    },
  }));

  if (!result.Item) {
    return response(404, { error: 'Task not found' });
  }

  return response(200, {
    task: {
      id: result.Item.id,
      title: result.Item.title,
      description: result.Item.description,
      status: result.Item.status,
      priority: result.Item.priority,
      createdAt: result.Item.createdAt,
      updatedAt: result.Item.updatedAt,
    },
  });
}

/**
 * PUT /tasks/{id} — Update a task.
 *
 * Uses UpdateExpression to only modify the fields that were sent.
 * Also updates the GSI keys if status changed (so status-based queries
 * stay consistent).
 */
async function updateTask(event: ApiGatewayEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  const taskId = event.pathParameters?.id;

  if (!taskId || !event.body) {
    return response(400, { error: 'Task ID and body are required' });
  }

  const body = JSON.parse(event.body);
  const now = new Date().toISOString();

  // Build dynamic update expression from provided fields
  const updateFields: string[] = [];
  const expressionValues: Record<string, unknown> = {};
  const expressionNames: Record<string, string> = {};

  if (body.title !== undefined) {
    updateFields.push('#title = :title');
    expressionValues[':title'] = body.title;
    expressionNames['#title'] = 'title';
  }

  if (body.description !== undefined) {
    updateFields.push('#desc = :desc');
    expressionValues[':desc'] = body.description;
    expressionNames['#desc'] = 'description';
  }

  if (body.status !== undefined) {
    updateFields.push('#status = :status');
    updateFields.push('gsi1pk = :gsi1pk');
    expressionValues[':status'] = body.status;
    expressionValues[':gsi1pk'] = `STATUS#${body.status}`;
    expressionNames['#status'] = 'status';
  }

  if (body.priority !== undefined) {
    updateFields.push('priority = :priority');
    expressionValues[':priority'] = body.priority;
  }

  // Always update updatedAt
  updateFields.push('updatedAt = :updatedAt');
  expressionValues[':updatedAt'] = now;

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: `USER#${userId}`,
      sk: `TASK#${taskId}`,
    },
    UpdateExpression: `SET ${updateFields.join(', ')}`,
    ExpressionAttributeValues: expressionValues,
    ...(Object.keys(expressionNames).length > 0 && {
      ExpressionAttributeNames: expressionNames,
    }),
    ReturnValues: 'ALL_NEW',
    ConditionExpression: 'attribute_exists(pk)',
  }));

  if (!result.Attributes) {
    return response(404, { error: 'Task not found' });
  }

  return response(200, {
    task: {
      id: result.Attributes.id,
      title: result.Attributes.title,
      description: result.Attributes.description,
      status: result.Attributes.status,
      priority: result.Attributes.priority,
      createdAt: result.Attributes.createdAt,
      updatedAt: result.Attributes.updatedAt,
    },
  });
}

/**
 * DELETE /tasks/{id} — Delete a task.
 *
 * Uses ConditionExpression to ensure the item exists before deleting.
 * Returns 404 if it doesn't exist (ConditionCheckFailedException).
 */
async function deleteTask(event: ApiGatewayEvent): Promise<ApiResponse> {
  const userId = getUserId(event);
  const taskId = event.pathParameters?.id;

  if (!taskId) {
    return response(400, { error: 'Task ID is required' });
  }

  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `USER#${userId}`,
        sk: `TASK#${taskId}`,
      },
      ConditionExpression: 'attribute_exists(pk)',
    }));
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return response(404, { error: 'Task not found' });
    }
    throw err;
  }

  return response(200, { message: 'Task deleted successfully' });
}

/**
 * GET /health — Health check endpoint (no auth required).
 */
function healthCheck(): ApiResponse {
  console.log('[tasks-api] Health check called');
  return response(200, {
    status: 'healthy',
    service: 'task-manager-api',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    region: process.env.AWS_REGION ?? 'unknown',
  });
}

/**
 * GET /tasks/stats — Public stats endpoint (no auth required).
 * Returns basic API stats for monitoring.
 */
function getStats(): ApiResponse {
  console.log('[tasks-api] Stats endpoint called');
  return response(200, {
    service: 'task-manager-api',
    version: '1.1.0',
    table: TABLE_NAME,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
}

// ─── Main Router ─────────────────────────────────────────────────────────────

/**
 * Main entry point — routes the request to the appropriate handler
 * based on the routeKey (method + path) that API Gateway sends.
 */
export async function main(event: ApiGatewayEvent): Promise<ApiResponse> {
  try {
    console.log(`[tasks-api] Received: ${event.routeKey}`);

    switch (event.routeKey) {
      case 'GET /health':
        return healthCheck();
      case 'GET /tasks/stats':
        return getStats();
      case 'GET /tasks':
        return await listTasks(event);
      case 'POST /tasks':
        return await createTask(event);
      case 'GET /tasks/{id}':
        return await getTask(event);
      case 'PUT /tasks/{id}':
        return await updateTask(event);
      case 'DELETE /tasks/{id}':
        return await deleteTask(event);
      default:
        return response(404, { error: `Route not found: ${event.routeKey}` });
    }
  } catch (err: unknown) {
    console.error('Unhandled error:', err);

    const message = err instanceof Error ? err.message : 'Internal server error';
    return response(500, { error: message });
  }
}
