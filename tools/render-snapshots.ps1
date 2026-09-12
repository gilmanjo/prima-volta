# Renders PNG snapshots of every mockup/figure page into docs/snapshots/.
# Windows dev tool (headless Chrome + System.Drawing). Regenerate after any mockup/figure rebuild:
#   powershell -NoProfile -File tools/render-snapshots.ps1 [-Only <substring>]
param([string]$Only = "")

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "docs\snapshots"
if (-not (Test-Path $out)) { New-Item -ItemType Directory $out | Out-Null }
$tmp = Join-Path $env:TEMP "pv-snap.png"

$pages = @()
Get-ChildItem (Join-Path $root "docs\catalog\mockups") -Filter *.html | ForEach-Object { $pages += $_ }
Get-ChildItem (Join-Path $root "docs\ux\mockups") -Filter *.html | ForEach-Object { $pages += $_ }
Get-ChildItem (Join-Path $root "docs\figures") -Filter *.html | ForEach-Object { $pages += $_ }

foreach ($p in $pages) {
  if ($Only -and ($p.Name -notlike "*$Only*")) { continue }
  $url = "file:///" + ($p.FullName -replace "\\", "/")
  $args = "--headless=new --disable-gpu --hide-scrollbars --window-size=1360,17000 " +
          "--virtual-time-budget=12000 --screenshot=`"$tmp`" `"$url`""
  Start-Process -FilePath $chrome -ArgumentList $args -Wait -WindowStyle Hidden
  # crop trailing background: compare rows (bottom-up) against the very bottom row
  $img = [System.Drawing.Bitmap]::FromFile($tmp)
  $w = $img.Width; $h = $img.Height
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $data = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $img.PixelFormat)
  $bpp = [System.Drawing.Image]::GetPixelFormatSize($img.PixelFormat) / 8
  $stride = [Math]::Abs($data.Stride)
  $row = New-Object byte[] $stride
  $bg = New-Object byte[] $stride
  [System.Runtime.InteropServices.Marshal]::Copy([IntPtr]::Add($data.Scan0, ($h - 1) * $data.Stride), $bg, 0, $stride)
  $bottom = 0
  for ($y = $h - 2; $y -ge 0; $y--) {
    [System.Runtime.InteropServices.Marshal]::Copy([IntPtr]::Add($data.Scan0, $y * $data.Stride), $row, 0, $stride)
    $diff = 0
    for ($x = 0; $x -lt $stride; $x += $bpp * 7) {  # sample every 7th pixel
      if ([Math]::Abs($row[$x] - $bg[$x]) -gt 10 -or [Math]::Abs($row[$x+1] - $bg[$x+1]) -gt 10) { $diff++ }
      if ($diff -gt 6) { break }
    }
    if ($diff -gt 6) { $bottom = $y; break }
  }
  $img.UnlockBits($data)
  $ch = [Math]::Min($h, $bottom + 46)
  $crop = $img.Clone((New-Object System.Drawing.Rectangle(0, 0, $w, $ch)), $img.PixelFormat)
  $dest = Join-Path $out ($p.BaseName + ".png")
  $crop.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Dispose(); $crop.Dispose()
  "{0}  {1}x{2}  {3:n0} KB" -f $p.BaseName, $w, $ch, ((Get-Item $dest).Length / 1KB)
}
Remove-Item $tmp -ErrorAction SilentlyContinue
