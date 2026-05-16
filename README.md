# Sopwer HRMS Mobile

Aplikasi React Native untuk karyawan klien Sopwer — replikasi scope Frappe HR Mobile dengan tambahan GPS verification berlapis (Phase 2 backend) dan tenant routing via `sopwer_controller`.

**Status:** MVP Phase 1-5 — pakai Frappe HR REST bawaan, belum integrasi `sopwer_hrms` backend custom.

## Stack
- React Native 0.80 (CLI, **bukan Expo**)
- TypeScript strict mode
- Zustand (state) + MMKV (storage, encrypted)
- axios + react-navigation v6
- react-hook-form + zod (forms)
- date-fns, lucide-react-native
- react-native-geolocation-service (GPS)
- @react-native-community/datetimepicker + @react-native-documents/picker (forms)
- react-native-reanimated 3.19 (LOCKED — 4.x butuh RN 0.81+)

## Folder Structure (clean architecture)
```
src/
├── app/                 # navigation root (AuthStack, MainStack, MainTabs, HomeStack)
├── config/              # env override (controllerUrl)
├── domain/              # entities + ports + usecases — pure TS, no RN
├── infrastructure/      # api/ + location/ + storage/ + device/ — RN deps OK
├── features/            # 13 feature modules: auth, home, checkin, leave, expense,
│                        # advance, attendance-request, shift-request, my-requests,
│                        # team-requests, salary-slip, attendance, profile, forms
└── shared/              # components/ + theme/ + utils/ — stateless, reusable
```

## Development

### Prerequisites
- Node.js >= 18
- Yarn 1.22+
- JDK 17 (Zulu / Temurin)
- Android Studio + SDK Platform 35 + NDK 27.1.12297006
- ANDROID_HOME env

### First-time setup
```bash
yarn install
```

### Run on emulator/device (debug)
```bash
# Terminal 1 — Metro bundler
yarn start

# Terminal 2 — install + run
yarn android
# Restart app setelah di-install:
adb reverse tcp:8081 tcp:8081
adb shell am force-stop com.sopwer_hrms_mobile && adb shell am start -n com.sopwer_hrms_mobile/.MainActivity
```

### Type-check + lint
```bash
yarn tsc --noEmit
yarn lint
```

### Build release APK (signed)
Prerequisite: `android/keystore.properties` ada (lokal, gitignored).

```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk (~74MB)
# Copy ke: release/sopwer-hrms-mobile-vX.Y.Z.apk
```

Build pertama: 12-15 menit (gradle download + native compile).
Build incremental setelah perubahan TS only: ~1-3 menit.
Build setelah perubahan native deps (yarn add native module): 5-10 menit.

### Release signing
- Keystore: `android/app/sopwer-hrms-release.keystore` (gitignored — JANGAN commit)
- Config: `android/keystore.properties` (gitignored)
- Backup keystore + password ke password manager / encrypted vault — **tidak bisa di-recover kalau hilang**.

Generate keystore baru (kalau lost):
```bash
keytool -genkeypair -alias sopwer-hrms -keyalg RSA -keysize 2048 -validity 10000 \
  -keystore android/app/sopwer-hrms-release.keystore \
  -dname "CN=Sopwer HRMS, OU=Mobile, O=PT Sopwer Teknologi Indonesia, L=Jakarta, ST=DKI Jakarta, C=ID"
```

Tulis `android/keystore.properties`:
```
RELEASE_STORE_FILE=sopwer-hrms-release.keystore
RELEASE_KEY_ALIAS=sopwer-hrms
RELEASE_STORE_PASSWORD=<password>
RELEASE_KEY_PASSWORD=<password>
```

## Endpoint Backend

### Tenant resolution (controller)
- `https://cloud.sopwer.net/api/method/sopwer_controller.api.resolve_tenant_code`
- Override via `src/config/env.ts` `setControllerUrl()` kalau perlu test ke server lain.

### Tenant API (per-klien Frappe instance)
Semua endpoint di MVP saat ini pakai Frappe HR bawaan:
- `/api/method/login` (session-cookie auth)
- `/api/method/logout`
- `/api/resource/Employee?filters=[["user_id","=",user]]`
- `/api/resource/Employee Checkin` POST {employee, log_type, time, latitude, longitude, device_id}
- `/api/resource/Leave Application`, `Expense Claim`, `Employee Advance`, `Attendance Request`, `Shift Request`
- `/api/resource/Salary Slip`, `Attendance`, `Shift Assignment`, `Shift Location`, `Shift Type`, `Leave Type`, `Mode of Payment`, `Expense Claim Type`
- `/api/method/hrms.hr.doctype.leave_application.leave_application.get_leave_details` (leave balance)
- `/api/method/upload_file` (multipart)

## Build pipeline gotchas

### NDK 27 + clang LTO crash
NDK 27 hapus `gold` linker, tapi CMake masih emit `-fuse-ld=gold` di IPO/LTO check.
**Fix di `android/app/build.gradle`:** `arguments "-DCMAKE_INTERPROCEDURAL_OPTIMIZATION=OFF"` di externalNativeBuild.

### Codegen JNI dir missing setelah install native module baru
RN 0.80 autolinking generate codegen artifacts per-variant. Setelah `yarn add` native module, sebelum `assembleRelease` jalankan dulu:
```bash
cd android
./gradlew :<module-name>:assembleRelease
```
Atau `./gradlew generateCodegenArtifactsFromSchema`.

### ABI filter — APK universal 74MB
`android/app/build.gradle` filter `arm64-v8a + armeabi-v7a` (semua HP Android sejak 2017). x86/x86_64 hanya untuk emulator.
- Untuk emulator x86, hapus filter temporary saat dev.
- Untuk APK final per-ABI: tambah `splits.abi` block (Phase 6 work).

### Reanimated 4.x vs RN 0.80
Reanimated 4.x butuh RN 0.81+. Pinned di 3.19.5 untuk kompat RN 0.80. Saat upgrade RN ke 0.81+, bisa upgrade reanimated ke 4.x.

## Plan & PRD
- Master plan: `~/.claude/plans/jadi-gini-kita-akan-curious-elephant.md`
- PRD: `/development/hrms/PRD.md`
- Design tokens: `/development/hrms/DESIGN_BRIEF.md`
- Coding rules: `/development/hrms/CLAUDE.md`
