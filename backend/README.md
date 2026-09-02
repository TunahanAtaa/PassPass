# PassPass — Backend

PassPass Password Manager uygulamasının FastAPI tabanlı backend servisidir.

## Mimarisi

Katmanlı mimari yapısı:

```text
backend/
├── app/
│   ├── api/             # API Router ve route endpoint tanımları
│   │   ├── routes/      # Her feature/domain için router modülleri (örn: health.py)
│   │   └── router.py    # Ana API router toplayıcı
│   ├── core/            # Temel konfigürasyon, ayarlar (Pydantic BaseSettings)
│   ├── db/              # SQLAlchemy engine, DeclarativeBase ve session yönetimi
│   ├── models/          # SQLAlchemy ORM modelleri (Base metadata)
│   ├── schemas/         # Pydantic request/response veri doğrulama şemaları
│   ├── services/        # İş mantığı (Business logic) katmanı
│   ├── repositories/    # Veri erişim katmanı (Data access layer)
│   └── main.py          # FastAPI application factory ve CORS yapılandırması
├── alembic/             # Alembic veritabanı migration yapılandırması
├── tests/               # Pytest birim ve entegrasyon testleri
├── .env.example         # Örnek ortam değişkenleri
├── alembic.ini          # Alembic konfigürasyon dosyası
└── requirements.txt     # Python bağımlılıkları
```

## Kurulum ve Çalıştırma

### 1. Sanal Ortam Oluşturma & Bağımlılıkları Yükleme

```bash
# Backend dizininde:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Ortam Değişkenleri (.env)

`.env.example` dosyasını `.env` olarak kopyalayın:

```bash
cp .env.example .env
```

### 3. PostgreSQL Veritabanı

Kök dizinde Docker Compose ile PostgreSQL'i başlatın:

```bash
# Kök dizinde:
docker compose up -d
```

### 4. Alembic Migration Komutları

```bash
# Mevcut revizyon durumunu kontrol etme:
alembic current

# Yeni model eklendiğinde otomatik migration üretme:
alembic revision --autogenerate -m "create user table"

# Migration'ları veritabanına uygulama:
alembic upgrade head
```

### 5. Backend Sunucusunu Başlatma

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. API Dokümantasyonu & Health Check

- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)


### 7. Testleri Çalıştırma

```bash
pytest
```
