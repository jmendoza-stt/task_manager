/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * VPC Factory — Creates a cost-optimized VPC for the task manager.
 *
 * Encapsulates VPC creation with sensible defaults for a dev/learning environment:
 * - 2 AZs (enough for HA, keeps costs low)
 * - ec2x1 NAT (single NAT instance ~$3/month instead of ~$65/month for managed)
 * - Cloud Map namespace for ECS service discovery
 *
 * ## Why a factory?
 *
 * Factories encapsulate infrastructure decisions in reusable functions.
 * Instead of repeating VPC config everywhere, you call `createVpc()` and get
 * a consistent, pre-configured VPC. If you need to change VPC settings
 * (e.g., add more AZs for production), you change it in one place.
 */

import { Vpc, type VpcArgs } from '@webiai/sdk.infra/aws/vpc';

export interface TaskManagerVpcArgs {
  /** Network prefix for CIDR block. @default "10.0" → 10.0.0.0/16 */
  networkIdentifier?: string;
  /** Number of availability zones. @default 2 */
  az?: number;
  /** Enable NAT for private subnets. @default true (ec2x1) */
  enableNat?: boolean;
  /** SST app name (for resource naming). */
  appName: string;
  /** SST stage name (for resource naming). */
  stageName: string;
}

/**
 * Creates a VPC optimized for the task manager project.
 *
 * Uses `ec2x1` NAT mode — a single t4g.nano instance that provides
 * internet access to private subnets at minimal cost (~$3/month).
 *
 * This is perfect for dev/staging. For production, you'd switch to
 * `nat: "managed"` for higher throughput and HA.
 */
export function createVpc(name: string, args: TaskManagerVpcArgs): Vpc {
  const vpcArgs: VpcArgs = {
    networkIdentifier: args.networkIdentifier ?? '10.0',
    az: args.az ?? 2,
    nat: args.enableNat !== false ? 'ec2x1' : undefined,
    bastion: false,
    appName: args.appName,
    stageName: args.stageName,
    cloudmapNamespace: 'task-manager',
  };

  return new Vpc(name, vpcArgs, {
    shared: {
      urnNamespace: ['stt', 'CloudCore'],
      resourceName: 'Vpc.Main',
      stack: 'CloudCore',
    },
  });
}
