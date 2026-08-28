export default {
  name: "cloud.consumer",
  taxonomy: "bundle",

  sst: {
    stack: "CloudConsumer",
  },

  // Declare a dependency on cloud.core so we can import its shared resource
  // classes (ResourceName, TaskManagerConfig) via the @dep:cloud.core alias.
  dependencies: ["cloud.core"],
};
