param([string]$SourceDir,[string]$OutputPath,[int]$Limit=111)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.FileAccessMode,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics.Imaging,ContentType=WindowsRuntime] | Out-Null
$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod})[0]
function AwaitResult($op,[Type]$type){
 $t=$asTask.MakeGenericMethod($type).Invoke($null,@($op))
 $t.Wait()
 return $t.Result
}
$engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language('zh-Hans-CN')))
$result=@{}
$files=Get-ChildItem -LiteralPath $SourceDir -Filter '*.png' | Sort-Object Name | Select-Object -First $Limit
foreach($f in $files){
 $file=AwaitResult ([Windows.Storage.StorageFile]::GetFileFromPathAsync($f.FullName)) ([Windows.Storage.StorageFile])
 $stream=AwaitResult ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
 $decoder=AwaitResult ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $bitmap=AwaitResult ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
 $ocr=AwaitResult ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
 $lines=@()
 foreach($line in $ocr.Lines){
  $words=@()
  foreach($word in $line.Words){$r=$word.BoundingRect;$words+=@{text=$word.Text;x=$r.X;y=$r.Y;w=$r.Width;h=$r.Height}}
  $lines+=@{text=$line.Text;words=$words}
 }
 $result[$f.BaseName]=@{text=$ocr.Text;lines=$lines}
 $bitmap.Dispose();$stream.Dispose()
 if(($result.Count % 25) -eq 0){Write-Output $result.Count}
}
$result | ConvertTo-Json -Depth 8 -Compress | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Output ('OCR pages: '+$result.Count)

