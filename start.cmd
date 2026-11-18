@echo off
cd /d "%~dp0"
if exist "D:\Laboratory-Work-N1\tools\node-v24.22.1-win-x64\node.exe" set "PATH=D:\Laboratory-Work-N1\tools\node-v24.22.1-win-x64;%PATH%"
call npm.cmd start
pause
