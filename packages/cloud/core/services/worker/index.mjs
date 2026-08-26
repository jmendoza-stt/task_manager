/**
 * Worker Service — Background task processor for the Task Manager.
 *
 * This is a long-running process that runs in ECS/Fargate.
 * Unlike Lambda (which runs per-request), this stays alive indefinitely.
 *
 * Possible responsibilities:
 * - Process overdue task notifications
 * - Clean up completed tasks older than 30 days
 * - Generate daily summary reports
 * - Sync tasks with external systems
 *
 * For now, it's a simple polling loop that logs every 60 seconds.
 * In a real app, you'd connect this to an SQS queue or EventBridge schedule.
 */

const TABLE_NAME = process.env.TASKS_TABLE_NAME ?? 'unknown';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

console.log(`[worker] Starting task-manager worker service`);
console.log(`[worker] Table: ${TABLE_NAME}`);
console.log(`[worker] Region: ${REGION}`);

/**
 * Main processing loop.
 *
 * In production you'd use:
 * - SQS long-polling (efficient, event-driven)
 * - EventBridge Scheduler (cron-style)
 * - DynamoDB Streams (react to data changes)
 *
 * For this learning project, a simple interval demonstrates the concept.
 */
async function processLoop() {
  let iteration = 0;

  while (true) {
    iteration++;
    const now = new Date().toISOString();

    console.log(`[worker] Heartbeat #${iteration} at ${now}`);

    // Simulate checking for overdue tasks
    // In a real app: query DynamoDB for tasks with dueDate < now
    try {
      await checkOverdueTasks();
    } catch (err) {
      console.error(`[worker] Error in processing loop:`, err);
    }

    // Wait 60 seconds before next check
    await sleep(60_000);
  }
}

async function checkOverdueTasks() {
  // Placeholder — would query DynamoDB here
  // const overdue = await queryOverdueTasks();
  // for (const task of overdue) { await sendNotification(task); }
  console.log(`[worker] Checked for overdue tasks (placeholder)`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Graceful shutdown on SIGTERM (ECS sends this before stopping a task)
process.on('SIGTERM', () => {
  console.log('[worker] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

processLoop().catch(err => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
