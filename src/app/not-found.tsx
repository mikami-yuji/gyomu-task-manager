import Link from 'next/link';
import React from 'react';

export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4 text-center">
      <h1 className="text-4xl font-black text-sky-800 mb-2">404 - ページが見つかりません</h1>
      <p className="text-sm text-slate-500 mb-6">お探しのページは存在しないか、移動した可能性があります。</p>
      <Link
        href="/"
        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow transition-all"
      >
        トップページに戻る
      </Link>
    </div>
  );
}
