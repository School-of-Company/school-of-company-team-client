import assert from "node:assert/strict";
import { test } from "node:test";
import { HIDDEN_REPOSITORY } from "@/shared/lib";
import { publicationName } from "./publication";

const publication = (publiclyVisible: boolean) => ({
  projectRepositoryId: "r1",
  repositoryFullName: "acme/secret",
  publiclyVisible,
});
const option = {
  id: "r1",
  repositoryId: 1,
  fullName: "acme/secret",
  private: true,
  isDefault: false,
};

test("볼 수 있는 선택지에 있으면 그 이름을 쓴다", () => {
  assert.equal(publicationName(publication(false), [option]), "acme/secret");
});

test("비공개 대상이 선택지에서 빠졌거나 선택지를 모르면 이름을 쓰지 않는다", () => {
  assert.equal(publicationName(publication(false), []), HIDDEN_REPOSITORY);
  assert.equal(
    publicationName(publication(false), undefined),
    HIDDEN_REPOSITORY,
  );
});

test("서버가 이름을 숨긴 선택지는 이름 대신 비공개 저장소로 쓴다", () => {
  assert.equal(
    publicationName(publication(false), [{ ...option, accessible: false }]),
    HIDDEN_REPOSITORY,
  );
});

test("공개 저장소는 선택지 밖이어도 이름을 쓴다", () => {
  assert.equal(publicationName(publication(true), []), "acme/secret");
});
