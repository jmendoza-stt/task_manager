/**
 * TaskManagerConfig — A custom SharedDataResource (DataExport) for the task manager.
 *
 * This is our own DataExport subclass. Unlike VPC/DynamoDB/Lambda (which wrap
 * real AWS infrastructure), a DataExport creates NO infrastructure. It only holds
 * typed data and makes it registrable/restorable across stacks via SSM.
 *
 * ## Why a DataExport?
 *
 * Sometimes you need to share plain *values* between stacks, not AWS resources:
 * - The API Gateway URL (so a consumer stack knows where to route)
 * - The application name / environment
 * - Feature flags, config toggles, connection strings
 *
 * Instead of hardcoding these in every consumer, the producer stack (cloud.core)
 * exports them once via `register()`, and any consumer restores them with
 * `restore()` — always getting the current, correct values.
 *
 * ## The register() / restore() lifecycle
 *
 * ```
 * PRODUCER (cloud.core)                    CONSUMER (cloud.consumer)
 * ─────────────────────                    ─────────────────────────
 * new TaskManagerConfig(data)
 * config.register(this)  ───writes───▶  SSM: /stacks/.../Config.TaskManager
 *                                            │
 *                        TaskManagerConfig.restoreFrom(this, {...})
 *                                            │
 *                                       ◀───reads─── returns hydrated.data
 * ```
 */

import {
  DataExport,
  DataExportHydrated,
  type DataExportInput,
} from '@webiai/sdk.infra/util/data-export';
import type {
  WebiAiResourceOptions,
  RestoreConfig,
} from '@webiai/sdk.infra/util/webiai-resource';
import type { RuntimeContextProvider } from '@webiai/sdk.infra/util/resource-output';

/**
 * The typed shape of the config we export.
 * These are plain values (or Pulumi Outputs) resolved at deploy time.
 */
export interface TaskManagerConfigData {
  /** The application name (e.g. "task-manager"). */
  appName: string;
  /** The deployment stage (e.g. "jmendoza", "prod"). */
  stage: string;
  /** The API Gateway invoke URL. */
  apiUrl: string;
  /** The DynamoDB table name for tasks. */
  tasksTableName: string;
  /** The AWS region. */
  region: string;
}

/**
 * TaskManagerConfig — our custom DataExport.
 *
 * Extends the SDK's generic `DataExport<T>` with our concrete data shape.
 * This gives us a strongly-typed shared resource with `register()` and a
 * typed `restoreFrom()`.
 */
export class TaskManagerConfig extends DataExport<TaskManagerConfigData> {
  constructor(
    name: string,
    data: DataExportInput<TaskManagerConfigData>,
    opts?: WebiAiResourceOptions,
  ) {
    super(name, data, opts);
  }

  /**
   * Typed restore — reads the config back from SSM in a consumer stack.
   *
   * Overrides the parent's non-generic `restoreFrom` with our concrete type
   * so consumers get full type safety on `hydrated.data`.
   */
  static async restoreFrom(
    provider: RuntimeContextProvider,
    config: RestoreConfig,
  ): Promise<DataExportHydrated<TaskManagerConfigData>> {
    return DataExport.restoreFrom(provider, config) as Promise<
      DataExportHydrated<TaskManagerConfigData>
    >;
  }
}
