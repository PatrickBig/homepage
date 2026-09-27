// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";

const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));

vi.mock("utils/proxy/use-widget-api", () => ({
  default: useWidgetAPI,
}));

import Component, { DEFAULT_DAYS, DEFAULT_FIELDS, activityRange } from "./component";

const RANGE_FIELDS = {
  requests: "requests_range",
  tokens: "tokens_range",
  cache: "cache_range",
  failed: "failed_range",
};

const MODELS_DATA = { data: [{ id: "gpt-4o" }, { id: "claude-3" }] };
const SPEND_DATA = { spend: 12.345, max_budget: 100 };
const ACTIVITY_DATA = { daily_data: [], sum_api_requests: 99, sum_total_tokens: 1234567 };
const USERS_DATA = { users: [{ user_id: "a" }, { user_id: "b" }], total: 7 };
const CACHE_DATA = { totals: { cache_hit_ratio: 33.33, failed_requests: 4 } };
const TOP_MODEL_DATA = [{ model: "gpt-4o", total_spend: 5 }];

function mockEndpoints(endpoints = {}) {
  useWidgetAPI.mockImplementation((_widget, endpoint) => {
    if (endpoint === "") return { data: undefined, error: undefined };
    return endpoints[endpoint] ?? { data: undefined, error: undefined };
  });
}

function render(service) {
  return renderWithProviders(<Component service={service} />, { settings: { hideErrors: false } });
}

describe("widgets/litellm/component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a 30 day activity window ending today by default", () => {
    const range = activityRange(DEFAULT_DAYS, new Date("2026-01-31T12:00:00Z"));
    expect(range.end_date).toBe("2026-01-31");
    expect(range.start_date).toBe("2026-01-02");
  });

  it("uses the configured days for the activity window", () => {
    const range = activityRange(7, new Date("2026-01-31T12:00:00Z"));
    expect(range.end_date).toBe("2026-01-31");
    expect(range.start_date).toBe("2026-01-25");
  });

  it("renders error UI when every selected endpoint fails", () => {
    mockEndpoints({
      models: { data: undefined, error: { message: "nope" } },
      spend: { data: undefined, error: { message: "403" } },
      activity: { data: undefined, error: { message: "403" } },
      users: { data: undefined, error: { message: "403" } },
    });

    render({ widget: { type: "litellm", url: "http://x" } });

    expect(screen.getAllByText(/widget\.api_error/i).length).toBeGreaterThan(0);
  });

  it("renders placeholders for the default fields while loading", () => {
    mockEndpoints();

    const { container } = render({ widget: { type: "litellm", url: "http://x" } });

    expect(DEFAULT_FIELDS).toHaveLength(4);
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expect(DEFAULT_FIELDS).toEqual(["models", "spend", "requests", "tokens"]);
    for (const field of DEFAULT_FIELDS) {
      const label = RANGE_FIELDS[field] ? `litellm.${RANGE_FIELDS[field]}` : `litellm.${field}`;
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByText("-")).toHaveLength(4);
  });

  it("renders values for the default fields", () => {
    mockEndpoints({
      models: { data: MODELS_DATA, error: undefined },
      spend: { data: SPEND_DATA, error: undefined },
      activity: { data: ACTIVITY_DATA, error: undefined },
    });

    const { container } = render({ widget: { type: "litellm", url: "http://x" } });

    expectBlockValue(container, "litellm.models", "2");
    expectBlockValue(container, "litellm.spend", "$12.35");
    expectBlockValue(container, "litellm.requests_range", "99");
    expectBlockValue(container, "litellm.tokens_range", "1234567");
  });

  it("supports the bare-array models response shape", () => {
    mockEndpoints({
      models: { data: [{ id: "a" }, { id: "b" }, { id: "c" }], error: undefined },
    });

    const { container } = render({
      widget: { type: "litellm", url: "http://x", fields: ["models", "spend", "users", "budget"] },
    });

    expectBlockValue(container, "litellm.models", "3");
  });

  it("does not fetch endpoints that no selected field needs", () => {
    mockEndpoints();
    render({ widget: { type: "litellm", url: "http://x" } });

    const calledEndpoints = useWidgetAPI.mock.calls.map((call) => call[1]);
    expect(calledEndpoints).toContain("models");
    expect(calledEndpoints).toContain("spend");
    expect(calledEndpoints).toContain("activity");
    // users/cache/top_model are not default fields, so they must be disabled (empty endpoint)
    const unused = useWidgetAPI.mock.calls.filter((call) => ["users", "cache", "top_model"].includes(call[1]));
    expect(unused).toEqual([]);
  });

  it("passes a date range and limit when fetching activity, cache and top model", () => {
    mockEndpoints();
    render({
      widget: { type: "litellm", url: "http://x", fields: ["requests", "tokens", "cache", "failed"] },
    });

    const findCall = (endpoint) => useWidgetAPI.mock.calls.find((call) => call[1] === endpoint);
    const activityCall = findCall("activity");
    expect(activityCall).toBeTruthy();
    expect(activityCall[2]).toEqual(activityRange(DEFAULT_DAYS, new Date(activityCall[2].end_date + "T00:00:00Z")));

    const cacheCall = findCall("cache");
    expect(cacheCall).toBeTruthy();
    expect(cacheCall[2].start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cacheCall[2].end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const topModelCall = findCall("top_model");
    expect(topModelCall).toBeUndefined();
  });

  it("honors the days config for range endpoints and falls back for invalid values", () => {
    mockEndpoints();
    render({
      widget: { type: "litellm", url: "http://x", days: 7, fields: ["requests", "tokens", "cache", "failed"] },
    });

    const findCall = (endpoint) => useWidgetAPI.mock.calls.find((call) => call[1] === endpoint);
    const activityCall = findCall("activity");
    expect(activityCall[2]).toEqual(activityRange(7, new Date(activityCall[2].end_date + "T00:00:00Z")));
    const cacheCall = findCall("cache");
    expect(cacheCall[2]).toEqual(activityRange(7, new Date(cacheCall[2].end_date + "T00:00:00Z")));

    // invalid values fall back to the 30 day default
    useWidgetAPI.mockClear();
    render({
      widget: { type: "litellm", url: "http://x", days: "7", fields: ["requests", "tokens", "cache", "failed"] },
    });
    const fallbackCall = useWidgetAPI.mock.calls.find((call) => call[1] === "activity");
    expect(fallbackCall[2]).toEqual(activityRange(DEFAULT_DAYS, new Date(fallbackCall[2].end_date + "T00:00:00Z")));
  });

  it("renders optional fields budget, users, cache and top_model", () => {
    mockEndpoints({
      spend: { data: SPEND_DATA, error: undefined },
      users: { data: USERS_DATA, error: undefined },
      cache: { data: CACHE_DATA, error: undefined },
      top_model: { data: TOP_MODEL_DATA, error: undefined },
    });

    const { container } = render({
      widget: { type: "litellm", url: "http://x", fields: ["budget", "users", "cache", "top_model"] },
    });

    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "litellm.budget", "12.3");
    expectBlockValue(container, "litellm.users", "7");
    expectBlockValue(container, "litellm.cache_range", "33.3");
    expectBlockValue(container, "litellm.top_model", "gpt-4o");
  });

  it("renders failed count from the cache endpoint", () => {
    mockEndpoints({
      cache: { data: CACHE_DATA, error: undefined },
    });

    const { container } = render({
      widget: { type: "litellm", url: "http://x", fields: ["failed", "cache", "budget", "models"] },
    });

    expectBlockValue(container, "litellm.failed_range", "4");
  });

  it("degrades gracefully when only some endpoints are accessible", () => {
    // a non-admin key can read /v1/models but gets 403 on admin endpoints
    mockEndpoints({
      models: { data: MODELS_DATA, error: undefined },
      spend: { data: undefined, error: { message: "403 forbidden" } },
    });

    const { container } = render({
      widget: { type: "litellm", url: "http://x", fields: ["models", "spend"] },
    });

    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expectBlockValue(container, "litellm.models", "2");
    expect(screen.getByText("litellm.spend").closest(".service-block").textContent).toContain("-");
  });

  it("falls back to spend/total_spend response shape", () => {
    mockEndpoints({
      spend: { data: { total_spend: 5, max_budget: undefined }, error: undefined },
    });

    const { container } = render({
      widget: { type: "litellm", url: "http://x", fields: ["spend", "budget", "models", "users"] },
    });

    expectBlockValue(container, "litellm.spend", "$5.00");
    // budget unavailable without max_budget
    expect(screen.getByText("litellm.budget").closest(".service-block").textContent).toContain("-");
  });
});
