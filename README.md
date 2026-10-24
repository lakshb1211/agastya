# Agastya — Your Learning Universe (React & Express)

A modern, offline-first study companion web application rewritten in **React 19, TypeScript, and Vite**, powered by an integrated **Node.js (Express)** full-stack backend. Features grounded material ingestion (PDF/Text), cited study plans, dynamic diagnostic quizzes, streak tracking, interactive progress analytics, and AI-powered doubt solving.

---

## 🌟 Highlights & Features

- **Cosmic Space Interface**: Canopus-themed starry canvas background, 3D shooting-star loader, and planetary orbit visualizations.
- **Multilingual Support (i18n)**: Seamless instant switching between English, हिन्दी (Hindi), Español (Spanish), and Français (French).
- **Study Studio**:
  - Ingest PDF textbook pages or paste custom notes.
  - Automatic key topic extraction, core principles extraction with citations, and SVG concept mapping.
  - Grounded question answering (Q&A) strictly based on provided material with source citations.
- **Adaptive Diagnostic Quizzes**:
  - Multiple-choice questions with confidence levels and instant grading.
  - Automatic weak-topic identification (<70% accuracy) and targeted follow-up quizzes.
- **Personalized Revision Plans**:
  - Structured multi-day revision schedule with focus areas and step-by-step guidance.
- **Progress Analytics Dashboard**:
  - SVG Score Trend visualization with 70% mastery goal line.
  - Topic-by-topic accuracy bars and history logs.
- **AI Doubt-Solving Companion (Chatbot)**:
  - Interactive floating Canopus star assistant providing step-by-step doubt resolution in any chosen language.
- **Flexible Auth & Data Persistence**:
  - Works with Express JWT backend, Supabase sync, and local storage offline fallback.

---

## 🚀 Quick Start

Requires Node.js 20 or newer.

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 🧠 Architecture

- **Frontend**: React 19 SPA, TypeScript, Vite, Custom Cosmic CSS design system with zero third-party UI framework slop.
- **Backend**: Express 5 on Node.js mounting Vite middlewares in development and serving static assets in production (`server.ts`).
- **AI Integration**: Powered by Gemini API with fallback heuristic extraction for local offline environments.
