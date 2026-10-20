plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "me.erkanicil.familyos.tv"
    compileSdk = 34

    defaultConfig {
        applicationId = "me.erkanicil.familyos.tv"
        minSdk = 28 // Android TV 9
        targetSdk = 34
        versionCode = 1
        versionName = "0.1-test"
        buildConfigField("String", "HOME_URL", "\"https://pano.erkanicil.me/\"")
    }

    buildFeatures { buildConfig = true }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Test için debug imzası; gerçek dağıtımda kendi anahtarını kullan.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

// Bilinçli olarak AndroidX/AppCompat yok: APK küçük, açılış hızlı, RAM düşük.
dependencies {}
