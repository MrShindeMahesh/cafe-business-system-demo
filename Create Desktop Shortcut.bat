@echo off
powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $s = $w.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\La Casa POS.lnk'); $s.TargetPath = '%~dp0Start Cafe.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0cafe.ico'; $s.Description = 'La Casa Cafe POS'; $s.Save()"
echo.
echo  Done! A "La Casa POS" icon was created on your Desktop.
echo  Double-click it to start the POS - Chrome opens by itself.
timeout /t 4 >nul
