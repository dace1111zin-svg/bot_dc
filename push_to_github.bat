@echo off
echo.
echo ==============================================
echo       Pushing Code to GitHub Repository
echo ==============================================
echo.
echo Target remote URL: https://github.com/dace1111zin-svg/bot_dc.git
echo.

REM Ensure remote is set correctly
git remote set-url origin https://dace1111zin-svg@github.com/dace1111zin-svg/bot_dc.git

echo Current git status:
echo ----------------------------------------------
git status
echo ----------------------------------------------
echo.

set /p COMMIT_MSG="Enter commit message [Default: 'push code to github']: "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=push code to github

echo.
echo Staging all changes...
git add .

echo.
echo Committing changes...
git commit -m "%COMMIT_MSG%"

echo.
echo Pushing to GitHub (main branch)...
git push -u origin main

echo.
echo ==============================================
echo Done! If prompt asked for credentials, please sign in.
echo Press any key to exit.
echo ==============================================
pause >nul
