import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  try {
    const { filename } = await context.params;
    if (!filename) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // パストラバーサル攻撃防止
    const safeFilename = path.basename(decodeURIComponent(filename));
    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const uploadDir = path.join(process.cwd(), 'data', isTestEnv ? 'test_uploads' : 'uploads');
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeFilename).toLowerCase();

    // 適切なMIMEタイプを設定
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.txt' || ext === '.csv') contentType = 'text/plain; charset=utf-8';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(safeFilename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('ファイル配信エラー:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
