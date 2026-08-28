/**
 * Shared entry point — cross-bundle exports.
 *
 * This is what consumer bundles import via the `@dep:cloud.core` alias.
 * It re-exports the shared resource identities and DataExport classes so
 * consumers can restore() resources that cloud.core registered.
 *
 * Consumer usage:
 * ```ts
 * import { ResourceName, TaskManagerConfig } from '@dep:cloud.core';
 * ```
 */
export { ResourceName } from '../resources/resource-name.js';
export {
  TaskManagerConfig,
  type TaskManagerConfigData,
} from '../resources/task-manager-config.js';
