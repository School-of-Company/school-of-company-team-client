import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  aspectRatio,
  linkErrorMessage,
  linkSummary,
  type ProjectLink,
} from "./links";
import {
  linkCreateBody,
  linkPatch,
  moveLink,
  validateLinkForm,
} from "./link-form";

const link: ProjectLink = {
  id: "L1",
  url: "https://www.figma.com/design/AbC123/Hub",
  kind: "FIGMA",
  title: "메인 화면 시안",
  customTitle: "메인 화면 시안",
  label: null,
  host: "www.figma.com",
  position: 0,
  embed: null,
  meta: {
    status: "SKIPPED",
    title: null,
    description: null,
    siteName: null,
    fetchedAt: null,
  },
  createdBy: null,
  createdAt: "2026-11-19T10:00:00+09:00",
  updatedAt: "2026-11-19T10:00:00+09:00",
  canEdit: true,
  canDelete: true,
};

test("edit sends only changed fields and clears blanks with null", () => {
  const form = { url: ` ${link.url} `, title: "메인 화면 시안", label: "" };
  assert.deepEqual(linkPatch(link, form), {});
  assert.deepEqual(linkPatch(link, { ...form, title: "  " }), { title: null });
  assert.deepEqual(
    linkPatch({ ...link, label: "디자인" }, { ...form, label: "" }),
    { label: null },
  );
  assert.deepEqual(linkPatch(link, { ...form, url: "https://a.dev" }), {
    url: "https://a.dev",
  });
  assert.deepEqual(
    linkCreateBody({ url: " https://a.dev ", title: " ", label: "배포" }),
    {
      url: "https://a.dev",
      label: "배포",
    },
  );
});

test("form validation mirrors the server url rules", () => {
  const ok = { url: "https://a.dev/x", title: "", label: "" };
  assert.deepEqual(validateLinkForm(ok), {});
  for (const url of ["", "ftp://a.dev", "a.dev", "https://u:p@a.dev"])
    assert.ok(validateLinkForm({ ...ok, url }).url, url);
  assert.ok(validateLinkForm({ ...ok, title: "가".repeat(101) }).title);
  assert.ok(validateLinkForm({ ...ok, label: "가".repeat(31) }).label);
});

test("moving a link returns the full order or null when nothing changes", () => {
  assert.deepEqual(moveLink(["A", "B", "C"], "C", 0), ["C", "A", "B"]);
  assert.deepEqual(moveLink(["A", "B", "C"], "A", 1), ["B", "A", "C"]);
  assert.equal(moveLink(["A", "B"], "A", 0), null);
  assert.equal(moveLink(["A", "B"], "A", 2), null);
  assert.equal(moveLink(["A", "B"], "X", 0), null);
});

test("card summary follows meta status", () => {
  const meta = link.meta;
  assert.equal(linkSummary(link), "Figma");
  assert.equal(
    linkSummary({ ...link, meta: { ...meta, status: "FAILED" } }),
    link.url,
  );
  assert.equal(
    linkSummary({
      ...link,
      meta: { ...meta, status: "OK", description: "설명" },
    }),
    "설명",
  );
  assert.equal(aspectRatio("3:4"), "3 / 4");
  assert.equal(aspectRatio("bad"), "16 / 9");
});

function serverError(status: number, code: string, details?: unknown) {
  return new AxiosError("failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { code, message: "서버 문구", details },
  });
}

test("error messages use server details", () => {
  assert.match(
    linkErrorMessage(serverError(409, "LINK_LIMIT_EXCEEDED", { limit: 50 })),
    /50개/,
  );
  assert.match(
    linkErrorMessage(
      serverError(429, "LINK_REFRESH_TOO_SOON", { retryAfterSeconds: 200 }),
    ),
    /4분 뒤/,
  );
  assert.match(
    linkErrorMessage(
      serverError(429, "LINK_REFRESH_TOO_SOON", { retryAfterSeconds: 30 }),
    ),
    /30초 뒤/,
  );
  assert.equal(linkErrorMessage(serverError(400, "OTHER")), "서버 문구");
});
