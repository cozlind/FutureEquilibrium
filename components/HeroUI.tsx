"use client";

import React, { useMemo, useState } from "react";
import "./heroUI.css";

type Lang = "en" | "ja";

const copy = {
  en: {
    subtitle: "Order ⇄ Chaos",
    meta: ["TOKYO", "KABUKICHO", "INSTALLATION"],
    meterHint:
      "Enter a word or a sentence. The system maps it onto a continuous spectrum between order and chaos.",
    inputLabel: "INPUT",
    placeholder: "e.g. control / freedom / noisy skyline / あしたは…",
    submit: "SUBMIT",
    submitting: "SENDING",
    order: "ORDER",
    chaos: "CHAOS",
    noteEnter: "Press Enter to submit",
    noteShift: "Shift+Enter stays",
    langLabel: "LANG",
  },
  ja: {
    subtitle: "秩序 ⇄ 混沌",
    meta: ["TOKYO", "KABUKICHŌ"],
    meterHint:
      "単語または一文を入力してください。システムが「秩序〜混沌」の連続スペクトラム上に写像します。",
    inputLabel: "入力",
    placeholder: "例：管理 / 自由 / ネオンの街 / 明日は…",
    submit: "送信",
    submitting: "送信中",
    order: "秩序",
    chaos: "混沌",
    noteEnter: "Enterで送信",
    noteShift: "Shift+Enterで改行",
    langLabel: "言語",
  },
} as const;

export default function HeroUI({
  title = "FUTURE EQUILIBRIUM",
  value = 0.52, // 0..1, 0=秩序, 1=混沌
  defaultLang = "ja",
  onSubmit,
  submitting = false,
  submitFxKey = 0,
}: {
  title?: string;
  value?: number;
  defaultLang?: Lang;
  onSubmit?: (text: string) => void;
  submitting?: boolean;
  submitFxKey?: number;
}) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const t = copy[lang];
  const [text, setText] = useState("");

  const pct = Math.max(0, Math.min(1, value));

  // ✅ 宽度用 float，显示用 round（避免 99/101 抖动 & 断层）
  const leftPct = (1 - pct) * 100;
  const rightPct = 100 - leftPct;

  // ✅ 指示器应落在“左侧填充结束处”
  const indicatorStyle = useMemo(
    () => ({ ["--p" as any]: `${leftPct}%` }),
    [leftPct]
  );

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const v = text.trim();
    if (!v) return;
    onSubmit?.(v);
  };

  return (
    <div className="hero-root">
      <header className="hero-header">
        <div className="hero-topbar">
          <div className="hero-kicker">{t.subtitle}</div>

          <div className="lang-switch" role="group" aria-label={t.langLabel}>
            <button
              type="button"
              className={`lang-btn ${lang === "ja" ? "is-active" : ""}`}
              onClick={() => setLang("ja")}
            >
              日本語
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === "en" ? "is-active" : ""}`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>
        </div>

        <h1 className="hero-title">{title}</h1>

        <div className="hero-meta">
          <span className="hero-chip">{t.meta[0]}</span>
          <span className="hero-dot" />
          <span className="hero-chip">{t.meta[1]}</span>
        </div>
      </header>

      {/* ✅ submitFxKey 用 key 强制重播 CSS 动画（更明显“提交触发”） */}
      <section className="meter-card fx-scope" key={`m-${submitFxKey}`}>
        <div className="meter-row">
          <div className="meter-label meter-label-left">
            {t.order} <span className="meter-num">{Math.round(leftPct)}%</span>
          </div>
          <div className="meter-label meter-label-right">
            <span className="meter-num">{Math.round(rightPct)}%</span> {t.chaos}
          </div>
        </div>

        <div className="meter-track" style={indicatorStyle}>
          <div
            className="meter-fill meter-fill-left"
            style={{ width: `${leftPct}%` }}
          />
          <div
            className="meter-fill meter-fill-right"
            style={{ width: `${rightPct}%` }}
          />

          <div className="meter-indicator" />
          <div className="meter-gloss" />
        </div>

        <div className="meter-hint">{t.meterHint}</div>
      </section>

      <form
        className={`input-card ${submitting ? "is-submitting" : ""} fx-scope`}
        key={`i-${submitFxKey}`}
        onSubmit={onFormSubmit}
      >
        <label className="input-label" htmlFor="prompt">
          {t.inputLabel}
        </label>

        <div className="input-row">
          <input
            id="prompt"
            className="input-box"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={submitting}
          />
          <button className="input-btn" type="submit" disabled={submitting}>
            <span className={`btn-label ${submitting ? "is-dim" : ""}`}>
              {submitting ? t.submitting : t.submit}
            </span>
            <span className={`btn-pulse ${submitting ? "is-on" : ""}`} />
          </button>
        </div>

        <div className="input-foot">
          <span className="input-note">{t.noteEnter}</span>
          <span className="input-note">{t.noteShift}</span>
        </div>
      </form>
    </div>
  );
}
