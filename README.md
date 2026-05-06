# MonoClip

A project by:
- Marco Linardi
- Johanes Cedrick
- Villyan Sutanto

---

## Deskripsi

MonoClip adalah aplikasi **desktop video editing gratis** yang terintegrasi dengan AI, dibangun menggunakan Tauri 2 + React 19 + Rust + Python.

**Tujuan:**
Membantu siswa dan mahasiswa yang membutuhkan aplikasi video editing yang bebas iklan, gratis, mudah digunakan, dan langsung dilengkapi fitur AI — tanpa perlu membayar subscription.

**Masalah yang Diselesaikan:**
Sebagian besar aplikasi video editing populer mengunci fitur AI dan fitur lengkap di balik subscription berbayar. MonoClip hadir sebagai solusi lokal yang berjalan sepenuhnya di komputer pengguna, tanpa biaya dan tanpa ketergantungan pada layanan cloud berbayar.

---

## Fitur Utama

| Fitur | Deskripsi |
|---|---|
| **Import Media** | Import file video/audio ke timeline editing |
| **Timeline Editing** | Susun, potong, dan atur klip di atas timeline berbasis track |
| **Canvas Preview** | Preview hasil editing secara real-time dengan snap guides |
| **Ubah Rasio Canvas** | Ganti aspek rasio canvas (16:9, 9:16, 1:1, dsb.) |
| **Export Video** | Render dan ekspor hasil editing ke file MP4 |
| **Transkripsi AI** | Generate caption/subtitle otomatis menggunakan Whisper AI |
| **Filter Kata Kasar** | Sensor otomatis kata kasar (Bahasa Indonesia & Inggris) |
| **Object Tracking** | Lacak objek di dalam video dan terapkan efek zoom otomatis |
| **Simpan / Muat Proyek** | Simpan dan buka kembali sesi editing |
| **Keyboard Shortcuts** | Shortcut keyboard untuk operasi editing yang cepat |

---

## Project Structure

```
monoclip/
├── frontend/                  # Aplikasi desktop (Tauri + React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── navbar/        # Panel navigasi & library aset
│   │   │   ├── topbar/        # Toolbar aksi (export, save, dsb.)
│   │   │   ├── content/       # Canvas preview
│   │   │   └── timeline/      # Timeline editor
│   │   ├── store/             # State global (Zustand)
│   │   │   ├── media.store.ts
│   │   │   ├── editor.store.ts
│   │   │   ├── timeline.store.ts
│   │   │   └── caption.store.ts
│   │   ├── hook/              # Custom React hooks
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx
│   └── src-tauri/             # Backend desktop (Rust)
│       └── src/
│           ├── services/      # FFmpeg wrappers (trim, resize, merge, export)
│           ├── ffmpeg/        # FFmpeg runner
│           ├── models/        # Request/response DTOs
│           └── lib.rs         # Registrasi Tauri commands
│
├── backend/                   # AI server (Python + FastAPI)
│   └── app/
│       ├── routes/
│       │   ├── transcribe.py  # POST /transcribe
│       │   ├── filter_badword.py # POST /caption/filter
│       │   └── tracking.py    # POST /track
│       ├── services/          # Whisper & object tracking logic
│       ├── utils/             # Formatter output Whisper
│       ├── models/            # Pydantic schemas
│       └── main.py
│
└── README.md
```

---

## Installation

### Prasyarat

Pastikan perangkat telah menginstal:
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (toolchain stable)
- [Python](https://www.python.org/) (3.10+)
- [FFmpeg](https://ffmpeg.org/download.html) — letakkan binary `ffmpeg.exe` di `frontend/src-tauri/ffmpeg/`

### 1. Clone Repository

```bash
git clone https://github.com/your-org/monoclip.git
cd monoclip
```

### 2. Setup Frontend

```bash
cd frontend
npm install
```

### 3. Setup Backend (Python)

```bash
cd backend
pip install -r requirements.txt
```

> **Catatan:** Proses instalasi `openai-whisper` akan mengunduh model AI (~1.5 GB) saat pertama kali dijalankan.

---

## Usage

### Jalankan Backend (AI Server)

Buka terminal, masuk ke folder `backend/`, lalu jalankan:

```bash
cd backend
uvicorn app.main:app --reload
```

Server berjalan di `http://localhost:8000`.

### Jalankan Aplikasi Desktop

Buka terminal baru, masuk ke folder `frontend/`, lalu jalankan:

```bash
cd frontend
npm run dev
```

Perintah ini akan memulai Vite dev server dan membuka jendela aplikasi Tauri.

### Build untuk Produksi

```bash
cd frontend
npm run build
```

Binary instalasi akan tersedia di `frontend/src-tauri/target/release/bundle/`.

---

### Endpoint Backend (Referensi)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/health` | Cek status server |
| `POST` | `/transcribe` | Upload media → terima caption dari Whisper |
| `POST` | `/caption/filter` | Filter kata kasar dari hasil transkripsi |
| `POST` | `/track` | Upload video + koordinat → lacak objek & zoom |
