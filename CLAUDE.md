# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MonoClip is a desktop video editing app with AI-powered transcription. It is a three-tier application:
- **Frontend**: Tauri 2 + React 19 + TypeScript — the desktop GUI
- **Rust (Tauri)**: FFmpeg-based video processing (trim, resize, merge) invoked as Tauri commands
- **Python (FastAPI)**: Whisper transcription and badword filtering, runs as a separate local server

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev       # Start Vite dev server (localhost:1420) + Tauri window
npm run build     # TypeScript check + Vite bundle
npm run tauri     # Run Tauri CLI directly
```

### Backend (from `backend/`)
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload   # Start FastAPI on default port 8000
```

### Rust (from `frontend/src-tauri/`)
```bash
cargo build       # Build Tauri backend (also triggered by npm run dev/build)
cargo check       # Fast type-check without full build
```

## Architecture

### Frontend React Structure (`frontend/src/`)
- **`App.tsx`** — root layout: `Navbar` | `Topbar` | `Content` (canvas) | `TimeLine`
- **State** (Zustand stores in `stores/`): `media.store.ts` (imported assets), `editor.store.ts`, `timeline.store.ts`
- **Types**: `MediaAsset` is the core interface (id, path, start/end times, position, dimensions)

### Tauri/Rust Backend (`frontend/src-tauri/src/`)
- **`lib.rs`** — registers Tauri commands; `export_video()` is the main orchestration command
- **`services/`** — FFmpeg wrappers: `trim.rs`, `resize.rs`, `merge.rs`
- **`ffmpeg/runner.rs`** — executes bundled FFmpeg binary
- **`models/request.rs`** — request/response DTOs (serde)

### Python/FastAPI Backend (`backend/app/`)
- **`main.py`** — FastAPI app with CORS; mounts routes
- **`routes/transcribe.py`** — `POST /transcribe`: accepts media file, runs Whisper "medium", returns `TranscriptionResponse`
- **`routes/filter_badword.py`** — `POST /caption/filter`: regex-based profanity masking (ID + EN word lists)
- **`services/whisper_service.py`** — LRU-cached Whisper model loader
- **`utils/formatter.py`** — converts raw Whisper output to `CaptionSegment[]`
- **`schema.py`** — shared Pydantic models: `CaptionSegment` (id, start, end, text), `TranscriptionResponse`

### FFmpeg
FFmpeg binaries are bundled with the Tauri app (configured in `tauri.conf.json` under `bundle.resources`). The Rust services shell out to this binary — do not assume system FFmpeg is available.

### Frontend ↔ Backend Communication
- React calls Rust via `@tauri-apps/api/core` `invoke()` for video processing
- React calls Python via HTTP (`fetch`) for transcription/filtering; the FastAPI server must be running separately during development