# Integrations Setup Guide

## Telegram Bot

### 1. BotFather'da yeni bot oluştur

1. Telegram'da [@BotFather](https://t.me/BotFather)'a git
2. `/newbot` gönder
3. Bot ismi sor → örn: `Personalife Bot`
4. Bot kullanıcı adı sor → benzersiz olmalı → örn: `personalife_myname_bot`
5. BotFather sana bir **token** verecek: `123456789:ABCDefgh...`

### 2. .env dosyasına ekle

```env
TELEGRAM_BOT_TOKEN=123456789:ABCDefgh...
TELEGRAM_BOT_USERNAME=personalife_myname_bot
```

### 3. Servisleri yeniden başlat

```bash
docker compose restart worker
```

### 4. App'te bağla

Settings → Telegram bağla → deep link butonuna bas → Telegram'da START bas → otomatik algılanır.

---

## Google Calendar

### 1. Google Cloud Console'da proje oluştur

1. [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. Proje adı: `Personalife`

### 2. Google Calendar API'sini aktifleştir

1. Sol menü → **APIs & Services** → **Library**
2. "Google Calendar API" ara → **Enable**

### 3. OAuth consent screen ayarla

1. **APIs & Services** → **OAuth consent screen**
2. User Type: **External** → **Create**
3. Doldur:
   - App name: `Personalife`
   - User support email: senin emailin
   - Developer contact: senin emailin
4. **Scopes** adımında: **Add or remove scopes** → `calendar.readonly` + `userinfo.email` ekle
5. **Test users** adımında: kendi Google hesabını ekle
6. **Save and continue**

### 4. OAuth 2.0 Client ID oluştur

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Personalife Local`
4. Authorized redirect URIs → **+ Add URI**:
   - `http://localhost:4000/api/v1/integrations/google/callback`
5. **Create** → Client ID ve Client Secret gösterilecek

### 5. .env dosyasına ekle

```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/integrations/google/callback
```

### 6. Servisleri yeniden başlat

```bash
docker compose restart backend worker
```

### 7. App'te bağla

Settings → Google Calendar bağla → Google hesabını seç → izin ver → otomatik sync başlar.

> **Not:** Google consent screen "unverified" uyarısı verebilir → "Advanced" → "Go to Personalife (unsafe)" → izin ver. Bu sadece development modunda olur. Prodüksiyon için app verification gerekir.

---

## iCal Export URL

Herhangi bir external setup gerektirmez — Settings sayfasında otomatik hazır.

**Kullanım:**
- **Apple Calendar:** File → New Calendar Subscription → URL'yi yapıştır
- **Google Calendar:** Diğer takvimler → URL'den ekle → URL'yi yapıştır
- **Outlook:** Takvim ekle → İnternet'ten → URL'yi yapıştır

URL değiştirilmek istenirse Settings'te "Yenile" butonu mevcut.

---

## Production Deployment Notları

### HTTPS (production'da zorunlu)

Google OAuth ve bazı Telegram özellikleri HTTPS gerektirir.
- `GOOGLE_REDIRECT_URI=https://api.yourapp.com/api/v1/integrations/google/callback`
- `APP_PUBLIC_URL=https://yourapp.com`

### Telegram Webhook (production'da daha verimli)

Local dev'de long-polling kullanılır. Prodüksiyonda webhook daha verimlidir:

```bash
# Webhook ayarla (HTTPS URL ile)
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://api.yourapp.com/api/v1/webhooks/telegram"
```

Worker'ı `TELEGRAM_POLLING=false` env ile kapatıp `/api/v1/webhooks/telegram` endpoint'ini aktifleştir.
