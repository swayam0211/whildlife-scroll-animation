@echo off
echo Starting Cinematic Wildlife Server...
npx -y browser-sync start --server --files "**/*" --startPath "login_page/login.html"
pause
