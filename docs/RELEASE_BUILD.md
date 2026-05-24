# Release Build — Sopwer HRMS Mobile

Guide untuk build signed release APK side-load v1.6.0+.

## State per v1.6.0

| Aspect | Value |
|--------|-------|
| versionName | `1.6.0` |
| versionCode | `49` |
| Package | `com.sopwer.hadir` |
| ProGuard | ENABLED (rules di `android/app/proguard-rules.pro`) |
| Resource shrinking | ENABLED (depend ProGuard) |
| ABI splits | armeabi-v7a + arm64-v8a (universal OFF) |
| Firebase project | `hadir-by-sopwer` |
| Analytics | Firebase Analytics (GA4 native) — auto-collected + custom events |

## Prerequisite

1. **Keystore release** — file `.keystore` atau `.jks` punya kamu (jangan commit ke repo).
2. **`android/keystore.properties`** (jangan commit — di-`.gitignore`):
   ```properties
   RELEASE_STORE_FILE=/absolute/path/sopwer-hadir-release.keystore
   RELEASE_STORE_PASSWORD=xxx
   RELEASE_KEY_ALIAS=sopwer-hadir
   RELEASE_KEY_PASSWORD=xxx
   ```
   Tanpa file ini, gradle fallback ke `debug.keystore` (APK install tapi TIDAK update-able dengan keystore lain di kemudian hari).

3. **`android/app/google-services.json`** — sudah ada (Firebase project `hadir-by-sopwer`). Wajib untuk FCM + Analytics. Tanpa file → analytics no-op + push tidak jalan (graceful fallback).

## Build steps

```bash
cd /Users/ramdani/Documents/development/mobile-apps/sopwer_hrms_mobile

# 1. Clean prev build
cd android && ./gradlew clean && cd ..

# 2. (Optional) bundle JS dulu untuk catch JS error sebelum native build
npx react-native bundle --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res

# 3. Release build per-ABI (output 2 APK)
cd android
./gradlew assembleRelease

# 4. Cek output
ls -la app/build/outputs/apk/release/
# Expected:
#   app-arm64-v8a-release.apk    (~15-20 MB, untuk HP 64-bit modern)
#   app-armeabi-v7a-release.apk  (~12-15 MB, untuk HP 32-bit lama)
#   output-metadata.json
```

## Distribusi side-load

**Rekomendasi**: kasih ke device target `app-arm64-v8a-release.apk` (mayoritas HP Android sejak 2017). Fallback `armeabi-v7a` untuk device lama.

```bash
# Install via adb (development)
adb install -r app/build/outputs/apk/release/app-arm64-v8a-release.apk

# Distribusi: upload ke Google Drive / WhatsApp / dll
```

User flow install:
1. Download APK.
2. Settings → Security → Allow install from unknown sources (per app).
3. Tap APK → install → buka.

## Verify analytics di Firebase Console

Real-time DebugView (events muncul dalam <1 menit):

```bash
# Enable debug mode di device target (pakai adb)
adb shell setprop debug.firebase.analytics.app com.sopwer.hadir

# Reset:
adb shell setprop debug.firebase.analytics.app .none.
```

Buka Firebase Console → Analytics → DebugView → harus muncul device + events real-time.

**Production view (Analytics → Events)** delay 24-48 jam.

### Event taxonomy v1.6.0

| Event | Trigger | Params |
|-------|---------|--------|
| `screen_view` | Setiap navigasi route change (auto) | `screen_name`, `screen_class` |
| `login_success` | Login berhasil | `employee_id` |
| `login_failure` | Login gagal | `error_code` (unauthorized/not_found/network/etc) |
| `clock_in` | Clock-in submit success | `gps_accuracy_meters`, `override_out_of_geofence` (0/1) |
| `clock_out` | Clock-out submit success | sama dengan clock_in |
| `leave_request_submitted` | Submit form cuti success | `leave_type` |
| `approval_action` | Atasan approve/reject permohonan | `action` (approve/reject), `doc_type` |

User ID di-set otomatis ke Employee name (`HR-EMP-XXXXX`) saat login, di-clear saat logout.

## Smoke test checklist

Setelah install APK di device:
- [ ] App buka tanpa crash (kalau crash → cek logcat `adb logcat *:E | grep -i "fatal\|sopwer"` — kandidat ProGuard issue)
- [ ] Login → cek event `login_success` di Firebase DebugView
- [ ] Clock-in → cek event `clock_in` + GPS accuracy benar
- [ ] Submit cuti → cek event `leave_request_submitted`
- [ ] (Atasan) Approve permohonan → cek event `approval_action`
- [ ] Navigate antar screen → cek event `screen_view` (auto)

## Troubleshooting

### Release build crash NoClassDefFoundError
ProGuard strip class yang dipakai runtime. Tambah `-keep class <package>.** { *; }` di `android/app/proguard-rules.pro` untuk library tersebut, build ulang.

### react-native-view-shot stempel hilang setelah ProGuard
Rules sudah include `-keep class fr.greweb.reactnativeviewshot.** { *; }`. Kalau masih bermasalah, cek logcat untuk class hilang spesifik.

### APK size masih besar
- Cek `app/build/outputs/apk/release/output-metadata.json` ukuran per-ABI.
- Kalau >25 MB per ABI: image asset audit (`du -sh android/app/src/main/res/drawable*/`).
- Optional: enable Hermes saja (`hermesEnabled=true` di `android/gradle.properties` — biasanya sudah default RN 0.80).

### Analytics tidak muncul di DebugView
- Pastikan `adb shell setprop debug.firebase.analytics.app com.sopwer.hadir` dijalankan.
- Restart app setelah set property.
- Cek `google-services.json` di `android/app/` (project_id = `hadir-by-sopwer`).
- Force log test event di JS console: `analytics.logEvent('test_debug', {})`.

## Release tagging

Setelah QA OK + APK distribusi:
```bash
git tag v1.6.0
git push origin v1.6.0
```
