# MonoClip

A project by:
- Marco Linardi: 
- Johanes Cedrick: 
- Villyan Sutanto: 

## Deskripsi
Aplikasi MonoClip adalah sebuah Video Editing App gratis yang mampu untuk menjalankan operasi editing sederhana dengan fitur tambahan yang terintegrasi dengan AI.

**Tujuan:**
Tujuan dari aplikasi ini adalah membantu masyarakat terutama yang sedang menempuh pendidikan untuk dapat menggunakan aplikasi Video Editing yang bebas iklan, gratis, dan langsung terintegrasi dengan AI.

**Masalah:**
Sebagian besar aplikasi Video Editing yang beredar rata-rata membutuhkan subscription untuk dapat menggunakan seluruh fitur lengkap termasuk dengan fitur AI. Hal ini menyebabkan teman-teman siswa dan mahasiswa harus mengeluarkan uang untuk membayar subscription pada aplikasi tersebut. Padahal, aplikasi video editing menjadi salah satu aplikasi penting bagi siswa dalam mengerjakan tugas-tugas. Maka dari itu, kami mengembangkan sebuah aplikasi video editing yang gratis, memiliki fitur editing sederhana, mudah digunakan, dan langsung terintegrasi dengan AI.

**Struktur**
MonoClip berjalan secara lokal dan dibangun menggunakan:
- **Frontend:** Tauri 2, React 19, TypeScript
- **Desktop System:** Rust & integrasi FFmpeg (untuk proses trim, resize, dan merge video)
- **AI / Backend:** Python (FastAPI) dengan Whisper untuk transkripsi dan pemfilteran kata kasar (*badwords*).