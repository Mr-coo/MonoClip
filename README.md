# MonoClip

## Team Members
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
Sebagian besar aplikasi video editing populer mengunci fitur AI dan fitur lengkap di balik subscription berbayar. MonoClip hadir sebagai solusi yang menjalankan pemrosesan video sepenuhnya di komputer pengguna, dengan server AI lokal — tanpa biaya langganan.

---

## Untuk Dosen / Penguji — Cara Tercepat Menjalankan

> Lihat bagian [Quick Start](#quick-start) di bawah. Singkatnya:
> 1. Install prasyarat (Docker Desktop, Node.js, Rust).
> 2. Jalankan **`setup.ps1`** sekali (membuat konfigurasi & install dependency).
> 3. Klik dua kali **`run.bat`** untuk menjalankan seluruh aplikasi.

---

## Fitur Utama

| Fitur | Deskripsi |
|---|---|
| **Import Media** | Import file video/audio ke timeline editing |
| **Timeline Editing** | Susun, potong, dan atur klip di atas timeline berbasis track |
| **Canvas Preview** | Preview hasil editing secara real-time dengan snap guides |
| **Ubah Rasio Canvas** | Ganti aspek rasio canvas (16:9, 9:16, 1:1, dsb.) |
| **Export Video** | Render dan ekspor hasil editing ke file MP4 (FFmpeg) |
| **Transkripsi AI** | Generate caption/subtitle otomatis menggunakan Whisper AI |
| **Terjemahan Caption** | Terjemahkan caption ke bahasa lain (Helsinki-NLP / OPUS-MT) |
| **Filter Kata Kasar** | Sensor otomatis kata kasar (Bahasa Indonesia & Inggris) |
| **Object Tracking** | Lacak objek di dalam video (OpenCV CSRT) dan terapkan efek zoom otomatis |
| **Hapus Background AI** | Hapus background gambar (PNG RGBA) & video (WebM VP9 dengan alpha) via rembg / U2Net |
| **Akun & Login** | Registrasi email + verifikasi OTP, login, serta OAuth Google / GitHub (JWT) |
| **Simpan / Muat Proyek** | Simpan dan buka kembali sesi editing |
| **Keyboard Shortcuts** | Shortcut keyboard untuk operasi editing yang cepat |

---

## Arsitektur

MonoClip adalah aplikasi tiga lapis:

- **Frontend (Tauri 2 + React 19 + TypeScript)** — GUI desktop.
- **Rust (Tauri)** — pemrosesan video berbasis FFmpeg (trim, resize, merge, export) yang dipanggil sebagai Tauri command.
- **Python (FastAPI)** — server AI lokal: transkripsi Whisper, terjemahan, filter kata kasar, object tracking, hapus background, serta akun/autentikasi (PostgreSQL + JWT).

Komunikasi:
- React → Rust lewat `@tauri-apps/api` `invoke()` untuk pemrosesan video.
- React → Python lewat HTTP (Tauri HTTP plugin) untuk fitur AI & autentikasi. Server FastAPI harus berjalan terpisah.

---

## Project Structure

```
monoclip/
├── frontend/                  # Aplikasi desktop (Tauri + React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # Layar login / registrasi
│   │   │   ├── buttons/
│   │   │   ├── navbar/        # Panel navigasi & library aset
│   │   │   ├── topbar/        # Toolbar aksi (export, save, dsb.)
│   │   │   ├── content/       # Canvas preview
│   │   │   └── timeline/      # Timeline editor
│   │   ├── store/             # State global (Zustand)
│   │   │   ├── auth.store.ts
│   │   │   ├── media.store.ts
│   │   │   ├── editor.store.ts
│   │   │   ├── timeline.store.ts
│   │   │   ├── caption.store.ts
│   │   │   ├── history.store.ts
│   │   │   └── dragLibrary.store.ts
│   │   ├── hook/              # Custom React hooks (playback, drag, shortcuts, dll.)
│   │   ├── types/             # TypeScript types & DTO
│   │   ├── enum/ · utils/
│   │   └── App.tsx
│   └── src-tauri/             # Backend desktop (Rust)
│       ├── ffmpeg/            # Binary FFmpeg bundled (ffmpeg/ffprobe/ffplay.exe)
│       └── src/
│           ├── services/      # FFmpeg wrappers (trim, resize, merge, export)
│           ├── ffmpeg/        # FFmpeg runner
│           ├── models/        # Request/response DTOs
│           └── lib.rs         # Registrasi Tauri commands
│
├── backend/                   # Server AI + akun (Python + FastAPI)
│   ├── app/
│   │   ├── routes/            # transcribe, filter_badword, translate,
│   │   │                      #   tracking, bgremove, auth
│   │   ├── services/          # Whisper, terjemahan, tracking, bg removal,
│   │   │                      #   auth, oauth, email/OTP
│   │   ├── core/              # config, security (JWT), deps, rate limit
│   │   ├── db/                # SQLAlchemy async session
│   │   ├── models/ · schemas/ # ORM + Pydantic schemas
│   │   └── main.py
│   ├── alembic/               # Migrasi database (PostgreSQL)
│   ├── Dockerfile
│   ├── docker-compose.yml     # PostgreSQL + backend + migrasi
│   ├── requirements.txt
│   └── .env.example
│
├── setup.ps1                  # Setup sekali jalan (cek prasyarat, .env, npm install)
├── run.bat                    # Jalankan backend (Docker) + frontend (Tauri)
└── README.md
```

---

## Prasyarat

Pastikan perangkat telah menginstal:

| Tools | Versi | Dipakai untuk |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18+ | Frontend (Vite + Tauri CLI) |
| [Rust](https://www.rust-lang.org/tools/install) | stable | Build Tauri (desktop) |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | terbaru | Menjalankan backend + PostgreSQL (cara termudah) |

> FFmpeg **tidak perlu** diinstal manual — binary-nya sudah dibundel di `frontend/src-tauri/ffmpeg/`.
>
> Tanpa Docker, backend tetap bisa dijalankan manual (butuh Python 3.10+ dan PostgreSQL terpasang sendiri — lihat [Menjalankan Backend Tanpa Docker](#opsional-menjalankan-backend-tanpa-docker)).

---

## Quick Start

### 1. Clone repository

```bash
git clone https://github.com/your-org/monoclip.git
cd monoclip
```

### 2. Setup sekali jalan

Buka **PowerShell** di folder proyek, lalu jalankan:

```powershell
.\setup.ps1
```

Script ini akan:
- Mengecek apakah Docker, Node.js, dan Rust sudah terpasang.
- Membuat `backend/.env` dari `.env.example` **dan mengisi `JWT_SECRET` acak** (backend menolak start tanpa ini).
- Menjalankan `npm install` di folder `frontend/`.

> Jika muncul error _"running scripts is disabled"_, jalankan sekali:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` lalu ulangi.

### 3. Jalankan aplikasi

Klik dua kali **`run.bat`** (atau jalankan dari terminal). Dua jendela akan terbuka:
- **Backend** — `docker compose up --build` (PostgreSQL + migrasi Alembic + FastAPI di `http://127.0.0.1:8000`).
- **Frontend** — `npm run tauri dev` (jendela aplikasi MonoClip terbuka otomatis).

> Build pertama kali memakan waktu: Docker menarik image + dependency Python, lalu model Whisper (~1.5 GB) diunduh saat transkripsi pertama. Sabar pada run pertama. 🙂

Dokumentasi API tersedia di `http://127.0.0.1:8000/docs` saat backend berjalan.

---

## Konfigurasi Opsional (Fitur Login Lengkap)

Aplikasi sudah berjalan tanpa konfigurasi tambahan. Beberapa fitur akun memerlukan kredensial eksternal — semua diatur di `backend/.env`:

| Fitur | Variabel `.env` | Catatan |
|---|---|---|
| Verifikasi email saat registrasi | `SMTP_USER`, `SMTP_PASSWORD` | Pakai Gmail **App Password**. Jika kosong, kode OTP **dicetak ke log backend** (tetap bisa dipakai untuk demo). |
| Login Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Redirect URI: `http://127.0.0.1:8000/auth/google/callback` |
| Login GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Callback URL: `http://127.0.0.1:8000/auth/github/callback` |

Registrasi email + password **selalu bisa dipakai** tanpa konfigurasi tambahan (saat SMTP kosong, ambil kode OTP dari log backend).

---

## Endpoint Backend (Referensi)

Semua endpoint fitur memerlukan **Bearer token** (didapat setelah login), kecuali yang berada di bawah `/auth` dan endpoint download file.

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET`  | `/health` | Cek status server |
| `POST` | `/auth/register` | Mulai registrasi → kirim kode OTP ke email |
| `POST` | `/auth/register/verify` | Konfirmasi kode OTP & selesaikan registrasi → token |
| `POST` | `/auth/login` | Login email + password → token |
| `GET`  | `/auth/me` | Info user yang sedang login |
| `GET`  | `/auth/{provider}/login` | Mulai OAuth (Google / GitHub) |
| `GET`  | `/auth/{provider}/callback` | Callback OAuth → serahkan token ke aplikasi |
| `POST` | `/auth/exchange` | Tukar one-time code OAuth menjadi access token |
| `POST` | `/transcribe` | Upload media → caption dari Whisper |
| `POST` | `/caption/filter` | Filter/sensor kata kasar |
| `GET`  | `/caption/translate/languages` | Daftar bahasa tujuan terjemahan |
| `POST` | `/caption/translate` | Terjemahkan caption ke bahasa lain |
| `POST` | `/track` | Upload video + bounding box → lacak objek & zoom |
| `GET`  | `/track/file/{filename}` | Download video hasil tracking |
| `POST` | `/bgremove` | Hapus background gambar / video |
| `GET`  | `/bgremove/file/{filename}` | Download hasil hapus background |

---

## Build untuk Produksi

```bash
cd frontend
npm run build       # TypeScript check + bundle Vite
npm run tauri build # Installer desktop
```

Binary instalasi tersedia di `frontend/src-tauri/target/release/bundle/`.

---

## (Opsional) Menjalankan Backend Tanpa Docker

Butuh **Python 3.10+** dan **PostgreSQL** yang berjalan sendiri.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt

# pastikan backend/.env berisi DATABASE_URL yang valid + JWT_SECRET
alembic upgrade head            # jalankan migrasi database
uvicorn app.main:app --reload   # server di http://localhost:8000
```

> Instalasi `openai-whisper` akan mengunduh model AI (~1.5 GB) saat transkripsi pertama dijalankan.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Backend langsung mati / error `JWT_SECRET` | Jalankan `setup.ps1` agar `backend/.env` dibuat dengan `JWT_SECRET` acak. |
| `docker: command not found` | Install & jalankan Docker Desktop, lalu coba lagi. |
| Jendela Tauri tidak terbuka | Pastikan Rust terpasang (`rustc --version`) dan `npm install` sudah selesai. |
| Transkripsi pertama lama | Normal — model Whisper sedang diunduh & di-cache. |
| Tidak menerima email OTP | Saat `SMTP_*` kosong, kode OTP dicetak di jendela log backend. |
