# RJ Dreamstime Auto-Metadata Extension

## Deskripsi

Ekstensi Chrome ini membantu mengotomatiskan proses pengisian metadata (judul, deskripsi, kata kunci) untuk unggahan gambar di Dreamstime menggunakan AI generatif (Google Gemini).

## Fitur

*   Mengambil URL gambar dari halaman unggah Dreamstime.
*   Mengirim URL gambar ke Google Gemini API untuk analisis.
*   Menerima judul, deskripsi, dan kata kunci yang dihasilkan AI.
*   Mengisi kolom metadata secara otomatis di halaman unggah Dreamstime.
*   Mendukung penggunaan beberapa API Key Google Gemini (rotasi otomatis).
*   Antarmuka popup untuk memuat file API key dan memulai proses.

## Instalasi

1.  Unduh versi terbaru dari halaman **Releases** di repository GitHub ini (cari file `.zip`).
2.  Unzip file yang telah diunduh.
3.  Buka Google Chrome, ketik `chrome://extensions/` di address bar, dan tekan Enter.
4.  Aktifkan **"Developer mode"** (biasanya ada tombol toggle di pojok kanan atas).
5.  Klik tombol **"Load unpacked"**.
6.  Arahkan ke folder hasil unzip tadi dan pilih folder tersebut.
7.  Ekstensi sekarang terinstal.

## Penggunaan

1.  Siapkan file teks (`.txt`) yang berisi satu atau lebih Google Gemini API Key Anda (satu key per baris).
2.  Buka halaman unggah gambar di Dreamstime.
3.  Klik ikon ekstensi RJ Dreamstime Auto-Metadata di toolbar Chrome.
4.  Klik tombol "Load API Key File" dan pilih file `.txt` yang berisi API key Anda.
5.  Pilih model AI yang ingin digunakan (jika ada pilihan).
6.  Klik tombol "Start Analysis".
7.  Ekstensi akan mengambil gambar, mengirimkannya ke API, dan mengisi kolom metadata secara otomatis.

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

## Kontribusi / Laporan Bug

(Tambahkan bagian ini jika Anda terbuka untuk kontribusi atau ingin memberikan cara melaporkan bug)
