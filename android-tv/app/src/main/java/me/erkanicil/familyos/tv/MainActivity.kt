package me.erkanicil.familyos.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout

class MainActivity : Activity() {

    private lateinit var root: FrameLayout
    private lateinit var webView: WebView

    private val createdAt = SystemClock.uptimeMillis()
    private var firstPaintLogged = false
    private var showingOffline = false
    private var launchedPkg: String? = null
    private var launchedAt = 0L

    // Kumandayla kapatma stick'i uyutur, uygulama arkada açık kalır: açılınca sayfaya
    // "familyos:wake" gönderilir (açılış Besmelesi yeniden oynar). Ekran kapanmadıysa (ör. TiviMate'ten
    // dönüş) gönderilmez.
    private var screenWasOff = false
    private var resumed = false
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                Intent.ACTION_SCREEN_OFF -> screenWasOff = true
                Intent.ACTION_SCREEN_ON -> if (resumed) notifyWake()
            }
        }
    }

    // JavaBridge thread'inden okunur; UI thread'de güncellenir.
    @Volatile private var currentHost: String? = null

    // Debug: yerel derlemeyi denemek için  am start ... --es url http://localhost:4173/
    private val homeUrl by lazy {
        (if (BuildConfig.DEBUG) intent?.getStringExtra("url") else null) ?: BuildConfig.HOME_URL
    }
    private val homeUri by lazy { Uri.parse(homeUrl) }
    private val trustedHosts by lazy { setOf(homeUri.host, OFFLINE_HOST) }

    private val netCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            runOnUiThread { if (showingOffline) loadHome() }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true) // chrome://inspect
        // Launcher ekrandayken stick uykuya geçmesin (ekran koruyucuyu sayfa kendisi gösterir).
        // TV kumandayla kapatılınca sistem yine normal kapanır; başka uygulamada bayrak geçerli değil.
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        setContentView(root)
        createWebView()
        loadHome()
        getSystemService(ConnectivityManager::class.java).registerDefaultNetworkCallback(netCallback)
        registerReceiver(screenReceiver, IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        })
    }

    private fun notifyWake() {
        if (!screenWasOff) return
        screenWasOff = false
        Log.i(TAG, "wake: screen on")
        dispatchToPage("familyos:wake")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView() {
        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            isFocusable = true
            isFocusableInTouchMode = true
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                textZoom = 100
                setSupportZoom(false)
                builtInZoomControls = false
                offscreenPreRaster = false
                allowFileAccess = false
                allowContentAccess = false
            }
            addJavascriptInterface(Bridge(this@MainActivity) { currentHost in trustedHosts }, "FamilyOS")
            webViewClient = Client()
        }
        root.addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        webView.requestFocus()
    }

    // Bağlantı hata vermeden asılı kalırsa (modem interneti kestiğinde) siyah ekran yerine yedek sayfa
    private val loadWatchdog = Runnable { if (!pageShown) showOffline() }
    private var pageShown = false

    private fun loadHome() {
        showingOffline = false
        pageShown = false
        webView.loadUrl(homeUrl)
        root.removeCallbacks(loadWatchdog)
        root.postDelayed(loadWatchdog, LOAD_TIMEOUT_MS)
    }

    private inner class Client : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            // Çevrimdışı sayfadaki "Tekrar dene"
            if (request.url.host == OFFLINE_HOST) {
                loadHome()
                return true
            }
            // familyOS içinde kal; dış linkleri yok say (kiosk).
            return request.url.host != homeUri.host
        }

        override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
            currentHost = Uri.parse(url).host
        }

        override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
            currentHost = Uri.parse(url).host
        }

        override fun onPageFinished(view: WebView, url: String) {
            if (!showingOffline) {
                pageShown = true
                root.removeCallbacks(loadWatchdog)
            }
            if (!firstPaintLogged && !showingOffline) {
                firstPaintLogged = true
                Log.i(TAG, "startup: pageFinished ${SystemClock.uptimeMillis() - createdAt} ms")
                reportFullyDrawn()
            }
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) {
                Log.w(TAG, "main frame error ${error.errorCode}: ${error.description}")
                showOffline()
            }
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            // Düşük RAM'de renderer öldürülebilir: uygulamayı çökertme, WebView'i yeniden kur.
            Log.w(TAG, "renderer gone (crash=${detail.didCrash()}), recreating")
            root.removeView(webView)
            webView.destroy()
            createWebView()
            loadHome()
            return true
        }
    }

    private fun showOffline() {
        root.removeCallbacks(loadWatchdog)
        showingOffline = true
        webView.loadDataWithBaseURL("https://$OFFLINE_HOST/", OFFLINE_HTML, "text/html", "utf-8", null)
    }

    fun markAppLaunch(pkg: String) {
        launchedPkg = pkg
        launchedAt = SystemClock.uptimeMillis()
        Log.i(TAG, "launch: $pkg")
    }

    // Geri tuşu launcher'ı asla kapatmaz.
    @Deprecated("Android 9 hedefli; OnBackInvokedCallback gerekmiyor")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else dispatchToPage("familyos:back")
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Odak WebView'den kaçarsa geri al (D-pad ilk basışta boşa gitmesin).
        if (event.action == KeyEvent.ACTION_DOWN && !webView.hasFocus()) webView.requestFocus()
        return super.dispatchKeyEvent(event)
    }

    // Home tuşu, launcher zaten öndeyken: yeniden yükleme yok, sayfaya haber ver.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Debug: launcher zaten açıkken --es url verildiyse o adresle yeniden kur
        if (BuildConfig.DEBUG && intent.hasExtra("url")) {
            setIntent(intent)
            recreate()
            return
        }
        if (intent.hasCategory(Intent.CATEGORY_HOME)) dispatchToPage("familyos:home")
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
        launchedPkg?.let {
            Log.i(TAG, "return: from $it after ${SystemClock.uptimeMillis() - launchedAt} ms, url=${webView.url}")
            launchedPkg = null
        }
        dispatchToPage("familyos:resume")
        resumed = true
        notifyWake()
    }

    override fun onPause() {
        resumed = false
        // TiviMate/YouTube oynarken sayfa CPU harcamasın.
        webView.onPause()
        webView.pauseTimers()
        super.onPause()
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        Log.i(TAG, "onTrimMemory level=$level")
    }

    override fun onDestroy() {
        runCatching { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(netCallback) }
        runCatching { unregisterReceiver(screenReceiver) }
        webView.destroy()
        super.onDestroy()
    }

    private fun dispatchToPage(name: String) {
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('$name'))", null)
    }

    companion object {
        private const val TAG = "FamilyOS"
        private const val OFFLINE_HOST = "offline.familyos.local"
        private const val LOAD_TIMEOUT_MS = 10_000L

        private val OFFLINE_HTML = """
            <!doctype html><html><head><meta name="viewport" content="width=960">
            <style>
              body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
                   background:#0f172a;color:#f8fafc;font-family:sans-serif}
              p{color:#94a3b8;margin:0 0 32px}
              button{font-size:28px;margin:0 12px;padding:20px 40px;border:0;border-radius:16px;background:#1e293b;color:#f8fafc}
              button:focus{outline:4px solid #38bdf8;background:#334155}
            </style></head><body>
              <h1>familyOS'a ulaşılamıyor</h1><p>Ağ gelince otomatik yeniden denenecek.</p>
              <div>
                <button onclick="FamilyOS.openApp('tivimate')">TiviMate</button>
                <button onclick="FamilyOS.openApp('youtube')">YouTube</button>
                <button onclick="FamilyOS.openApp('android-settings')">TV ayarları</button>
                <button onclick="location.href='/retry'">Tekrar dene</button>
              </div>
              <script>
                const b=[...document.querySelectorAll('button')];b[0].focus();
                addEventListener('keydown',e=>{const i=b.indexOf(document.activeElement);
                  if(e.key==='ArrowRight'){b[(i+1)%b.length].focus();e.preventDefault()}
                  if(e.key==='ArrowLeft'){b[(i-1+b.length)%b.length].focus();e.preventDefault()}});
              </script>
            </body></html>
        """.trimIndent()
    }
}
