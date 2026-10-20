# familyOS TV test ölçümleri. Kullanım: pwsh ./measure.ps1 [-Device 192.168.1.136:5555]
param([string]$Device = "192.168.1.136:5555")
$pkg = "me.erkanicil.familyos.tv"
$act = "$pkg/.MainActivity"
function A { adb -s $Device @args }

Write-Host "== 1) Soğuk açılış (hedef < 3 sn) =="
A shell am force-stop $pkg | Out-Null
A logcat -c
A shell am start -W -n $act | Select-String "TotalTime|WaitTime"
Start-Sleep 8
A logcat -d -s FamilyOS:I ActivityManager:I | Select-String "startup:|Fully drawn"

Write-Host "`n== 2) RAM / PSS (hedef < ~150 MB; WebView renderer dahil) =="
Start-Sleep 5
A shell dumpsys meminfo $pkg | Select-String "TOTAL PSS|TOTAL:|Java Heap|Native Heap|Graphics"
A shell "dumpsys meminfo | grep -iE 'sandboxed_process|webview|$pkg'"

Write-Host "`n== 3) Jank (hedef < %10) — 15 sn boyunca kumandayla gezin =="
A shell dumpsys gfxinfo $pkg reset | Out-Null
Start-Sleep 15
A shell dumpsys gfxinfo $pkg | Select-String "Total frames|Janky frames|90th|95th|99th"

Write-Host "`n== 4) TiviMate'e git ve geri dön (hedef < 2 sn, reload yok) =="
A logcat -c
A shell am start -n ar.tvplayer.tv/.ui.MainActivity 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { A shell monkey -p ar.tvplayer.tv -c android.intent.category.LEANBACK_LAUNCHER 1 | Out-Null }
Start-Sleep 10
A shell "dumpsys activity processes | grep -A2 $pkg | head -5"
$t = Get-Date
A shell input keyevent KEYCODE_HOME
Start-Sleep 3
A logcat -d -s FamilyOS:I | Select-String "startup:|return:|renderer gone"
Write-Host "('startup:' satırı çıktıysa süreç öldürülüp sayfa YENİDEN yüklendi demektir)"
A shell dumpsys meminfo $pkg | Select-String "TOTAL PSS|TOTAL:"
