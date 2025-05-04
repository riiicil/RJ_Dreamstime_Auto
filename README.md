# RJ Dreamstime Auto-Metadata Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Language: HTML5](https://img.shields.io/badge/Language-HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)
[![Language: CSS3](https://img.shields.io/badge/Language-CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)
<!-- [![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://example.com/build-status) --> <!-- Placeholder -->

**© Riiicil 2025**

## 1. Deskripsi

Ekstensi Chrome ini membantu mengotomatiskan proses pengisian metadata (judul, deskripsi, kata kunci) untuk unggahan gambar di Dreamstime menggunakan AI generatif (Google Gemini).

## 2. Fitur

*   Mengambil URL gambar dari halaman unggah Dreamstime.
*   Mengirim URL gambar ke Google Gemini API untuk analisis.
*   Menerima judul, deskripsi, dan kata kunci yang dihasilkan AI.
*   Mengisi kolom metadata secara otomatis di halaman unggah Dreamstime.
*   Mendukung penggunaan beberapa API Key Google Gemini (rotasi otomatis).
*   Antarmuka popup untuk memuat file API key dan memulai proses.

## 3. Instalasi

1.  Unduh versi terbaru dari halaman **Releases** di repository GitHub ini (cari file `.zip`).
2.  Unzip file yang telah diunduh.
3.  Buka Google Chrome, ketik `chrome://extensions/` di address bar, dan tekan Enter.
4.  Aktifkan **"Developer mode"** (biasanya ada tombol toggle di pojok kanan atas).
5.  Klik tombol **"Load unpacked"**.
6.  Arahkan ke folder hasil unzip tadi dan pilih folder tersebut.
7.  Ekstensi sekarang terinstal.

## 4. Penggunaan

1.  Siapkan file teks (`.txt`) yang berisi satu atau lebih Google Gemini API Key Anda (satu key per baris).
2.  Buka halaman unggah gambar di Dreamstime.
3.  Klik ikon ekstensi RJ Dreamstime Auto-Metadata di toolbar Chrome.
4.  Klik tombol "Load API Key File" dan pilih file `.txt` yang berisi API key Anda.
5.  Pilih model AI yang ingin digunakan (jika ada pilihan).
6.  Klik tombol "Start Analysis".
7.  Ekstensi akan mengambil gambar, mengirimkannya ke API, dan mengisi kolom metadata secara otomatis.

## 5. Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

## 6. Kontribusi

Saat ini proyek ini dikelola secara solo dan merupakan proyek pertama saya! Oleh karena itu, saya fokus pada pembelajaran dan pengembangan. Meskipun saat ini belum siap untuk menerima kontribusi formal, saya selalu terbuka untuk mendengar masukan atau saran.

## 7. Kontak & Dukungan

Anda dapat menemukan saya dan berdiskusi mengenai proyek ini (atau yang lain) di: https://s.id/rj_auto_metadata

## 8. Dukung Proyek Ini

Jika Anda merasa ekstensi ini bermanfaat dan ingin mendukung pengembangan selanjutnya, Anda bisa melakukannya melalui QR code di bawah ini. Terima kasih!

![Support QR Code](icons/qr.jpg)
