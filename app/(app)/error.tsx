"use client";

// (app) 안의 오류는 셸(사이드바) 안에서 보여 준다. 루트 error.tsx 는 셸 밖(로그인 등)만 맡는다.
export { RouteError as default } from "@/app/boundaries";
