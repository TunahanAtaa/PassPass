# PassPass — Frontend

PassPass Password Manager uygulamasının React + TypeScript + Vite tabanlı istemcisidir.

## Mimarisi

```text
frontend/
├── src/
│   ├── assets/       # Statik görseller ve grafikler
│   ├── components/   # Yeniden kullanılabilir UI bileşenleri (HealthStatus vb.)
│   ├── hooks/        # Custom React hook'ları (useHealthCheck.ts)
│   ├── layouts/      # Sayfa şablonları ve layout bileşenleri (AppLayout.tsx)
│   ├── lib/          # Merkezi HTTP API istemcisi (api-client.ts)
│   ├── pages/        # Sayfa görünümleri (HomePage.tsx)
│   ├── services/     # Backend API servis çağrıları (health.service.ts)
│   ├── types/        # TypeScript arayüz ve tip tanımları (api.ts)
│   ├── utils/        # Formatlayıcılar ve yardımcı fonksiyonlar (formatters.ts)
│   ├── App.tsx       # Ana React bileşeni
│   ├── index.css     # Dark mode & cam efektli modern tasarım sistemi
│   └── main.tsx      # React DOM başlatıcı
├── .env.example      # Frontend ortam değişkenleri şablonu
├── package.json      # NPM paket bağımlılıkları
├── tsconfig.json     # TypeScript yapılandırması
└── vite.config.ts    # Vite yapılandırması
```

## Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Ortam değişkenlerini kopyalayın
cp .env.example .env

# Geliştirme sunucusunu başlatın
npm run dev

# Üretim derlemesi (Production Build) & Tip Kontrolü
npm run build
```
