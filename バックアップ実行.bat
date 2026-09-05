@echo off
chcp 65001 > NUL
title 業務課依頼管理ツール - データバックアップ処理

echo ========================================================
echo   業務課依頼管理ツール 外部バックアップを実行中...
echo ========================================================
echo.

cd /d "%~dp0"

rem 引数があればそのパスへ、なければデフォルト(data/backups/daily)へ
if "%~1"=="" (
    node scripts/backup-to-external.js
) else (
    node scripts/backup-to-external.js "%~1"
)

echo.
echo 処理が完了しました。
timeout /t 5
