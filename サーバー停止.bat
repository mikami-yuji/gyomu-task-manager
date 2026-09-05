@echo off
chcp 65001 > NUL
title 業務課依頼管理ツール サーバー停止

echo 業務課依頼管理ツール（ポート3000）を停止しています...

node -e "const {execSync}=require('child_process'); try { const out=execSync('netstat -ano | findstr :3000').toString(); for(const line of out.split(/\r?\n/)) { if(line.includes('LISTENING')) { const pid=line.trim().split(/\s+/).pop(); if(pid) { execSync('taskkill /F /PID '+pid); console.log('PID ' + pid + ' を終了しました。'); } } } } catch(e){ console.log('稼働中のサーバーは見つかりませんでした。'); }"

echo.
echo 停止処理が完了しました。
timeout /t 3
