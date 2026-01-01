# MFT EUROPA Kargo Takip Sistemi

Bu proje, MFT EUROPA müşterilerinin kargo durumlarını sorgulayabilmesi için geliştirilmiş bir Next.js web uygulamasıdır.

## Özellikler

- **Müşteri Paneli:** Müşteri kodu ve telefon numarası ile kargo sorgulama.
- **Admin Paneli:** Kargo, manifesto, müşteri ve finans yönetimi.
- **Güvenli Giriş:** Admin paneli için şifreli giriş sistemi.
- **Mobil Uyumlu:** Telefon ve tabletlerde sorunsuz çalışır.

## Kurulum (Hosting / Sunucu)

1. Bu repoyu sunucunuza klonlayın.
2. `npm install` komutu ile gerekli paketleri yükleyin.
3. `.env` dosyanızı oluşturun (Veritabanı ve güvenlik anahtarları için).
4. `npm run build` ile projeyi derleyin.
5. `npm start` veya `server.js` dosyası ile uygulamayı başlatın.

## Geliştirici Notları

- **Framework:** Next.js 16 (App Router)
- **Veritabanı:** SQLite (Prisma ORM)
- **Stil:** Tailwind CSS
- **Dil:** TypeScript
