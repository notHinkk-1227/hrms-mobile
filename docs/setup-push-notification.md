# Setup Push Notification (FCM) — Sopwer Apps

Push notification pakai pola **direct FCM via firebase-admin** lewat shared
Frappe app `sopwer_push`. Tidak butuh relay server tambahan, tidak tergantung
Frappe Cloud.

```
Mobile (Hadir / Sales / POS / Owner)
  ↓ register_token via /api/method/sopwer_push.api.register_token
Frappe site (mis. hrms.sopwer.my.id)
  ↓ firebase-admin Python SDK
FCM HTTP v1 API
  ↓
Device system tray
```

**FCM gratis 100%** — no per-message charge, hard limit 600k msg/min/project.
1× setup Firebase + 1× install `sopwer_push` di site Frappe. Semua app Sopwer
(Hadir, Sales, POS, Owner) share infra ini dengan `app_id` berbeda.

---

## Step 1 — Firebase Project (1× untuk semua app)

1. Login [Firebase Console](https://console.firebase.google.com).
2. **Add project**: nama bebas, mis. `Sopwer Apps`. Disable Google Analytics (opsional).
3. Untuk **tiap app Android**, register entry terpisah:
   - **Add app** → Android
   - **Package name**: HARUS PERSIS match `applicationId` di build.gradle:
     - Hadir: `com.sopwer.hadir`
     - Sales: `com.sopwer.sales` (future)
     - POS: `com.sopwer.pos` (future)
   - App nickname: e.g., `Hadir by Sopwer Android`
   - SHA-1: skip untuk sekarang (tidak butuh untuk FCM)
4. **Download `google-services.json`** untuk tiap app → simpan di repo masing-masing:
   - `mobile-apps/sopwer_hrms_mobile/android/app/google-services.json`
   - `mobile-apps/sopwer-sales-mobile/android/app/google-services.json` (future)
5. **Service account** (1× untuk seluruh project):
   - Project Settings → Service Accounts → "Firebase Admin SDK"
   - Klik **"Generate new private key"** → download JSON
   - Rename ke `firebase-service-account.json`. **JAGA RAHASIA** — jangan commit.
6. **Enable Firebase Cloud Messaging API (V1)** di [Cloud Console](https://console.cloud.google.com/apis/library/fcm.googleapis.com) — pilih project Sopwer Apps → Enable.

---

## Step 2 — Install `sopwer_push` di site Frappe

Pre-req: bench env punya Python deps. Install firebase-admin:

```bash
cd /path/to/frappe-bench
./env/bin/pip install 'firebase-admin>=6.5.0,<7.0.0'
```

> **Note**: pakai versi 6.x (bukan 7.x) supaya kompatibel dengan `pyjwt~=2.8.0`
> yang dipakai Frappe. firebase-admin 7.x butuh pyjwt >= 2.10.

Install app ke site:

```bash
# Kalau belum ada repo di apps/, clone dulu:
cd /path/to/frappe-bench/apps
git clone https://github.com/xhijack/sopwer_push  # atau path internal Sopwer

# Install ke site target:
cd /path/to/frappe-bench
bench --site hrms.sopwer.my.id install-app sopwer_push
bench --site hrms.sopwer.my.id migrate
bench restart
```

---

## Step 3 — Configure Firebase Credentials di Frappe

Buka Frappe web: `https://hrms.sopwer.my.id/app/sopwer-push-settings` →

1. Toggle **"Enable Push Notification"** ke ON
2. Paste seluruh isi `firebase-service-account.json` ke field **Service Account JSON**
3. Save

Saat save:
- Frappe validate JSON + extract `project_id` auto-fill
- `reset_firebase_app()` dipanggil supaya next call re-init dengan credential baru
- `last_init_at` updated

Verify via bench console:
```bash
bench --site hrms.sopwer.my.id console
```
```python
from sopwer_push.utils.fcm import is_enabled, send_to_user
print(is_enabled())  # harus True
# Send test setelah FCM token register dari mobile:
# send_to_user("andi.hr@sopwer.my.id", "Test", "Halo!", app_id="hadir-by-sopwer")
```

---

## Step 4 — Build APK Mobile

Setelah `google-services.json` ada di `android/app/`, install deps + build:

```bash
cd /Users/ramdani/Documents/development/mobile-apps/sopwer_hrms_mobile
yarn install  # install @react-native-firebase/app + messaging

# Bundle JS untuk debug (sesuai pattern existing project)
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# Build debug APK
cd android && ./gradlew clean assembleDebug && cd ..

# Install ke POCO
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Conditional plugin di `android/app/build.gradle` aktif otomatis kalau
`google-services.json` ada di folder. Tanpa file itu, plugin skip (build tetap
jalan untuk dev).

---

## Step 5 — E2E Verification

1. **Force-stop app** di POCO (swipe away dari recents).
2. **Test broadcast (announcement)**:
   - Frappe web → `/app/sopwer-announcement/new` → isi subject + body → toggle Published → Save
   - Tunggu 5-10 detik → POCO system tray ping notif "Pengumuman: ..."
   - Tap notif → app buka langsung ke InboxDetail
3. **Test user-targeted (Task)**:
   - Frappe web → buat ToDo dengan `allocated_to=andi.hr@sopwer.my.id`
   - POCO terima notif "Tugas baru untuk Anda"
   - Tap → buka Task tab
4. **Test request status (Cuti)**:
   - Login `joko.sales1@` di mobile, ajukan cuti
   - Login `citra.sales@` di Frappe web, approve cuti Joko
   - App Joko tertutup → notif "Cuti Disetujui"
5. **Test foreground**:
   - App terbuka di Beranda → buat announcement di Frappe web
   - Toast muncul + badge Mail naik (via socket.io existing)
   - FCM tetap kirim, tapi RN Firebase default tidak duplicate ke system tray foreground

---

## Reuse di App Sopwer lain (Sales, POS, Owner)

Pola sama, tinggal:

1. Register Android app baru di Firebase project `Sopwer Apps` (package_name unique)
2. Download `google-services.json` baru → simpan di repo mobile app tersebut
3. Mobile app pakai `pushService` mirip dengan `APP_ID = "sales-by-sopwer"` (atau apa pun)
4. Di Frappe app backend (mis. `sopwer_sales`):
   ```python
   from sopwer_push.utils.fcm import send_to_user
   send_to_user(user, title, body, app_id="sales-by-sopwer")
   ```
5. `sopwer_push` cuma 1× install di tiap site Frappe yang butuh push. Service account JSON config 1× per site.

---

## Troubleshooting

- **Notif tidak masuk**: cek `Sopwer Push Settings.enabled=1` + `project_id` terisi. Cek `frappe.log_error` titles `sopwer_push.firebase_init_failed` / `sopwer_push.send_to_user_exception`.
- **POCO/Xiaomi battery saver**: settings → Apps → Hadir → Battery saver = "No restrictions" + Autostart = ON. Tanpa ini Xiaomi suka kill push.
- **Token rotate**: mobile auto re-register via `onTokenRefresh` listener. Lihat MMKV key `push.fcm_token`.
- **Multi-tenant bocor**: topic name include site, format `hadir_by_sopwer_all_<site_underscore>`. Tenant A tidak akan terima broadcast tenant B.
- **FCM rate limit**: 240 msg/menit per device, 600k msg/menit per project. Lebih besar dari kebutuhan, tidak akan kena.
- **Invalid token cleanup**: kalau FCM return UNREGISTERED, `sopwer_push.utils.fcm._disable_token` otomatis mark `disabled=1` di Sopwer FCM Token. Token mati tidak akan kirim lagi.
- **pyjwt conflict**: kalau install `firebase-admin>=7.0.0`, akan minta pyjwt>=2.10.1 yang ngk kompatibel dengan Frappe (`~=2.8.0`). Pin `firebase-admin>=6.5.0,<7.0.0`.

---

## Out of scope (defer)

- iOS APNs (defer Android-first)
- Rich notification (image, action buttons)
- Notification preferences per user (mute jenis tertentu)
- Quiet hours
- Per-user receipt tracking di server
