/// <reference path="../.sst/platform/config.d.ts" />

/**
 * CloudConsumer — A second bundle that demonstrates real cross-stack restore().
 *
 * This bundle creates almost no infrastructure of its own. Its purpose is to
 * prove the "cross-stack sharing" pattern end-to-end:
 *
 *   cloud.core     →  register()  →  SSM Parameter Store
 *   cloud.consumer →  restore()   ←  SSM Parameter Store
 *
 * It restores TWO different kinds of shared resources that cloud.core registered:
 *
 * 1. VPC (a real AWS resource) — restored as plain data (id, subnets, SGs).
 *    This proves you can share actual infrastructure across stacks without
 *    recreating it.
 *
 * 2. TaskManagerConfig (a DataExport) — restored as typed plain data.
 *    This proves you can share plain config values (URLs, names) across stacks.
 *
 * To prove the restore actually worked, the consumer writes the restored values
 * into its own SSM parameter — a tiny resource that could only be built if the
 * restore succeeded.
 */

import * as aws from '@pulumi/aws';
import { Env, Config } from '@webiai/sdk.core';
import { Stack } from '@webiai/sdk.infra/util/stack';
import { Vpc } from '@webiai/sdk.infra/aws/vpc';
import { TaskManagerConfig } from '@dep:cloud.core';
import { cloudConsumerEnvVisitor, type CloudConsumerEnv } from './env.js';

export class CloudConsumer extends Stack<CloudConsumerEnv> {
  constructor() {
    super(() => ({
      app: Env.var('SST_APP').string()!,
      stack: Env.var('SST_STACK').optional.string(),
      retain: Env.var('SST_RETAIN').optional.bool(),
      home: 'aws',
    }), cloudConsumerEnvVisitor);
  }

  async run(): Promise<void> {
    await super.run();

    // ──────────────────────────────────────────────────────────────────
    // Phase 1: Restore the VPC that cloud.core registered.
    //
    // The identity (urnNamespace + resourceName + stack) must match exactly
    // what cloud.core used in its register() call. Because both bundles deploy
    // to the same app + stage, we don't need to override `app`/`stage`.
    //
    // restoreFrom() reads the SSM parameter written by cloud.core and returns
    // a VpcHydrated — plain data (vpc id, subnet ids, security groups).
    // ──────────────────────────────────────────────────────────────────
    const vpc = await Vpc.restoreFrom(this, {
      urnNamespace: ['stt', 'CloudCore'],
      resourceName: 'Vpc.Main',
      stack: 'CloudCore',
    });

    this.logger.info('Restored VPC from cloud.core', {
      vpcId: vpc.id,
      publicSubnets: vpc.publicSubnets.length,
      privateSubnets: vpc.privateSubnets.length,
    });

    // ──────────────────────────────────────────────────────────────────
    // Phase 2: Restore the TaskManagerConfig DataExport.
    //
    // Same pattern, but this is plain data (no AWS resource behind it).
    // We get back the API URL, table name, region, etc. that cloud.core
    // exported at deploy time.
    // ──────────────────────────────────────────────────────────────────
    const config = await TaskManagerConfig.restoreFrom(this, {
      urnNamespace: ['stt', 'CloudCore'],
      resourceName: 'Config.TaskManager',
      stack: 'CloudCore',
    });

    this.logger.info('Restored config from cloud.core', {
      apiUrl: config.data.apiUrl,
      tasksTableName: config.data.tasksTableName,
    });

    // ──────────────────────────────────────────────────────────────────
    // Phase 3: Prove the restore worked.
    //
    // Create an SSM parameter in THIS stack that stores a summary built from
    // the restored data. This parameter could only exist if both restores
    // succeeded — it's concrete evidence the cross-stack sharing works.
    // ──────────────────────────────────────────────────────────────────
    new aws.ssm.Parameter('ConsumerProof', {
      name: `/task-manager/consumer/${this.runtimeContext.stage}/restored-summary`,
      type: 'String',
      value: JSON.stringify({
        note: 'This value was built from resources restored from cloud.core',
        restoredVpcId: vpc.id,
        restoredApiUrl: config.data.apiUrl,
        restoredTable: config.data.tasksTableName,
        restoredAt: new Date().toISOString(),
      }),
    });
  }
}

/**
 * Factory function — entry point for sst.config.ts
 */
export default () => {
  Config.set('settings.logger.timestamp', false);
  Config.set('settings.logger.colorize', true);
  Config.set('settings.logger.data.style', 'compact');

  return new CloudConsumer();
};
