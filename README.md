# ExamBrowser EDU Kasuari

Aplikasi browser ujian aman mirip ExamBrowser PUSMENDIK untuk Platform CBT EDU Timur Kasuari.

---

## Fitur

- 🎬 Splash screen animasi dengan logo EDU Kasuari
- 🖥️ System check: OS, CPU, RAM, Resolusi, Internet, Versi
- 🔒 Kiosk mode fullscreen — tidak bisa minimize/close
- 📸 Screenshot & screen recording diblokir
- 🚫 DevTools diblokir (F12, Ctrl+Shift+I)
- 🌐 Hanya bisa akses edu.timurkasuari.com
- ⚙️ Settings berpassword (URL + password bisa diubah)
- 🚪 Keluar hanya dengan Ctrl+Shift+Q + password

---

## Cara Build (via Claude Code)

```bash
# 1. Masuk ke folder project
cd exambroEDUKasuari

# 2. Init git & push ke GitHub
git init
git add .
git commit -m "feat: ExamBrowser EDU Kasuari v1.0"
git remote add origin https://github.com/USERNAME/exambroEDUKasuari.git
git branch -M main
git push -u origin main
```

GitHub Actions akan otomatis build:
- **Windows**: file `.exe` installer
- **Linux**: file `.AppImage`

Download dari tab **Actions → Artifacts**

---

## Password Default

| Setting | Default |
|---------|---------|
| Password admin | `edukasuari2025` |
| Kombinasi keluar | `Ctrl+Shift+Q` |
| URL ujian | `https://edu.timurkasuari.com/cbt/` |

**Ganti password setelah pertama install!**

---

## Cara Ganti Pengaturan

1. Di halaman System Check, klik **⚙️ Pengaturan**
2. Masukkan password admin
3. Ubah URL dan/atau password
4. Klik **Simpan**
