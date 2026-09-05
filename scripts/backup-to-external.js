/**
 * 業務課依頼管理ツール 外部バックアップスクリプト
 * 
 * 使用方法:
 *   node scripts/backup-to-external.js [外部バックアップ先ディレクトリのパス]
 * 
 * 例:
 *   node scripts/backup-to-external.js "Z:\社内共有\業務課ツール_バックアップ"
 *   node scripts/backup-to-external.js "C:\Users\見上\OneDrive\バックアップ\業務課ツール"
 */

const fs = require('fs');
const path = require('path');

// ルートディレクトリとデータディレクトリ
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// バックアップ先（引数がなければ data/backups/daily に退避）
const targetArg = process.argv[2];
const BACKUP_BASE_DIR = targetArg
  ? path.resolve(targetArg)
  : path.join(DATA_DIR, 'backups', 'daily');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

function runBackup() {
  console.log('========================================================');
  console.log('  業務課依頼管理ツール 外部バックアップ処理を開始します');
  console.log('========================================================');

  if (!fs.existsSync(DATA_DIR)) {
    console.error('エラー: データディレクトリが存在しません:', DATA_DIR);
    process.exit(1);
  }

  // 今日の日付スタンプ (YYYY-MM-DD_HHmmss)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const destDir = path.join(BACKUP_BASE_DIR, `backup_${stamp}`);
  fs.mkdirSync(destDir, { recursive: true });

  console.log(`[1/3] バックアップ先を作成: ${destDir}`);

  // 1. JSONデータのコピー
  const filesToCopy = ['requests.json', 'notifications.json', 'masters.json'];
  let copiedJsonCount = 0;
  filesToCopy.forEach((filename) => {
    const srcFile = path.join(DATA_DIR, filename);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(destDir, filename));
      copiedJsonCount++;
    }
  });
  console.log(`[2/3] データベースファイル保存完了 (${copiedJsonCount} ファイル)`);

  // 2. アップロード添付ファイルのコピー
  const uploadsDir = path.join(DATA_DIR, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const destUploads = path.join(destDir, 'uploads');
    copyRecursiveSync(uploadsDir, destUploads);
    const uploadFiles = fs.readdirSync(uploadsDir);
    console.log(`[3/3] 添付ファイル保存完了 (${uploadFiles.length} ファイル)`);
  } else {
    console.log('[3/3] 添付ファイルなし (スキップ)');
  }

  // 3. バックアップ完了情報の記録
  const meta = {
    backupTime: now.toISOString(),
    sourceDir: DATA_DIR,
    destination: destDir,
    success: true,
  };
  fs.writeFileSync(path.join(destDir, 'backup_info.json'), JSON.stringify(meta, null, 2), 'utf-8');

  console.log('--------------------------------------------------------');
  console.log('✅ バックアップが正常に完了しました！');
  console.log('   保存先:', destDir);
  console.log('========================================================');
}

runBackup();
