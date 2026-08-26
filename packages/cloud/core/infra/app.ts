/// <reference path="../.sst/platform/config.d.ts" />

/**
 * CloudCore — Infrastructure Stack for the Task Manager.
 *
 * This is the main entry point for all AWS infrastructure.
 * It creates and wires together:
 *
 * 1. VPC (network) — private/public subnets, NAT for internet access
 * 2. DynamoDB (data) — tasks table
 * 3. Cognito (auth) — user pool + client
 * 4. API Gateway (exposure) — HTTP API to expose Lambda endpoints
 * 5. Lambda (compute) — CRUD functions for tasks
 * 6. ECS/Fargate (compute) — containerized worker service
 *
 * All resources are registered as shared resources (written to SSM)
 * so other stacks/bundles could consume them if needed.
 */

import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { DynamoTable } from '@webiai/sdk.infra/aws/dynamodb';
import { LambdaFunction } from '@webiai/sdk.infra/aws/lambda';
import { ApiGateway, EcsCluster, EcsService } from '@webiai/sdk.infra/aws/services';
import { CognitoUserPool, CognitoUserPoolClient } from '@webiai/sdk.infra/aws/cognito';
import { createVpc } from './factories/vpc.js';
import { cloudCoreEnvVisitor, type CloudCoreEnv } from './env.js';

/**
 * CloudCore — The main infrastructure stack.
 *
 * ## Architecture Overview
 *
 * ```
 * [Frontend SPA]
 *       │
 *       ▼
 * [API Gateway] ─── JWT Authorizer (Cognito)
 *       │
 *       ├──▶ [Lambda: tasks-api]  ──▶ [DynamoDB: tasks]
 *       │
 *       └──▶ [ECS Service: worker] (via VPC Link)
 *                    │
 *                    └── (runs in private subnet of VPC)
 * ```
 */
export class CloudCore extends Stack<CloudCoreEnv> {
  constructor() {
    super(() => ({
      app: Env.var('SST_APP').string()!,
      stack: Env.var('SST_STACK').optional.string(),
      retain: Env.var('SST_RETAIN').optional.bool(),
      home: 'aws',
    }), cloudCoreEnvVisitor);
  }

  async run(): Promise<void> {
    await super.run();

    const ctx = this.runtimeContext;

    // ──────────────────────────────────────────────────────────────────
    // Phase 1: Network (VPC)
    // ──────────────────────────────────────────────────────────────────
    const vpc = this.initVpc();

    // ──────────────────────────────────────────────────────────────────
    // Phase 2: Data (DynamoDB)
    // ──────────────────────────────────────────────────────────────────
    const tasksTable = this.initDynamoDB();

    // ──────────────────────────────────────────────────────────────────
    // Phase 3: Auth (Cognito)
    // ──────────────────────────────────────────────────────────────────
    const { userPool, userPoolClient } = this.initAuth();

    // ──────────────────────────────────────────────────────────────────
    // Phase 4: API (API Gateway + Lambda + Routes)
    // ──────────────────────────────────────────────────────────────────
    const { api, tasksFunction } = this.initApi(tasksTable, userPool, userPoolClient);

    // ──────────────────────────────────────────────────────────────────
    // Phase 5: Compute (ECS/Fargate)
    // ──────────────────────────────────────────────────────────────────
    const { cluster } = this.initEcs(vpc, tasksTable);

    // ──────────────────────────────────────────────────────────────────
    // Phase 6: Register shared resources (write to SSM Parameter Store)
    //
    // This is the "cross-stack sharing" pattern. Each register() call:
    // 1. Serializes the resource's key data (ARN, ID, name)
    // 2. Writes it to SSM at /stacks/{app}/CloudCore/{stage}/resources/{name}
    // 3. Other stacks can restore() it to get the data without re-creating
    // ──────────────────────────────────────────────────────────────────
    vpc.register(ctx);
    tasksTable.register(ctx);
    api.register(ctx);
    userPool.register(ctx);
    userPoolClient.register(ctx);
    cluster.register(ctx);
  }

  // ════════════════════════════════════════════════════════════════════
  // Init phases — each creates a group of related resources
  // ════════════════════════════════════════════════════════════════════

  /**
   * Phase 1: VPC
   *
   * Creates a VPC with public + private subnets across 2 AZs.
   * The private subnets have internet access via a single NAT instance (ec2x1).
   *
   * WHY: Fargate tasks need to live in a VPC. Private subnets keep them
   * off the public internet. The NAT lets them pull Docker images and
   * call AWS APIs.
   */
  private initVpc() {
    return createVpc('Main', {
      appName: 'task-manager',
      stageName: this.env.schema.local ? 'dev' : 'prod',
    });
  }

  /**
   * Phase 2: DynamoDB
   *
   * Creates a single-table for tasks with:
   * - Partition key: `pk` (composite key like "USER#<userId>")
   * - Sort key: `sk` (composite key like "TASK#<taskId>")
   * - GSI: for querying tasks by status across users
   *
   * ## Why single-table design?
   *
   * DynamoDB charges per table (capacity + storage). Instead of having
   * separate tables for users, tasks, comments, etc., you put everything
   * in one table with composite keys:
   *
   * | pk              | sk              | data...           |
   * |-----------------|-----------------|-------------------|
   * | USER#abc123     | TASK#001        | { title: "..." }  |
   * | USER#abc123     | TASK#002        | { title: "..." }  |
   * | STATUS#pending  | TASK#001        | (GSI projection)  |
   *
   * This lets you do efficient queries like:
   * - "All tasks for user X" → Query pk = "USER#abc123"
   * - "All pending tasks" → Query GSI gsi1pk = "STATUS#pending"
   */
  private initDynamoDB() {
    return new DynamoTable('Tasks', {
      fields: {
        pk: 'string',     // Partition key: USER#<userId>
        sk: 'string',     // Sort key: TASK#<taskId>
        gsi1pk: 'string', // GSI PK: STATUS#<status>
        gsi1sk: 'string', // GSI SK: <createdAt>#<taskId>
      },
      primaryIndex: {
        hashKey: 'pk',
        rangeKey: 'sk',
      },
      globalIndexes: {
        'gsi1-index': {
          hashKey: 'gsi1pk',
          rangeKey: 'gsi1sk',
        },
      },
    }, {
      shared: {
        urnNamespace: ['stt', 'CloudCore'],
        resourceName: 'Table.Tasks',
        stack: 'CloudCore',
      },
    });
  }

  /**
   * Phase 3: Cognito (Authentication)
   *
   * Creates:
   * - User Pool: the "database" of users (email + password)
   * - User Pool Client: the "app" that can authenticate against the pool
   *
   * ## How Cognito auth flow works:
   *
   * 1. User signs up → Cognito stores email/password (hashed)
   * 2. User logs in → Cognito returns JWT tokens (access + id + refresh)
   * 3. Frontend sends access token in Authorization header
   * 4. API Gateway validates the JWT (no Lambda needed for auth!)
   * 5. Lambda receives the validated user info in the event context
   *
   * ## User Pool vs Identity Pool (common confusion):
   *
   * - User Pool = "who are you?" (authentication) ← we use this
   * - Identity Pool = "what can you do?" (maps users to IAM roles for AWS access)
   */
  private initAuth() {
    const userPool = new CognitoUserPool('TaskManagerAuth', {
      autoVerifiedAttributes: ['email'],
      usernameAttributes: ['email'],
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        requireUppercase: true,
      },
      schemas: [
        {
          name: 'email',
          attributeDataType: 'String',
          mutable: true,
          required: true,
        },
        {
          name: 'name',
          attributeDataType: 'String',
          mutable: true,
          required: true,
        },
      ],
    }, {
      shared: {
        urnNamespace: ['stt', 'CloudCore'],
        resourceName: 'Auth.UserPool',
        stack: 'CloudCore',
      },
    });

    const userPoolClient = new CognitoUserPoolClient('TaskManagerClient', {
      name: 'task-manager-web',
      userPoolId: userPool.id,
      explicitAuthFlows: [
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
      supportedIdentityProviders: ['COGNITO'],
      allowedOauthFlows: ['code'],
      allowedOauthFlowsUserPoolClient: true,
      allowedOauthScopes: ['email', 'openid', 'profile'],
      callbackUrls: ['http://localhost:3000/callback'],
      logoutUrls: ['http://localhost:3000'],
    }, {
      shared: {
        urnNamespace: ['stt', 'CloudCore'],
        resourceName: 'Auth.UserPoolClient',
        stack: 'CloudCore',
      },
    });

    return { userPool, userPoolClient };
  }

  /**
   * Phase 4: API Gateway + Lambda
   *
   * Creates:
   * - HTTP API (API Gateway v2) — the public URL that receives requests
   * - JWT Authorizer — validates Cognito tokens on each request
   * - Lambda function — runs the task CRUD logic
   * - Routes — maps "GET /tasks" → Lambda, "POST /tasks" → Lambda, etc.
   *
   * ## API Gateway HTTP API vs REST API:
   *
   * - HTTP API (v2): cheaper, faster, simpler. Good for most cases.
   * - REST API (v1): more features (request validation, caching, WAF).
   *   Use when you need those extras.
   *
   * We use HTTP API because it's cheaper and has native JWT auth support.
   *
   * ## Lambda execution model:
   *
   * - Cold start: first request takes ~200-500ms (init + your code)
   * - Warm: subsequent requests take ~5-50ms (your code only)
   * - Memory: affects CPU allocation too (256MB = ~0.15 vCPU)
   * - Timeout: max 15 minutes, we use 30 seconds for API calls
   */
  private initApi(
    tasksTable: DynamoTable,
    userPool: CognitoUserPool,
    userPoolClient: CognitoUserPoolClient,
  ) {
    // Create the HTTP API with CORS configured for local development
    const api = new ApiGateway('Main', {
      cors: {
        allowOrigins: ['http://localhost:3000', 'http://localhost:5173'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowCredentials: true,
      },
    }, {
      shared: {
        urnNamespace: ['stt', 'CloudCore'],
        resourceName: 'ApiGateway.Main',
        stack: 'CloudCore',
      },
    });

    // JWT Authorizer — validates Cognito tokens without any Lambda code
    const authorizer = api.authorizer('CognitoAuth', {
      type: 'JWT',
      jwt: {
        audiences: [userPoolClient.clientId],
        issuer: $interpolate`https://cognito-idp.us-east-1.amazonaws.com/${userPool.id}`,
      },
    });

    // Lambda function — single function handles all task routes
    // (known as the "mono-lambda" pattern — simpler for small APIs)
    const tasksFunction = new LambdaFunction('TasksApi', {
      handler: 'functions/tasks/handler.main',
      runtime: 'nodejs22.x',
      memory: '256 MB',
      timeout: '30 seconds',
      link: [tasksTable.nodes.table],
      environment: {
        TASKS_TABLE_NAME: tasksTable.name,
      },
    });

    // Route wiring — maps HTTP methods + paths to the Lambda
    api.route('GET /tasks', { lambda: tasksFunction.nodes.function }, { auth: authorizer });
    api.route('POST /tasks', { lambda: tasksFunction.nodes.function }, { auth: authorizer });
    api.route('GET /tasks/{id}', { lambda: tasksFunction.nodes.function }, { auth: authorizer });
    api.route('PUT /tasks/{id}', { lambda: tasksFunction.nodes.function }, { auth: authorizer });
    api.route('DELETE /tasks/{id}', { lambda: tasksFunction.nodes.function }, { auth: authorizer });

    // Health check — public, no auth
    api.route('GET /health', { lambda: tasksFunction.nodes.function });

    return { api, tasksFunction };
  }

  /**
   * Phase 5: ECS/Fargate (Containerized Worker)
   *
   * Creates:
   * - ECS Cluster — the logical grouping for Fargate tasks
   * - ECS Service (worker) — a long-running container
   *
   * ## Lambda vs Fargate — when to use each:
   *
   * | Aspect        | Lambda                  | Fargate               |
   * |---------------|-------------------------|-----------------------|
   * | Duration      | Max 15 min              | Unlimited             |
   * | Scaling       | Per-request (0 to 1000) | Task count (min/max)  |
   * | Cost model    | Per invocation + time   | Per vCPU/hour + RAM   |
   * | Cold start    | 200-500ms               | 30-60s (task launch)  |
   * | Use case      | API handlers, events    | Workers, queues, cron |
   *
   * Our worker could handle: sending notifications, processing batch
   * operations, running scheduled cleanup of expired tasks, etc.
   *
   * ## Spot instances:
   *
   * We use `EcsService.presets.spot` which configures Fargate Spot —
   * up to 70% cheaper than on-demand, but AWS can reclaim your task
   * with 2 min warning. Perfect for non-critical background work.
   */
  private initEcs(vpc: ReturnType<typeof createVpc>, tasksTable: DynamoTable) {
    const cluster = new EcsCluster('Main', {
      vpc: vpc,
      subnets: 'private',
    }, {
      shared: {
        urnNamespace: ['stt', 'CloudCore'],
        resourceName: 'Cluster.Main',
        stack: 'CloudCore',
      },
    });

    // Worker service — runs in private subnets, processes background jobs
    const workerService = new EcsService('Worker', {
      cluster: cluster.nodes.cluster,
      service: {
        ...EcsService.presets.spot({
          image: {
            dockerfile: 'services/worker/Dockerfile',
            context: 'services/worker',
          },
          cpu: '0.25 vCPU',
          memory: '0.5 GB',
          scaling: {
            min: 1,
            max: 2,
          },
          environment: {
            TASKS_TABLE_NAME: tasksTable.name,
            AWS_REGION: 'us-east-1',
          },
        }),
      },
    });

    return { cluster, workerService };
  }
}

/**
 * Factory function — entry point for sst.config.ts
 */
export default () => {
  Config.set('settings.logger.timestamp', false);
  Config.set('settings.logger.colorize', true);
  Config.set('settings.logger.data.style', 'compact');

  return new CloudCore();
};
