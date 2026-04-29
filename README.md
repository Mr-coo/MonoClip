# MonoClip

## Deskripsi

**Tujuan:**
Aplikasi ini dibuat dengan tujuan untuk menyediakan *video editor* gratis yang dapat digunakan oleh mahasiswa maupun untuk keperluan pribadi.

**Masalah:**
Saat ini, sebagian besar aplikasi *video editing* yang tersedia di pasaran berbayar atau menerapkan sistem langganan. Banyak aplikasi gratis yang dipenuhi dengan iklan (*ads*) yang mengganggu kenyamanan pengguna. Selain itu, fitur-fitur canggih yang menggunakan AI (seperti transkripsi otomatis atau *auto-captions*) umumnya terkunci di balik fitur premium (*paywall*). MonoClip hadir untuk menyelesaikan masalah tersebut dengan menyediakan aplikasi video editor ber-AI yang sepenuhnya gratis tanpa iklan.

## Tech Stack
MonoClip berjalan secara lokal dan dibangun menggunakan:
- **Frontend:** Tauri 2, React 19, TypeScript
- **Desktop System:** Rust & integrasi FFmpeg (untuk proses trim, resize, dan merge video)
- **AI / Backend:** Python (FastAPI) dengan Whisper untuk transkripsi dan pemfilteran kata kasar (*badwords*).