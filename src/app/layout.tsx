import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '業務課 依頼管理ポータル',
  description: '営業・関係部署からの納期確認、見積依頼、各種手配管理ツール',
  icons: {
    icon: '/icon.svg',
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

/**
 * ルートレイアウトコンポーネント
 */
export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="ja">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
