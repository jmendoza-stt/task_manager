/**
 * Infrastructure Factories — barrel export.
 *
 * Factories encapsulate infrastructure decisions into reusable,
 * pre-configured resource creators. Think of them as "opinionated constructors"
 * that apply your team's standards automatically.
 */
export { createVpc, type TaskManagerVpcArgs } from './vpc.js';
