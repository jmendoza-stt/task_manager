export default {
  scope: "stt",
  name: "task-manager",
  taxonomy: "project",

  sst: {
    app: "task-manager",
  },

  sdk: {
    version: "0.23.11",
    packages: ["core", "aws", "infra-provider", "infra"],
  },

  devlink: {
    modes: {
      default: "dev",
      dev: () => ({ manager: "store" }),
    },
  },
};