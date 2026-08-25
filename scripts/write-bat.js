const fs = require('fs');
const path = require('path');

const batContent = `@echo off
chcp 65001 > NUL
title 業務課依頼管理ツール サーバー起動中

echo ========================================================
echo   業務課依頼管理ツール サーバーを起動しています...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 最新ビルドを確認・生成中...
call npm.cmd run build

rem 既存のポート3000使用プロセスがあれば自動解放
node -e "const {execSync}=require('child_process'); try { const out=execSync('netstat -ano | findstr :3000').toString(); for(const line of out.split(/\\r?\\n/)) { if(line.includes('LISTENING')) { const pid=line.trim().split(/\\s+/).pop(); if(pid) execSync('taskkill /F /PID '+pid); } } } catch(e){}" >NUL 2>&1

set LOCAL_IP=192.168.1.157
for /f %%i in ('node -e "const os=require('os'); const ifs=os.networkInterfaces(); for(const n in ifs){ for(const d of ifs[n]){ if(!d.internal && d.family==='IPv4'){ console.log(d.address); process.exit(); } } } console.log('192.168.1.157');"') do (
    set LOCAL_IP=%%i
)

echo.
echo [2/2] 本番サーバーを起動中...
echo.
echo ========================================================
echo   [このPCからアクセス]
echo   ポータル画面 : http://localhost:3000
echo   管理者画面   : http://localhost:3000/admin
echo.
echo   [社内共有用URL] (他のPCからアクセスするURL)
echo   ポータル画面 : http://%LOCAL_IP%:3000
echo   管理者画面   : http://%LOCAL_IP%:3000/admin
echo --------------------------------------------------------
echo   ※このウィンドウを閉じるとサーバーが停止します。
echo ========================================================
echo.

call npm.cmd run start
pause
`.replace(/\r?\n/g, '\r\n');

fs.writeFileSync(path.join(__dirname, '..', 'スタート_業務課ツール.bat'), batContent, 'utf8');
console.log('Successfully written スタート_業務課ツール.bat with CRLF');
