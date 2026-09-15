@echo off
REM RIGHT-CLICK this file and choose "Run as administrator" (needed once)
netsh advfirewall firewall delete rule name="La Casa POS" >nul 2>&1
netsh advfirewall firewall add rule name="La Casa POS" dir=in action=allow protocol=TCP localport=4000 >nul
echo.
echo  Done! Phones on the SAME Wi-Fi can now open the POS.
echo  You only need to run this once.
timeout /t 5 >nul
