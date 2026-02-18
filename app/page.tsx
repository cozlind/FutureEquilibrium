"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [word, setWord] = useState("");
  const [ratio, setRatio] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.ok) {
        setRatio(data.stats.ratio ?? 0);
        setCount(data.stats.total_count ?? 0);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmit() {
    if (!word.trim()) return;
    setLoading(true);

    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word }),
      });
      setWord("");
      await fetchStats();
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const widthPercent = Math.abs(ratio) * 50; // half width each side

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>
        ORDER <span style={{ opacity: 0.3 }}>/</span> CHAOS
      </h1>

      <div style={styles.barContainer}>
        <div style={styles.centerLine} />

        {ratio < 0 && (
          <div
            style={{
              ...styles.chaosFill,
              width: `${widthPercent}%`,
            }}
          />
        )}

        {ratio > 0 && (
          <div
            style={{
              ...styles.orderFill,
              width: `${widthPercent}%`,
            }}
          />
        )}
      </div>

      <div style={styles.labels}>
        <span style={{ color: "#ff3b3b" }}>CHAOS</span>
        <span style={{ color: "#4da6ff" }}>ORDER</span>
      </div>

      <div style={styles.ratioNumber}>
        {ratio.toFixed(3)}
      </div>

      <div style={styles.count}>
        {count} PARTICIPANTS
      </div>

      <div style={styles.inputWrapper}>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="ENTER A SIGNAL"
          style={styles.input}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "..." : "TRANSMIT"}
        </button>
      </div>
    </main>
  );
}

const styles: any = {
  container: {
    minHeight: "100vh",
    background: "black",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "monospace",
  },

  title: {
    fontSize: "clamp(28px, 6vw, 48px)",
    letterSpacing: "4px",
    marginBottom: "50px",
  },

  barContainer: {
    position: "relative",
    width: "100%",
    maxWidth: "600px",
    height: "18px",
    background: "#111",
    marginBottom: "10px",
    overflow: "hidden",
  },

  centerLine: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: "2px",
    background: "#666",
    transform: "translateX(-1px)",
  },

  chaosFill: {
    position: "absolute",
    right: "50%",
    top: 0,
    bottom: 0,
    background: "linear-gradient(90deg, #ff0000, #ff3b3b)",
    boxShadow: "0 0 10px #ff0000",
    transition: "width 0.6s ease",
  },

  orderFill: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    background: "linear-gradient(90deg, #0066ff, #4da6ff)",
    boxShadow: "0 0 10px #0066ff",
    transition: "width 0.6s ease",
  },

  labels: {
    width: "100%",
    maxWidth: "600px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    marginBottom: "30px",
    opacity: 0.7,
  },

  ratioNumber: {
    fontSize: "clamp(40px, 12vw, 80px)",
    marginBottom: "10px",
  },

  count: {
    fontSize: "14px",
    opacity: 0.5,
    marginBottom: "50px",
  },

  inputWrapper: {
    width: "100%",
    maxWidth: "600px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  input: {
    padding: "18px",
    fontSize: "18px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid #333",
    color: "white",
    outline: "none",
  },

  button: {
    padding: "16px",
    fontSize: "18px",
    background: "transparent",
    border: "1px solid #4da6ff",
    color: "#4da6ff",
    letterSpacing: "2px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};
