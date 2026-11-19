# Uji endpoint KYC di digitalcoop.id dari sisi Academy. Alamat dan kunci dibaca dari .env Academy
# (DIGITALCOOP_BRIDGE_URL dan DIGITALCOOP_BRIDGE_KEY), jadi ini juga menguji kecocokan kunci kedua sisi.
# Pakai (dari root repo Academy, server digitalcoop.id sudah jalan):  .\scripts\adhoc\test-bridge-kyc.ps1 -Id <id-anggota-digitalcoop>
param([Parameter(Mandatory = $true)][string]$Id)

$envFile = Join-Path $PSScriptRoot "..\..\.env"
$vars = @{}
Get-Content $envFile | ForEach-Object { if ($_ -match '^\s*([A-Za-z0-9_]+)=(.*)$') { $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") } }
$key = $vars["DIGITALCOOP_BRIDGE_KEY"]
$url = $vars["DIGITALCOOP_BRIDGE_URL"]
if (-not $key -or -not $url) { Write-Host "DIGITALCOOP_BRIDGE_KEY / DIGITALCOOP_BRIDGE_URL belum ada di .env" -ForegroundColor Red; exit 1 }
$base = $url.TrimEnd('/') + "/api/bridge/academy/kyc"
$tmp = [System.IO.Path]::GetTempFileName()

function Call($label, $target, $headers) {
  $code = & curl.exe -s -o $tmp -w "%{http_code}" @headers $target
  Write-Host ("{0,-28} -> HTTP {1}" -f $label, $code)
  return $code
}

Call "tanpa kunci (harus 401)" "$base/tes" @() | Out-Null
Call "kunci salah (harus 401)" "$base/tes" @("-H", "X-Academy-Bridge-Key: kunci-salah") | Out-Null
$code = Call "kunci benar, id anggota" "$base/$Id" @("-H", "X-Academy-Bridge-Key: $key")

if ($code -eq "200") {
  # Data sensitif tidak dicetak utuh: NIK disamarkan, foto hanya ukuran.
  $k = (Get-Content $tmp -Raw | ConvertFrom-Json).kyc
  $nik = [string]$k.nik
  Write-Host ("  status={0} nama={1} nik={2}" -f $k.kycStatus, $k.nama, ($nik.Substring(0, [Math]::Min(4, $nik.Length)) + "********" + $nik.Substring([Math]::Max(0, $nik.Length - 4))))
  Write-Host ("  ktp={0} ({1} byte)  selfie={2} ({3} byte)" -f $k.ktp.mime, [int]($k.ktp.base64.Length * 3 / 4), $k.selfie.mime, [int]($k.selfie.base64.Length * 3 / 4))
} elseif ($code -ne "000") {
  Write-Host ("  " + (Get-Content $tmp -Raw))
}
Remove-Item $tmp -ErrorAction SilentlyContinue
