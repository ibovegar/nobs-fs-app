Add-Type -AssemblyName System.Drawing

function New-InstallerImage {
    param(
        [string]$SourcePng,
        [string]$OutPath,
        [int]$Width,
        [int]$Height,
        [string]$BgHex,
        [double]$LogoScale
    )

    $bg = [System.Drawing.ColorTranslator]::FromHtml($BgHex)
    $canvas = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.Clear($bg)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $src = [System.Drawing.Image]::FromFile($SourcePng)
    $logoH = [Math]::Floor([Math]::Min($Width, $Height) * $LogoScale)
    $logoW = [Math]::Floor($logoH * ($src.Width / $src.Height))
    $x = [Math]::Floor(($Width - $logoW) / 2)
    $y = [Math]::Floor(($Height - $logoH) / 2)
    $g.DrawImage($src, $x, $y, $logoW, $logoH)
    $src.Dispose()

    $canvas.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
    $g.Dispose()
    $canvas.Dispose()
    Write-Host "Wrote $OutPath ($Width x $Height)"
}

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "src-tauri/icons/icon.png"
$outDir = Join-Path $root "src-tauri/icons/installer"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bg = "#171F24"

# NSIS header (top of every page except welcome/finish)
New-InstallerImage -SourcePng $src -OutPath (Join-Path $outDir "header.bmp") -Width 150 -Height 57 -BgHex $bg -LogoScale 0.72

# NSIS sidebar (welcome + finish pages)
New-InstallerImage -SourcePng $src -OutPath (Join-Path $outDir "sidebar.bmp") -Width 164 -Height 314 -BgHex $bg -LogoScale 0.45

# WiX banner (top of every page except welcome/completion)
New-InstallerImage -SourcePng $src -OutPath (Join-Path $outDir "banner.bmp") -Width 493 -Height 58 -BgHex $bg -LogoScale 0.72

# WiX dialog image (welcome + completion dialogs)
New-InstallerImage -SourcePng $src -OutPath (Join-Path $outDir "dialog.bmp") -Width 493 -Height 312 -BgHex $bg -LogoScale 0.5
