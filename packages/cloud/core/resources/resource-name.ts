/**
 * ResourceName — Central identity registry for shared resources.
 *
 * Maps a code-friendly key to a dotted identity string used as SSM path
 * and Pulumi type. Every shared resource references its name from here.
 *
 * ## How it works
 *
 * When you `register()` a resource, its data gets written to SSM Parameter Store
 * at a path like: /stacks/{app}/{scope}/{stage}/resources/{ResourceName}
 *
 * Other stacks can then `restore()` that resource using the same ResourceName,
 * getting back a hydrated object with the real ARNs/IDs — without needing
 * to create the resource again. This is the "cross-stack sharing" pattern.
 *
 * Example SSM path: /stacks/task-manager/CloudCore/jmendoza/resources/Vpc.Main
 */
export enum ResourceName {
  /** VPC — network foundation where Fargate services live */
  Vpc_Main = 'Vpc.Main',

  /** DynamoDB — tasks table */
  Table_Tasks = 'Table.Tasks',

  /** API Gateway — HTTP API that exposes Lambda endpoints */
  ApiGateway_Main = 'ApiGateway.Main',

  /** Cognito User Pool — user authentication */
  Auth_UserPool = 'Auth.UserPool',

  /** Cognito User Pool Client — app client for the frontend */
  Auth_UserPoolClient = 'Auth.UserPoolClient',

  /** ECS Cluster — compute cluster for Fargate services */
  Cluster_Main = 'Cluster.Main',
}
