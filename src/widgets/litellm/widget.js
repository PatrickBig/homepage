import credentialedProxyHandler from "utils/proxy/handlers/credentialed";

const widget = {
  api: "{url}/{endpoint}",
  proxyHandler: credentialedProxyHandler,

  mappings: {
    // works with any LiteLLM key
    models: {
      endpoint: "v1/models",
    },
    // admin/master key required
    spend: {
      endpoint: "global/spend",
    },
    activity: {
      endpoint: "global/activity",
      params: ["start_date", "end_date"],
    },
    users: {
      endpoint: "user/list",
    },
    cache: {
      endpoint: "global/activity/cache_hits",
      params: ["start_date", "end_date"],
    },
    top_model: {
      endpoint: "global/spend/models",
      params: ["limit"],
    },
  },
};

export default widget;
