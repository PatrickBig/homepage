import { describe, expect, it } from "vitest";

import { expectWidgetConfigShape } from "test-utils/widget-config";

import widget from "./widget";

describe("litellm widget config", () => {
  it("exports a valid widget config", () => {
    expectWidgetConfigShape(widget);
  });

  it("maps opaque endpoints to LiteLLM proxy routes", () => {
    expect(widget.mappings?.models?.endpoint).toBe("v1/models");
    expect(widget.mappings?.spend?.endpoint).toBe("global/spend");
    expect(widget.mappings?.activity?.endpoint).toBe("global/activity");
    expect(widget.mappings?.activity?.params).toEqual(["start_date", "end_date"]);
    expect(widget.mappings?.users?.endpoint).toBe("user/list");
    expect(widget.mappings?.cache?.endpoint).toBe("global/activity/cache_hits");
    expect(widget.mappings?.cache?.params).toEqual(["start_date", "end_date"]);
    expect(widget.mappings?.top_model?.endpoint).toBe("global/spend/models");
    expect(widget.mappings?.top_model?.params).toEqual(["limit"]);
  });
});
