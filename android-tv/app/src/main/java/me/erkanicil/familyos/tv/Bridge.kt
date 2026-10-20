package me.erkanicil.familyos.tv

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

/**
 * Sayfadan `window.FamilyOS.*` olarak erişilir.
 *
 *   FamilyOS.openApp("tivimate")   // takma ad
 *   FamilyOS.openApp("youtube")    // SmartTube / YouTube TV, hangisi kuruluysa
 *   FamilyOS.openApp("ar.tvplayer.tv")
 *   FamilyOS.isInstalled("youtube")
 *   JSON.parse(FamilyOS.listApps())  // [{pkg,label}] — uygulama kutuları için
 *   FamilyOS.nativeVersion()
 *
 * Köprü yalnızca izinli host'tan yüklenen sayfalara cevap verir.
 */
class Bridge(
    private val activity: MainActivity,
    private val isTrustedPage: () -> Boolean,
) {
    private val pm: PackageManager = activity.packageManager
    private val main = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun openApp(nameOrPkg: String): Boolean {
        if (!isTrustedPage()) return false
        val pkg = resolve(nameOrPkg) ?: return false
        val intent = launchIntent(pkg) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        main.post {
            activity.markAppLaunch(pkg)
            try {
                activity.startActivity(intent)
            } catch (e: Exception) {
                Log.w(TAG, "launch failed: $pkg", e)
            }
        }
        return true
    }

    @JavascriptInterface
    fun isInstalled(nameOrPkg: String): Boolean = isTrustedPage() && resolve(nameOrPkg) != null

    @JavascriptInterface
    fun listApps(): String {
        if (!isTrustedPage()) return "[]"
        val seen = HashSet<String>()
        val out = JSONArray()
        for (category in arrayOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
            val q = Intent(Intent.ACTION_MAIN).addCategory(category)
            for (ri in pm.queryIntentActivities(q, 0)) {
                val pkg = ri.activityInfo.packageName
                if (pkg == activity.packageName || !seen.add(pkg)) continue
                out.put(JSONObject().put("pkg", pkg).put("label", ri.loadLabel(pm).toString()))
            }
        }
        return out.toString()
    }

    @JavascriptInterface
    fun nativeVersion(): String = BuildConfig.VERSION_NAME

    private fun resolve(nameOrPkg: String): String? {
        val candidates = ALIASES[nameOrPkg.lowercase()] ?: listOf(nameOrPkg)
        return candidates.firstOrNull { launchIntent(it) != null }
    }

    private fun launchIntent(pkg: String): Intent? =
        pm.getLeanbackLaunchIntentForPackage(pkg) ?: pm.getLaunchIntentForPackage(pkg)

    companion object {
        private const val TAG = "FamilyOS"

        // Paket adlarını stick'te `adb shell pm list packages -3` ile doğrula.
        val ALIASES = mapOf(
            "tivimate" to listOf("ar.tvplayer.tv"),
            "youtube" to listOf(
                "org.smarttube.stable",              // SmartTube (stick'te kurulu olan)
                "com.teamsmart.videomanager.tv",     // SmartTube (stable)
                "com.liskovsoft.smarttubetv.beta",   // SmartTube (beta)
                "com.liskovsoft.smarttubetv",
                "com.google.android.youtube.tv",     // resmi YouTube TV
            ),
        )
    }
}
