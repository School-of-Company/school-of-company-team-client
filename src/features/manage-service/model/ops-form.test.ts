import assert from "node:assert/strict";
import { test } from "node:test";
import type { ServiceOps } from "@/entities/service";
import { opsFormToRequest, opsToForm } from "./ops-form";

const empty: ServiceOps = {
  serviceId: "S1",
  healthCheck: null,
  health: {
    status: "UNKNOWN",
    latencyMs: null,
    lastCheckedAt: null,
    lastErrorCode: null,
  },
  recentChecks: [],
  links: {
    dashboardUrl: null,
    logsUrl: null,
    errorTrackerUrl: null,
    runbook: null,
  },
  sentry: {
    orgSlug: null,
    projectSlug: null,
    status: "NOT_LINKED",
    unresolvedCount: null,
    events24h: null,
    fetchedAt: null,
    errorCode: null,
  },
  webhook: { configured: false, rotatedAt: null, path: "/x" },
  openIncident: null,
  canEdit: true,
};

test("an untouched empty form clears everything (PUT replaces the whole row)", () => {
  assert.deepEqual(opsFormToRequest(opsToForm(empty)), {
    healthCheck: null,
    dashboardUrl: null,
    logsUrl: null,
    errorTrackerUrl: null,
    runbookDocumentId: null,
    sentryOrgSlug: null,
    sentryProjectSlug: null,
  });
});

test("enabling the health check sends server defaults for blank numbers", () => {
  const form = {
    ...opsToForm(empty),
    healthEnabled: true,
    url: " https://hub.example.com/health ",
    intervalSeconds: "",
    timeoutMs: "2000",
    dashboardUrl: "  ",
    sentryOrgSlug: "soc",
    sentryProjectSlug: "hub",
  };
  const request = opsFormToRequest(form);
  assert.deepEqual(request.healthCheck, {
    url: "https://hub.example.com/health",
    intervalSeconds: 300,
    timeoutMs: 2000,
    expectedStatusMin: 200,
    expectedStatusMax: 399,
    allowHttp: false,
  });
  assert.equal(request.dashboardUrl, null);
  assert.equal(request.sentryProjectSlug, "hub");
});

test("saved settings round-trip unchanged", () => {
  const ops: ServiceOps = {
    ...empty,
    healthCheck: {
      url: "http://hub.internal/health",
      intervalSeconds: 60,
      timeoutMs: 1000,
      expectedStatusMin: 200,
      expectedStatusMax: 204,
      allowHttp: true,
    },
    links: {
      ...empty.links,
      runbook: { id: "K1", title: "대응", status: "PUBLISHED" },
    },
  };
  const request = opsFormToRequest(opsToForm(ops));
  assert.deepEqual(request.healthCheck, ops.healthCheck);
  assert.equal(request.runbookDocumentId, "K1");
});
