$src='d:\NghienCuuBaoCaoKhoaHoc\test1_totgan_img'
$dst='storage\renders\user_admin\2026-05-20\20260520_test1_totgan'
foreach ($p in @("$dst\\video","$dst\\voice","$dst\\images")) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
Copy-Item -Path "$src\*.mp4" -Destination "$dst\\video" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$src\*.mp3" -Destination "$dst\\voice" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$src\*.png" -Destination "$dst\\images" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$src\*.jpg" -Destination "$dst\\images" -Force -ErrorAction SilentlyContinue

$videoFiles = Get-ChildItem -Path "$dst\\video" -Filter *.mp4 -ErrorAction SilentlyContinue | Sort-Object Name
$voiceFiles = Get-ChildItem -Path "$dst\\voice" -Filter *.mp3 -ErrorAction SilentlyContinue | Sort-Object Name
$scenes = @()
for ($i=0; $i -lt $videoFiles.Count; $i++) {
  $v = $videoFiles[$i]
  $a = $null
  if ($i -lt $voiceFiles.Count) { $a = $voiceFiles[$i].FullName }
  $scenes += [PSCustomObject]@{ scene_number = ($i+1); video_path = $v.FullName; audio_path = $a }
}
$payload = [PSCustomObject]@{ tvc_title = 'Test Merge - test1_Totgan'; scenes = $scenes; run_id = '20260520_test1_totgan' }
$out = Join-Path $dst 'input_step8.json'
$payload | ConvertTo-Json -Depth 5 | Out-File -FilePath $out -Encoding utf8
Write-Output "DONE: $out"
