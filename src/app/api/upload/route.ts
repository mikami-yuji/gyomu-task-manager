import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'ファイルが選択されていません' }, { status: 400 });
    }

    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const uploadDir = path.join(process.cwd(), 'data', isTestEnv ? 'test_uploads' : 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadedItems = [];

    for (const file of files) {
      if (typeof file === 'string') continue;

      // 1ファイルあたり最大20MBまで
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: `ファイル「${file.name}」が大きすぎます (最大20MB)` },
          { status: 400 }
        );
      }

      // セキュリティ: 許可された拡張子のみ受け付ける（ホワイトリスト方式）
      const ext = path.extname(file.name).toLowerCase();
      const ALLOWED_EXTENSIONS = new Set([
        '.pdf', '.xlsx', '.xls', '.docx', '.doc', '.csv', '.txt',
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.zip'
      ]);

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { success: false, error: `許可されていないファイル形式です (${ext})。PDF、Excel、Word、画像、ZIP等をご利用ください。` },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const safeRandom = Math.random().toString(36).substring(2, 8);
      // 安全なファイル名サニタイズ
      const baseName = path.basename(file.name, ext).replace(/[^\w\s\u3000-\u30FF\u4E00-\u9FFF-]/g, '_');
      const uniqueFileName = `${timestamp}_${safeRandom}_${baseName}${ext}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      uploadedItems.push({
        id: `att_${timestamp}_${safeRandom}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: `/api/upload/${encodeURIComponent(uniqueFileName)}`,
      });
    }

    return NextResponse.json({
      success: true,
      data: uploadedItems,
    });
  } catch (err) {
    console.error('ファイルアップロードエラー:', err);
    return NextResponse.json({ success: false, error: 'アップロード処理に失敗しました' }, { status: 500 });
  }
}
