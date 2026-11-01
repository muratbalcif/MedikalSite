# ANAMUR ACİL MEDİKAL — Android Uygulaması

Anamur Acil Medikal Android uygulaması; NestJS API’yi (`/api/v1`) kullanır.

## Stack

- Kotlin, Jetpack Compose, Material 3
- MVVM + Clean Architecture (domain / data; UI features live under `app`)
- Hilt, Retrofit, OkHttp, Moshi
- Coroutines + Flow
- Encrypted token storage (Android Keystore)
- Coil, DataStore, FCM foundation

## Package

`com.furkansogutma.app`

## Requirements

- Android Studio Ladybug+ (or compatible)
- JDK **17**
- Android SDK **35**
- Gradle **8.12.1** (wrapper included)

## Module map

```text
mobile/
└── app/                 # Single Gradle module
    └── src/main/java/com/furkansogutma/app/
        ├── core/          # common, designsystem, network, navigation, datastore, notification
        ├── feature/       # vertical slices: presentation / domain / data
        │   ├── auth/, home/, product/, category/, search/, cart/
        │   ├── checkout/, order/, account/, favorite/, notification/
        │   ├── campaign/, banktransfer/, splash/
        ├── di/            # AppModule, NetworkModule, DataModule, DatabaseModule
        ├── FurkanSogutmaApp.kt
        └── MainActivity.kt
```

## Environment / API URL

Flavors: `dev`, `staging`, `production`

`BuildConfig.API_BASE_URL` is set per flavor. Override via `api-urls.properties`
(copy from `api-urls.properties.example`) or `local.properties`:

```properties
API_BASE_URL_DEV=http://10.0.2.2:3000/api/v1
API_BASE_URL_STAGING=https://staging-api.furkansogutma.net/api/v1
API_BASE_URL_PRODUCTION=https://api.furkansogutma.net/api/v1
```

Defaults:

| Flavor | Default API base |
|--------|------------------|
| dev | `http://10.0.2.2:3000/api/v1` (emulator → host) |
| staging | `https://staging-api.furkansogutma.net/api/v1` |
| production | `https://api.furkansogutma.net/api/v1` |

Do **not** commit secrets or `google-services.json`.

## Run

```bash
cd mobile
./gradlew :app:assembleDevDebug
./gradlew :app:installDevDebug
```

Physical device: use your machine LAN IP instead of `10.0.2.2`.

## Build types

- **debug** — network BODY logs (Authorization redacted)
- **release** — minify + shrinkResources + R8, logging OFF, not debuggable

## Play Store release

See [docs/android-play-release.md](../docs/android-play-release.md).

Quick path (after `keystore.properties` + upload keystore):

```bash
bash scripts/android-release-aab.sh
# → mobile/app/build/outputs/bundle/productionRelease/app-production-release.aab
```

Production API default: `https://api.furkansogutma.net/api/v1`  
Package: `com.furkansogutma.app` · version `1.0.0` (`versionCode` 1)

## Tests

```bash
./gradlew test
./gradlew lint
./gradlew :app:connectedDevDebugAndroidTest   # device/emulator required
```

## Auth

- Login/register/refresh/logout/me against `/api/v1/auth/*`
- Tokens in EncryptedSharedPreferences
- Concurrent 401 → single coordinated refresh (`TokenAuthenticator`)

## Deep links

- `furkansogutma://product/{slug}`
- `furkansogutma://category/{slug}`
- `furkansogutma://order/{id}`

HTTPS App Links can be added later on the same routes.

## FCM

`FurkanFirebaseMessagingService` registers device tokens via
`POST /api/v1/notifications/devices`. Add `google-services.json` and enable the
Google Services Gradle plugin before production push.

## Architecture notes

- Backend is the source of truth for price, stock, totals.
- No admin API usage from this app.
- Comment API is not available yet → honest empty state.
- Brand launcher uses adaptive vector placeholder until marketing assets are provided.
