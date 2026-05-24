# Sopwer HRMS Mobile — ProGuard rules (v1.6.0+).
# Aktif via android/app/build.gradle `enableProguardInReleaseBuilds = true`.
#
# Default RN + Hermes + Firebase + native libs preserve list. Tambah `-keep`
# baru per library kalau release build crash NoClassDefFoundError.

# ---- React Native core ----
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.proguard.annotations.KeepGettersAndSetters class * { *; }
-keepclassmembers,allowobfuscation class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ---- Firebase (Analytics + Messaging + App) ----
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ---- react-native-firebase ----
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# ---- react-native-view-shot (fragile autolink per memory S956/S957) ----
-keep class fr.greweb.reactnativeviewshot.** { *; }
-dontwarn fr.greweb.reactnativeviewshot.**

# ---- react-native-mmkv (storage) ----
-keep class com.tencent.mmkv.** { *; }
-keep class com.mrousavy.camera.** { *; }
-dontwarn com.tencent.mmkv.**

# ---- react-native-vision-camera ----
-keep class com.mrousavy.** { *; }
-dontwarn com.mrousavy.**

# ---- react-native-reanimated ----
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-dontwarn com.swmansion.reanimated.**

# ---- react-native-screens + gesture-handler ----
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# ---- react-native-svg ----
-keep public class com.horcrux.svg.** { *; }

# ---- react-native-geolocation-service ----
-keep class com.agontuk.RNFusedLocation.** { *; }

# ---- react-native-device-info ----
-keep class com.learnium.RNDeviceInfo.** { *; }

# ---- react-native-biometrics ----
-keep class com.rnbiometrics.** { *; }

# ---- react-native-webview ----
-keep class com.reactnativecommunity.webview.** { *; }

# ---- react-native-nitro-modules ----
-keep class com.margelo.nitro.** { *; }

# ---- Sopwer app (kalau ada native package custom, preserve di sini) ----
-keep class com.sopwer.hadir.** { *; }

# ---- JSC fallback (kalau Hermes disabled) ----
-keep class org.webkit.** { *; }

# ---- okhttp / OkHttp3 (axios native transport on Android) ----
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ---- Annotations (preserve untuk runtime reflection) ----
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable  # untuk crash stack trace readable
