"use client";

import { useState } from "react";
import BackgroundA from "@/components/BackgroundA";
import HeroUI from "@/components/HeroUI";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export default function ClientApp() {
  const [v, setV] = useState(0.52); // 0..1, 0=秩序, 1=混沌
  const [submitting, setSubmitting] = useState(false);
  const [submitFxKey, setSubmitFxKey] = useState(0);

  return (
    <>
      {/* 你现在的参数很激进，OK就保持；若 UI 被压过再调小 */}
      <BackgroundA blobCount={38} intensity={8.1} speed={8.0} />

      <HeroUI
        defaultLang="ja"
        value={v}
        submitting={submitting}
        submitFxKey={submitFxKey}
        onSubmit={async (text) => {
          if (submitting) return;

          try {
            setSubmitting(true);

            const res = await fetch("/api/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ word: text }),
            });

            const data = await res.json();
            if (!res.ok || !data?.ok) {
              console.error("submit failed:", data);
              // 失败也给一下反馈（可选）
              setSubmitFxKey((k) => k + 1);
              return;
            }

            // 后端：score in [-1, 1]
            const score = Number(data.score ?? 0);

            // UI：value in [0, 1]
            const value01 = clamp01((score + 1) / 2);
            setV(value01);

            // 提交成功反馈动画触发
            setSubmitFxKey((k) => k + 1);
          } catch (e) {
            console.error(e);
            setSubmitFxKey((k) => k + 1);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </>
  );
}
