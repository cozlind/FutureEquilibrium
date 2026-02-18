# Future Equilibrium

An interactive installation exploring a simple question:

> Will the future lean more toward order, or toward chaos?

Visitors enter a word or short sentence. The system analyzes its semantic tendency using AI and visualizes the result through a digital balance and a physical device.

---

## Concept

Language reflects perception.

Each input is interpreted as leaning toward:
- Order
- Chaos

The installation aggregates responses in real time and expresses the current collective tendency as a shifting balance.

This is not a prediction of the future. It is a measurement of how people imagine it.

---

## System Overview

User Input -> AI Semantic Analysis -> Database Storage -> Physical Device Output

---

## Components

### 1) Web Interface
- Users enter a word or sentence.
- A balance visualization updates instantly.
- The current Order vs Chaos value is displayed.
- Deployed as a serverless web application.

### 2) AI Analysis Layer
- The backend sends user input to an LLM.
- The model returns normalized scores.

Example response (JSON):
{ "order_score": 0.68, "chaos_score": 0.32 }

### 3) Database
- All inputs and their scores are stored in a PostgreSQL database.
- Each record contains: text, order_score, chaos_score, timestamp
- The system continuously calculates the overall average tendency.

### 4) Physical Installation (Arduino)
Architecture:
Cloud API -> Local Python Bridge -> Serial Communication -> Arduino UNO

Arduino outputs:
- Motors (balance movement)
- LEDs
- Other physical elements

The installation physically reflects the current Order–Chaos ratio.

---

## Core Idea

The project turns abstract language into a measurable force.

Order and chaos are not opposites — they are dynamic states within evolving systems.
