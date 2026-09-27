import { useTranslation } from "next-i18next/pages";

import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import useWidgetAPI from "utils/proxy/use-widget-api";
import withWidgetFields from "utils/widget-fields";

export const DEFAULT_FIELDS = ["models", "spend", "requests", "users"];

// which endpoint provides the data for each field
const FIELD_ENDPOINTS = {
  models: "models",
  spend: "spend",
  budget: "spend",
  requests: "activity",
  tokens: "activity",
  users: "users",
  cache: "cache",
  failed: "cache",
  top_model: "top_model",
};

// /global/activity requires an explicit date range; show the last 30 days
const ACTIVITY_WINDOW_DAYS = 30;

export function activityRange(now = new Date()) {
  const start = new Date(now.getTime() - (ACTIVITY_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);
  const format = (date) => date.toISOString().slice(0, 10);
  return { start_date: format(start), end_date: format(now) };
}

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Component({ service: configuredService }) {
  const { t } = useTranslation();

  const service = withWidgetFields(configuredService, DEFAULT_FIELDS);
  const { widget } = service;
  const { fields } = widget;

  const wanted = (endpoint) => fields.some((field) => FIELD_ENDPOINTS[field] === endpoint);

  const { data: modelsData, error: modelsError } = useWidgetAPI(widget, wanted("models") ? "models" : "");
  const { data: spendData, error: spendError } = useWidgetAPI(widget, wanted("spend") ? "spend" : "");
  const { data: activityData, error: activityError } = useWidgetAPI(
    widget,
    wanted("activity") ? "activity" : "",
    activityRange(),
  );
  const { data: usersData, error: usersError } = useWidgetAPI(widget, wanted("users") ? "users" : "");
  const { data: cacheData, error: cacheError } = useWidgetAPI(widget, wanted("cache") ? "cache" : "", activityRange());
  const { data: topModelData, error: topModelError } = useWidgetAPI(widget, wanted("top_model") ? "top_model" : "", {
    limit: 1,
  });

  const sources = {
    models: { data: modelsData, error: modelsError },
    spend: { data: spendData, error: spendError },
    activity: { data: activityData, error: activityError },
    users: { data: usersData, error: usersError },
    cache: { data: cacheData, error: cacheError },
    top_model: { data: topModelData, error: topModelError },
  };

  const usedSources = fields.map((field) => sources[FIELD_ENDPOINTS[field]]).filter(Boolean);
  const firstError = usedSources.find((source) => source.error)?.error;

  if (usedSources.every((source) => source.error)) {
    return <Container service={service} error={firstError} />;
  }

  const getFieldValue = (field) => {
    const source = sources[FIELD_ENDPOINTS[field]];
    if (!source || source.error) return undefined;
    const { data } = source;

    switch (field) {
      case "models":
        return Array.isArray(data) ? data.length : undefined;
      case "spend":
        return formatCurrency(data?.spend ?? data?.total_spend);
      case "budget": {
        const spend = Number(data?.spend ?? data?.total_spend);
        const budget = Number(data?.max_budget);
        if (!Number.isFinite(spend) || !Number.isFinite(budget) || budget <= 0) return undefined;
        return t("common.percent", { value: ((spend / budget) * 100).toPrecision(3) });
      }
      case "requests":
        return data?.sum_api_requests == undefined ? undefined : t("common.number", { value: data.sum_api_requests });
      case "tokens":
        return data?.sum_total_tokens == undefined ? undefined : t("common.number", { value: data.sum_total_tokens });
      case "users": {
        const count = data?.total ?? (Array.isArray(data?.users) ? data.users.length : undefined);
        return count == undefined ? undefined : t("common.number", { value: count });
      }
      case "cache": {
        const ratio = Number(data?.totals?.cache_hit_ratio);
        return Number.isFinite(ratio) ? t("common.percent", { value: ratio.toPrecision(3) }) : undefined;
      }
      case "failed":
        return data?.totals?.failed_requests == undefined
          ? undefined
          : t("common.number", { value: data.totals.failed_requests });
      case "top_model":
        return Array.isArray(data) ? (data[0]?.model ?? data[0]?.model_group ?? data[0]?.model_name) : undefined;
      default:
        return undefined;
    }
  };

  return (
    <Container service={service}>
      {fields.map((field) => (
        <Block key={field} label={`litellm.${field}`} value={getFieldValue(field)} />
      ))}
    </Container>
  );
}
