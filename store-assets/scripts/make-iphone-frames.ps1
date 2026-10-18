Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'screenshots'
$tmpDir = Join-Path $env:LOCALAPPDATA 'Temp\cursor\screenshots'
$dataPath = Join-Path $PSScriptRoot 'frames-data.json'
$items = Get-Content -LiteralPath $dataPath -Encoding UTF8 -Raw | ConvertFrom-Json

function Resolve-Ui([string[]]$names) {
  foreach ($n in $names) {
    foreach ($base in @($tmpDir, $outDir)) {
      $p = Join-Path $base $n
      if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).Path }
    }
  }
  return $null
}

function New-RoundRectPath([int]$x, [int]$y, [int]$w, [int]$h, [int]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-IphoneProMaxFrame($UiPath, $OutPath, $Title, $Subtitle, $Chips, $Mode) {
  $W = 1290
  $H = 2796
  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

  if ($Mode -eq 'red') {
    $c1 = [System.Drawing.Color]::FromArgb(201, 65, 51)
    $c2 = [System.Drawing.Color]::FromArgb(95, 28, 24)
    $titleBrush = [System.Drawing.Brushes]::White
    $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 235))
    $chipBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255))
    $chipFg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 28, 30))
    $hiBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(170, 255, 255, 255))
  }
  elseif ($Mode -eq 'dark') {
    $c1 = [System.Drawing.Color]::FromArgb(18, 18, 20)
    $c2 = [System.Drawing.Color]::FromArgb(55, 28, 26)
    $titleBrush = [System.Drawing.Brushes]::White
    $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 210, 215))
    $chipBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(201, 65, 51))
    $chipFg = [System.Drawing.Brushes]::White
    $hiBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(170, 255, 255, 255))
  }
  else {
    $c1 = [System.Drawing.Color]::FromArgb(245, 240, 236)
    $c2 = [System.Drawing.Color]::FromArgb(255, 255, 255)
    $titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 28, 30))
    $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, 90, 95))
    $chipBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(201, 65, 51))
    $chipFg = [System.Drawing.Brushes]::White
    $hiBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(150, 40, 40, 45))
  }

  $bgRect = New-Object System.Drawing.Rectangle 0, 0, $W, $H
  $lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $c1, $c2, 90.0)
  $g.FillRectangle($lg, $bgRect)
  $lg.Dispose()

  $fontTitle = New-Object System.Drawing.Font('Arial', 54, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
  $fontSub = New-Object System.Drawing.Font('Arial', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
  $fontChip = New-Object System.Drawing.Font('Arial', 18, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
  $capFont = New-Object System.Drawing.Font('Arial', 14, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center

  $g.DrawString($Title, $fontTitle, $titleBrush, (New-Object System.Drawing.RectangleF 60, 90, ($W - 120), 220), $sf)
  $g.DrawString($Subtitle, $fontSub, $subBrush, (New-Object System.Drawing.RectangleF 80, 330, ($W - 160), 100), $sf)

  $phoneW = 980
  $phoneH = 2010
  $phoneX = [int](($W - $phoneW) / 2)
  $phoneY = 470
  $outerR = 128
  $bezel = 16

  $shadow = New-RoundRectPath ($phoneX + 18) ($phoneY + 28) $phoneW $phoneH $outerR
  $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 0, 0, 0))
  $g.FillPath($shadowBrush, $shadow)
  $shadowBrush.Dispose()
  $shadow.Dispose()

  $outerPath = New-RoundRectPath $phoneX $phoneY $phoneW $phoneH $outerR
  $frameBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 28, 30))
  $g.FillPath($frameBrush, $outerPath)
  $frameBrush.Dispose()
  $edgePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(110, 110, 115), 2.5)
  $g.DrawPath($edgePen, $outerPath)
  $edgePen.Dispose()

  $btnBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(45, 45, 48))
  $g.FillRectangle($btnBrush, ($phoneX - 6), ($phoneY + 420), 6, 120)
  $g.FillRectangle($btnBrush, ($phoneX - 6), ($phoneY + 580), 6, 180)
  $g.FillRectangle($btnBrush, ($phoneX + $phoneW), ($phoneY + 520), 6, 220)
  $btnBrush.Dispose()

  $sx = $phoneX + $bezel
  $sy = $phoneY + $bezel
  $sw = $phoneW - 2 * $bezel
  $sh = $phoneH - 2 * $bezel
  $screenPath = New-RoundRectPath $sx $sy $sw $sh 108
  $screenRect = New-Object System.Drawing.Rectangle $sx, $sy, $sw, $sh

  if ($UiPath) {
    $ui = [System.Drawing.Image]::FromFile($UiPath)
    $srcW = [math]::Min($ui.Width, [int]([math]::Max(300, $ui.Height * 0.47)))
    if ($srcW -gt $ui.Width) { $srcW = $ui.Width }
    $srcRect = New-Object System.Drawing.Rectangle 0, 0, $srcW, $ui.Height
    $g.SetClip($screenPath)
    $g.DrawImage($ui, $screenRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.ResetClip()
    $ui.Dispose()
  }
  else {
    $g.FillPath([System.Drawing.Brushes]::White, $screenPath)
  }

  $islandW = 230
  $islandH = 68
  $islandX = [int]($sx + ($sw - $islandW) / 2)
  $islandY = $sy + 24
  $island = New-Object System.Drawing.Drawing2D.GraphicsPath
  $island.AddArc($islandX, $islandY, $islandH, $islandH, 90, 180)
  $island.AddArc(($islandX + $islandW - $islandH), $islandY, $islandH, $islandH, 270, 180)
  $island.CloseFigure()
  $g.FillPath([System.Drawing.Brushes]::Black, $island)
  $camBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(55, 90, 140, 180))
  $g.FillEllipse($camBrush, ($islandX + $islandW - 52), ($islandY + 20), 28, 28)
  $camBrush.Dispose()
  $lens = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(120, 160, 210, 230))
  $g.FillEllipse($lens, ($islandX + $islandW - 44), ($islandY + 28), 12, 12)
  $lens.Dispose()
  $island.Dispose()

  $hiW = 240
  $hiH = 9
  $hiX = [int]($sx + ($sw - $hiW) / 2)
  $hiY = $sy + $sh - 30
  $hi = New-Object System.Drawing.Drawing2D.GraphicsPath
  $hi.AddArc($hiX, $hiY, $hiH, $hiH, 90, 180)
  $hi.AddArc(($hiX + $hiW - $hiH), $hiY, $hiH, $hiH, 270, 180)
  $hi.CloseFigure()
  $g.FillPath($hiBrush, $hi)
  $hi.Dispose()

  $chipY = 2555
  $x = 90
  foreach ($chip in $Chips) {
    $sz = $g.MeasureString([string]$chip, $fontChip)
    $cw = [int]($sz.Width + 48)
    $ch = 58
    if (($x + $cw) -gt ($W - 80)) { break }
    $chipPath = New-RoundRectPath $x $chipY $cw $ch 29
    $g.FillPath($chipBg, $chipPath)
    $g.DrawString([string]$chip, $fontChip, $chipFg, ($x + 22), ($chipY + 15))
    $chipPath.Dispose()
    $x += $cw + 16
  }

  $capBrush = if ($Mode -eq 'cream') { $subBrush } else { New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 255, 255, 255)) }
  $g.DrawString('iPhone 18 Pro Max  ·  VayMaster', $capFont, $capBrush, 90, 2695)

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  $fontTitle.Dispose(); $fontSub.Dispose(); $fontChip.Dispose(); $capFont.Dispose()
  $outerPath.Dispose(); $screenPath.Dispose()
  Write-Host ("OK " + (Split-Path $OutPath -Leaf))
}

foreach ($item in $items) {
  $ui = Resolve-Ui @($item.ui)
  $out = Join-Path $outDir $item.out
  $title = ([string]$item.title).Replace('\n', [Environment]::NewLine)
  New-IphoneProMaxFrame $ui $out $title ([string]$item.subtitle) @($item.chips) ([string]$item.mode)
}

Write-Host 'Done iPhone 18 Pro Max frames'
