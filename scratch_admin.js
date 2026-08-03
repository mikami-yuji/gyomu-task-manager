
// --- 検索窓の✗ボタン共通処理 ---
window.clearSearchBar = function() {
    const el = document.getElementById('searchBar');
    if (!el) return;
    el.value = '';
    el.dispatchEvent(new Event('input'));
    el.focus();
};
function updateSearchBarClearBtn() {
    const el = document.getElementById('searchBar');
    const btn = document.getElementById('searchBarClearBtn');
    if (!el || !btn) return;
    btn.classList.toggle('hidden', el.value.length === 0);
}
// admin.js — 依頼書進捗管理システム（日々の進捗画面・社内サーバー版）
// 担当割り・依頼書単位の進捗管理・社員管理・ストレージ管理は management.html/management.js に分離した。
// このファイルは各担当が自分の依頼書を確認・作業するための画面。
//
// 【2026/7/1 変更】タブ方式 → チェックボックス方式に変更。
//   デフォルト：未完了のみチェック。複数ステータスの同時表示が可能。
window.allDocuments = [];
window.plannerMaster = [];

window.STATUS_LABELS = {
    pending: '未完了',
    completed: '完了',
    onHold: '保留',
    rejected: '没',
    inSubmission: '出稿中',
    submissionDone: '出稿済',
};
window.MANUAL_STATUS_LABELS = {
    pending: '未完了',
    completed: '完了',
    onHold: '保留',
};

// ステータスチェックボックスの定義（admin画面のデフォルトは未完了のみ）
window.STATUS_FILTER_OPTIONS = [
    { key: 'pending',        label: '未完了', color: 'gray'   },
    { key: 'completed',      label: '完了',   color: 'blue'   },
    { key: 'inSubmission',   label: '出稿中', color: 'orange' },
    { key: 'submissionDone', label: '出稿済', color: 'green'  },
    { key: 'onHold',         label: '保留',   color: 'amber'  },
    { key: 'rejected',       label: '没',     color: 'red'    },
];

const PLANNER_FILTER_STORAGE_KEY = 'irai_planner_filter';

// 日付フィルタは「依頼日（requestedAt）」固定
const _savedAdminDateFilter = (() => { try { return JSON.parse(localStorage.getItem('irai_admin_date_filter') || '{}'); } catch { return {}; } })();
const _savedAdminStatusFilters = (() => { try { return JSON.parse(localStorage.getItem('irai_admin_status_filters') || 'null'); } catch { return null; } })();
window.filterState = {
    statusFilters: new Set(Array.isArray(_savedAdminStatusFilters) ? _savedAdminStatusFilters : ['pending']),
    planner: localStorage.getItem(PLANNER_FILTER_STORAGE_KEY) || '',
    dateFilter: { mode: _savedAdminDateFilter.mode || 'all', from: _savedAdminDateFilter.from || '', to: _savedAdminDateFilter.to || '' },
};
function saveAdminDateFilter() {
    try { localStorage.setItem('irai_admin_date_filter', JSON.stringify(window.filterState.dateFilter)); } catch(e) {}
}
function saveAdminStatusFilters() {
    try { localStorage.setItem('irai_admin_status_filters', JSON.stringify([...window.filterState.statusFilters])); } catch(e) {}
}
(function() {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('irai_admin_sort') || '{}'); } catch { return {}; } })();
    window.sortState = { key: saved.key || 'requestId', order: saved.order || 'desc' };
})();
function saveAdminSortState() {
    try { localStorage.setItem('irai_admin_sort', JSON.stringify(window.sortState)); } catch(e) {}
}

// --- カスタムUI関数 ---
function showCustomAlert(message) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm';
    modal.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
    <p class="mb-4 text-base text-gray-800">${message}</p>
    <button id="customAlertOk" class="px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors">OK</button>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('customAlertOk').onclick = () => document.body.removeChild(modal);
}
window.showCustomAlert = showCustomAlert;

// 確認モーダルの多重生成を防ぐためのフラグ（連打やEnterキーの誤反応で
// オーバーレイが何枚も重なって画面が暗くなっていく不具合への対処）
let isCustomConfirmOpen = false;

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        if (isCustomConfirmOpen) {
            resolve(false);
            return;
        }
        isCustomConfirmOpen = true;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm';
        modal.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-2xl text-center max-w-sm w-full animate-fade-in">
        <p class="mb-4 text-base text-gray-800">${message}</p>
        <div class="flex justify-center space-x-2">
        <button id="customConfirmYes" class="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">はい</button>
        <button id="customConfirmNo" class="px-4 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400">いいえ</button>
        </div>
        </div>`;
        document.body.appendChild(modal);

        const cleanup = (result) => {
            document.removeEventListener('keydown', onKeyDown);
            if (modal.parentNode) document.body.removeChild(modal);
            isCustomConfirmOpen = false;
            resolve(result);
        };

        const onKeyDown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); cleanup(true); }
            else if (e.key === 'Escape') { e.preventDefault(); cleanup(false); }
        };
        document.addEventListener('keydown', onKeyDown);

        document.getElementById('customConfirmYes').onclick = () => cleanup(true);
        document.getElementById('customConfirmNo').onclick = () => cleanup(false);
        // 「はい」ボタンに初期フォーカスを当てておくことで、Enterキーでの確定が自然に行える
        document.getElementById('customConfirmYes').focus();
    });
}
window.showCustomConfirm = showCustomConfirm;

function showUploadStatus(message, isError) {
    // PDFアップロード欄を management.html に移したため、専用の表示欄（uploadStatusMessage）はもう無い。
    // 代わりに画面右下に一時的なトーストを表示する方式にする。
    const el = document.createElement('div');
    el.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm z-50 max-w-sm ${isError ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`;
    el.innerHTML = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

// 画像・PDFをモーダルでプレビュー表示する（別ウィンドウを開かずその場で確認できるようにする）
function openImageModal(url, type, compImageId, attachmentId) {
    const imgEl = document.getElementById('imageModalImg');
    const pdfEl = document.getElementById('imageModalPdf');
    const downloadBtn = document.getElementById('imageModalDownloadBtn');
    const isPdf = type === 'pdf' || url.toLowerCase().endsWith('.pdf');
    if (isPdf) {
        pdfEl.src = url;
        pdfEl.classList.remove('hidden');
        imgEl.classList.add('hidden');
        imgEl.src = '';
    } else {
        imgEl.src = url;
        imgEl.classList.remove('hidden');
        pdfEl.classList.add('hidden');
        pdfEl.src = '';
    }
    if (downloadBtn) {
        if (compImageId) {
            // カンプ画像は専用APIでダウンロードすると、zip一括ダウンロードと同じ命名規則のファイル名が付く
            downloadBtn.href = `/api/comp-images/${compImageId}/download`;
            downloadBtn.removeAttribute('download'); // Content-Dispositionのファイル名をそのまま使う
        } else if (attachmentId) {
            // v22b: 別紙（PDF等）も専用APIでダウンロードすると、UUIDプレフィックスを外した元のファイル名になる
            downloadBtn.href = `/api/attachments/${attachmentId}/download`;
            downloadBtn.removeAttribute('download');
        } else {
            downloadBtn.href = url;
            const fileName = url.split('/').pop().split('?')[0];
            downloadBtn.setAttribute('download', decodeURIComponent(fileName) || '');
        }
    }
    document.getElementById('imageModal').classList.remove('hidden');
}
window.openImageModal = openImageModal;
window.openImagePreview = openImageModal; // Firebase版との互換用エイリアス
function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
    document.getElementById('imageModalPdf').src = ''; // PDF読み込みを確実に止める
}
window.closeImageModal = closeImageModal;

// --- 虫眼鏡アイコンへのホバーで即座に拡大表示するプレビュー（Eagle風） ---
// サムネイルにマウスを乗せると右下に虫眼鏡アイコンが浮き、そのアイコンに
// マウスを乗せている間だけ、カーソル付近に大きな画像またはPDFを表示する。
// クリック不要で確認できるため、1枚ずつ確認したい時に素早く見られる。
let hoverPreviewImgEl = null;
let hoverPreviewPdfEl = null;
const HOVER_PREVIEW_IMG_SIZE = 420; // 画像用（正方形に近いカンプ画像・別紙向け）
const HOVER_PREVIEW_PDF_WIDTH = 460; // PDF用（縦長で、文字が判読できるよう少し大きめにする）
const HOVER_PREVIEW_PDF_HEIGHT = 620;

function ensureHoverPreviewEls() {
    if (!hoverPreviewImgEl) {
        hoverPreviewImgEl = document.createElement('img');
        hoverPreviewImgEl.id = 'hoverPreviewImg';
        hoverPreviewImgEl.className = 'fixed z-[60] rounded-lg shadow-2xl border-2 border-white pointer-events-none hidden';
        hoverPreviewImgEl.style.maxWidth = `${HOVER_PREVIEW_IMG_SIZE}px`;
        hoverPreviewImgEl.style.maxHeight = `${HOVER_PREVIEW_IMG_SIZE}px`;
        hoverPreviewImgEl.style.objectFit = 'contain';
        hoverPreviewImgEl.style.backgroundColor = '#fff';
        document.body.appendChild(hoverPreviewImgEl);
    }
    if (!hoverPreviewPdfEl) {
        hoverPreviewPdfEl = document.createElement('iframe');
        hoverPreviewPdfEl.id = 'hoverPreviewPdf';
        // PDFビューア内のスクロール操作などを誤って奪わないよう、ホバー中も操作不可にする
        hoverPreviewPdfEl.className = 'fixed z-[60] rounded-lg shadow-2xl border-2 border-white bg-white hidden pointer-events-none';
        hoverPreviewPdfEl.style.width = `${HOVER_PREVIEW_PDF_WIDTH}px`;
        hoverPreviewPdfEl.style.height = `${HOVER_PREVIEW_PDF_HEIGHT}px`;
        document.body.appendChild(hoverPreviewPdfEl);
    }
}

function showHoverPreview(url, anchorEl, type) {
    const isPdf = type === 'pdf' || url.toLowerCase().endsWith('.pdf');
    // FirefoxはiframeでPDFをダウンロードしてしまうためPDFプレビューを無効にする
    if (isPdf && navigator.userAgent.toLowerCase().includes('firefox')) return;
    ensureHoverPreviewEls();
    if (isPdf) {
        hoverPreviewImgEl.classList.add('hidden');
        hoverPreviewPdfEl.src = url + '#toolbar=0&navpanes=0&view=FitH';
        hoverPreviewPdfEl.classList.remove('hidden');
    } else {
        hoverPreviewPdfEl.classList.add('hidden');
        hoverPreviewPdfEl.src = '';
        hoverPreviewImgEl.src = url;
        hoverPreviewImgEl.classList.remove('hidden');
    }
    positionHoverPreview(anchorEl, isPdf);
}
window.showHoverPreview = showHoverPreview;

function positionHoverPreview(anchorEl, isPdf) {
    const el = isPdf ? hoverPreviewPdfEl : hoverPreviewImgEl;
    if (!el || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const previewWidth = isPdf ? HOVER_PREVIEW_PDF_WIDTH : HOVER_PREVIEW_IMG_SIZE;
    const previewHeight = isPdf ? HOVER_PREVIEW_PDF_HEIGHT : HOVER_PREVIEW_IMG_SIZE;
    // 画面右端・下端からはみ出さないよう、アイコンの左上を基準に表示位置を調整する
    let left = rect.right + 8;
    let top = rect.top;
    if (left + previewWidth > window.innerWidth) left = rect.left - previewWidth - 8;
    if (left < 0) left = 8;
    if (top + previewHeight > window.innerHeight) top = window.innerHeight - previewHeight - 8;
    if (top < 0) top = 8;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
}
window.positionHoverPreview = positionHoverPreview;

function hideHoverPreview() {
    if (hoverPreviewImgEl) hoverPreviewImgEl.classList.add('hidden');
    if (hoverPreviewPdfEl) { hoverPreviewPdfEl.classList.add('hidden'); hoverPreviewPdfEl.src = ''; }
}
window.hideHoverPreview = hideHoverPreview;

// --- API呼び出しヘルパー ---
async function apiFetch(url, options = {}) {
    const res = await apiFetchRaw(url, options);
    return res;
}

async function apiFetchRaw(url, options = {}) {
    const res = await fetch(url, { credentials: 'include', ...options });
    if (res.status === 401) {
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        throw new Error('認証が必要です');
    }
    return res;
}

async function apiJson(url, options = {}) {
    const res = await apiFetch(url, options);
    return res.json();
}

// --- ヘルパー関数 ---
function truncateString(str, num) {
    if (!str) return '';
    const value = String(str);
    return value.length > num ? value.slice(0, num) + '...' : value;
}

function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}/${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`;
}

function formatIsoDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
}

function formatBytes(bytes) {
    if (!bytes) return '0KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// --- 担当企画（メイン）の更新 ---
async function updatePlanner(docId, plannerName) {
    try {
        await apiFetch(`/api/documents/${docId}/field`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'planner', value: plannerName }),
        });
        await loadRequestDocuments();
    } catch (error) { console.error('Error updating planner:', error); }
}
window.updatePlanner = updatePlanner;

// --- メモの更新（再描画なし。フォーカスが外れないよう画面全体は再読込しない） ---
async function updateDocMemo(docId, memo) {
    try {
        await apiFetch(`/api/documents/${docId}/field`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: 'memo', value: memo }),
        });
        // メモはローカルのallDocumentsだけ更新し、全体の再描画はしない
        // （再描画するとフォーカスが外れたり、他の入力中の内容が消えるのを避けるため）
        const target = window.allDocuments.find(d => d.id === docId);
        if (target) target.memo = memo;
    } catch (error) { console.error('Error updating memo:', error); }
}
window.updateDocMemo = updateDocMemo;

// --- サブ担当の追加・削除 ---
async function addSubPlanner(docId, plannerName) {
    const trimmed = (plannerName || '').trim();
    if (!trimmed) return;
    try {
        const data = await apiJson(`/api/documents/${docId}/sub-planners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmed }),
        });
        if (!data.ok) { showCustomAlert(data.message || '追加に失敗しました。'); return; }
        await loadRequestDocuments();
    } catch (error) { console.error('Error adding sub planner:', error); }
}
window.addSubPlanner = addSubPlanner;

async function removeSubPlanner(docId, plannerName) {
    try {
        await apiFetch(`/api/documents/${docId}/sub-planners/${encodeURIComponent(plannerName)}`, { method: 'DELETE' });
        await loadRequestDocuments();
    } catch (error) { console.error('Error removing sub planner:', error); }
}
window.removeSubPlanner = removeSubPlanner;

// --- サブ担当の個別完了チェック切り替え ---
async function toggleSubPlannerCompleted(docId, plannerName, completed) {
    try {
        await apiFetch(`/api/documents/${docId}/sub-planners/${encodeURIComponent(plannerName)}/completed`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed }),
        });
        await loadRequestDocuments();
    } catch (error) { console.error('Error toggling sub planner completed:', error); }
}
window.toggleSubPlannerCompleted = toggleSubPlannerCompleted;

// --- 受注番号の更新（出稿の自動切替） ---
async function updateSubmissionId(docId, submissionId) {
    try {
        await apiFetch(`/api/documents/${docId}/submission-id`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId }),
        });
        await loadRequestDocuments();
    } catch (error) { console.error('Error updating submission ID:', error); }
}
window.updateSubmissionId = updateSubmissionId;

// --- 出稿(中)⇔出稿(完)の切り替え ---
async function toggleSubmissionDone(docId, done) {
    try {
        await apiFetch(`/api/documents/${docId}/submission-done`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ done }),
        });
        await loadRequestDocuments();
    } catch (error) { console.error('Error toggling submission done:', error); }
}
window.toggleSubmissionDone = toggleSubmissionDone;

// v22: グループ（同じ依頼番号の全枝）単位で受注番号を更新する
async function updateGroupSubmissionId(requestId, submissionId) {
    try {
        await apiFetch(`/api/documents/by-request-id/${encodeURIComponent(requestId)}/submission-id`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId }),
        });
        await loadRequestDocuments();
    } catch (error) { console.error('Error updating group submission ID:', error); }
}
window.updateGroupSubmissionId = updateGroupSubmissionId;

// v22: グループ単位で出稿中⇔出稿済を切り替える。
// 出稿済に切り替える場合は代表枝（最終枝）のIDを使って既存の /submission-done API を呼ぶ。
// 出稿中に戻す場合も同様。グループ内の全枝が同じステータスのはずなので、代表枝の操作で足りる。
async function toggleGroupSubmissionDone(requestId, done) {
    try {
        const docsInGroup = window.allDocuments.filter(d => d.requestId === requestId && d.status !== 'rejected');
        if (docsInGroup.length === 0) return;
        // 全枝に対して個別APIを呼ぶ（グループ専用のsubmission-done APIはまだ無いため、既存APIをまとめて叩く）
        await Promise.all(docsInGroup.map(d =>
            apiFetch(`/api/documents/${d.id}/submission-done`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ done }),
            })
        ));
        await loadRequestDocuments();
    } catch (error) { console.error('Error toggling group submission done:', error); }
}
window.toggleGroupSubmissionDone = toggleGroupSubmissionDone;

// v22: グループ（同じ依頼番号の全枝）を「没」にする
async function rejectGroup(requestId) {
    if (!await showCustomConfirm(`依頼番号「${requestId}」のすべての枝を「没」に変更しますか？`)) return;
    try {
        await apiFetch(`/api/documents/by-request-id/${encodeURIComponent(requestId)}/reject-all`, {
            method: 'PATCH',
        });
        await loadRequestDocuments();
    } catch (error) { console.error('Error rejecting group:', error); }
}
window.rejectGroup = rejectGroup;

// --- 出稿担当者の手動変更 ---
async function updateSubmittedBy(docId, plannerName) {
    try {
        await apiFetch(`/api/documents/${docId}/submitted-by`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submittedBy: plannerName }),
        });
        await loadRequestDocuments();
    } catch (error) { console.error('Error updating submittedBy:', error); }
}
window.updateSubmittedBy = updateSubmittedBy;

// --- ステータス直接変更（プルダウン、誤操作の救済） ---
async function changeDocStatus(docId, newStatus) {
    const label = window.STATUS_LABELS[newStatus] || newStatus;
    let confirmMessage = `この依頼書のステータスを「${label}」に変更しますか？`;
    if (newStatus === 'completed') {
        confirmMessage += '<br>※担当営業へ完了メールが送信されます。';
    }
    if (!await showCustomConfirm(confirmMessage)) {
        renderDocuments(window.allDocuments);
        return;
    }
    try {
        await apiFetch(`/api/documents/${docId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        await loadRequestDocuments();
    } catch (error) {
        console.error('Error changing document status:', error);
        showCustomAlert('ステータスの更新中にエラーが発生しました: ' + error.message);
    }
}
window.changeDocStatus = changeDocStatus;

// --- 依頼書削除 ---
async function deleteDocument(docId) {
    if (!await showCustomConfirm('本当にこの依頼書を削除しますか？')) return;
    try {
        await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
        await loadRequestDocuments();
    } catch (error) { console.error('Error deleting document:', error); }
}
window.deleteDocument = deleteDocument;

// --- カンプ画像のアップロード・削除・一括ダウンロード ---
async function uploadCompImage(docId, files) {
    const fileList = files instanceof FileList || Array.isArray(files) ? Array.from(files) : [files];
    if (fileList.length === 0) return;

    // v22c: 同じ依頼書内で、拡張子込み完全一致のファイル名がすでに存在する場合は確認を挟む
    // （別の依頼書との重複はチェック対象外）
    const targetDoc = window.allDocuments.find(d => d.id === docId);
    const existingNames = new Set((targetDoc?.compImages || []).map(img => img.originalName));
    const duplicateNames = fileList.filter(f => existingNames.has(f.name)).map(f => f.name);
    if (duplicateNames.length > 0) {
        const confirmed = await showCustomConfirm(
            `以下のファイル名はすでにこの依頼書に存在します。<br>${duplicateNames.map(n => `「${n}」`).join('<br>')}<br>そのまま続行しますか？`
        );
        if (!confirmed) return;
    }

    const formData = new FormData();
    fileList.forEach(f => formData.append('images', f));
    try {
        await apiFetch(`/api/documents/${docId}/comp-images`, { method: 'POST', body: formData });
        showUploadStatus(`カンプ画像を${fileList.length}枚アップロードしました。`, false);
        await loadRequestDocuments();
    } catch (error) { console.error('カンプ画像のアップロードに失敗しました:', error); }
}
window.uploadCompImage = uploadCompImage;

async function deleteCompImage(docId, imageId) {
    if (!await showCustomConfirm('このカンプ画像を削除しますか？')) return;
    try {
        await apiFetch(`/api/comp-images/${imageId}`, { method: 'DELETE' });
        await loadRequestDocuments();
    } catch (error) { console.error('カンプ画像の削除に失敗しました:', error); }
}
window.deleteCompImage = deleteCompImage;

function downloadAllCompImages(docId) {
    window.location.href = `/api/documents/${docId}/comp-images/download-zip`;
}
window.downloadAllCompImages = downloadAllCompImages;

// --- 別紙のアップロード・削除（複数ファイル対応） ---
async function uploadAttachment(docId, files, uploadedByRole) {
    const fileList = files instanceof FileList || Array.isArray(files) ? Array.from(files) : [files];
    if (fileList.length === 0) return;
    const formData = new FormData();
    fileList.forEach(f => formData.append('files', f));
    formData.append('uploadedBy', uploadedByRole || '企画');
    try {
        const data = await apiJson(`/api/documents/${docId}/attachments`, { method: 'POST', body: formData });
        if (!data.ok) { showCustomAlert(data.message || '別紙のアップロードに失敗しました。'); return; }
        if (data.failed && data.failed.length > 0) {
            showCustomAlert(`以下のファイルは画像・zip以外のためアップロードできませんでした：\n${data.failed.join('\n')}`.replace(/\n/g, '<br>'));
        }
        await loadRequestDocuments();
    } catch (error) {
        console.error('別紙のアップロードに失敗しました:', error);
        showCustomAlert('別紙のアップロード中にエラーが発生しました: ' + error.message);
    }
}
window.uploadAttachment = uploadAttachment;

async function deleteAttachment(docId, attachmentId) {
    if (!await showCustomConfirm('この別紙を削除しますか？')) return;
    try {
        await apiFetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
        await loadRequestDocuments();
    } catch (error) { console.error('別紙の削除に失敗しました:', error); }
}
window.deleteAttachment = deleteAttachment;

// --- 社員管理（担当企画マスタ） ---
async function loadPlannerMaster() {
    try {
        const data = await apiJson('/api/planners');
        window.plannerMaster = data.planners || [];
        window.plannerMasterPlanner = window.plannerMaster.filter(p => (p.role || 'planner') === 'planner');
        renderDocuments(window.allDocuments);
    } catch (error) { console.error('Error loading planner master:', error); }
}

// --- 担当企画プルダウン生成 ---
function buildPlannerOptions(currentValue) {
    const activeNames = (window.plannerMasterPlanner || window.plannerMaster.filter(p => (p.role || 'planner') === 'planner')).filter(p => p.active).map(p => p.name);
    const options = ['<option value="">未割り当て</option>'];
    const allNames = new Set(activeNames);
    if (currentValue && !allNames.has(currentValue)) {
        allNames.add(currentValue);
    }
    allNames.forEach(name => {
        const isRetired = !activeNames.includes(name);
        const selected = name === currentValue ? 'selected' : '';
        options.push(`<option value="${name}" ${selected}>${name}${isRetired ? '（退職）' : ''}</option>`);
    });
    return options.join('');
}

function buildAddableSubPlannerOptions(mainPlanner, currentSubPlanners) {
    const activeNames = (window.plannerMasterPlanner || window.plannerMaster.filter(p => (p.role || 'planner') === 'planner')).filter(p => p.active).map(p => p.name);
    const excluded = new Set([mainPlanner, ...(currentSubPlanners || [])].filter(Boolean));
    const addable = activeNames.filter(name => !excluded.has(name));
    if (addable.length === 0) {
        return '<option value="">追加できる担当者がいません</option>';
    }
    return ['<option value="">サブ担当を追加...</option>', ...addable.map(name => `<option value="${name}">${name}</option>`)].join('');
}

// --- 日付フィルタ ---
// 対象フィールド（仕上げ希望日/依頼日/完了日）を選択できる方式。
// adminでは日付フィルタは記憶しない（毎回デフォルトに戻る）。
function getDateFilterRange(mode, from, to) {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    // YYYY-MM-DD形式で返す（DB値と同じ形式）
    const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    switch (mode) {
        case 'today':
            return { from: toISO(today), to: toISO(today) };
        case 'yesterday': {
            const y = new Date(today); y.setDate(y.getDate() - 1);
            return { from: toISO(y), to: toISO(y) };
        }
        case 'thisWeek': {
            const from7d = new Date(today); from7d.setDate(today.getDate() - 6);
            return { from: toISO(from7d), to: toISO(today) };
        }
        case 'thisMonth': {
            const from30d = new Date(today); from30d.setDate(today.getDate() - 29);
            return { from: toISO(from30d), to: toISO(today) };
        }
        case 'last3months': {
            const from3m = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            return { from: toISO(from3m), to: toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
        }
        case 'custom':
            return { from: from || '', to: to || '' };
        default:
            return { from: '', to: '' };
    }
}

function applyDateFilter(docs) {
    const { mode, from, to } = window.filterState.dateFilter;
    if (!mode || mode === 'all') return docs;
    const range = getDateFilterRange(mode, from, to);
    return docs.filter(doc => {
        // 依頼日（requestedAt: YYYY-MM-DD）で固定フィルタ
        let val = doc.requestedAt || '';
        // YYYYMMDD形式ならISO変換
        if (val && val.length === 8 && !val.includes('-')) {
            val = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`;
        }
        if (range.from && val < range.from) return false;
        if (range.to   && val > range.to)   return false;
        return true;
    });
}

window.handleDateFilterChange = function (mode) {
    window.filterState.dateFilter.mode = mode;
    if (mode !== 'custom') { window.filterState.dateFilter.from = ''; window.filterState.dateFilter.to = ''; }
    saveAdminDateFilter();
    renderDateFilterUI();
    renderDocuments(window.allDocuments);
};

window.handleDateFilterCustomChange = function () {
    const from = document.getElementById('dateFilterFrom');
    const to   = document.getElementById('dateFilterTo');
    window.filterState.dateFilter.from = from ? from.value : '';
    window.filterState.dateFilter.to   = to   ? to.value   : '';
    saveAdminDateFilter();
    renderDocuments(window.allDocuments);
};

// --- 日付フィルタ（依頼日固定・ラベルなし） ---
function renderDateFilterUI() {
    const container = document.getElementById('dateFilterBar');
    if (!container) return;
    const { mode, from, to } = window.filterState.dateFilter;
    const modes = [
        { key: 'today', label: '今日' },
        { key: 'yesterday', label: '昨日' }, { key: 'thisWeek', label: '直近7日間' },
        { key: 'thisMonth', label: '直近30日間' }, { key: 'last3months', label: '直近3ヶ月' }, { key: 'all', label: 'すべて' }, { key: 'custom', label: '期間指定' },
    ];
    container.innerHTML = `
        <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-sm font-medium text-gray-500 flex-shrink-0">依頼日</span>
            ${modes.map(m => `
                <button onclick="window.handleDateFilterChange('${m.key}')"
                    class="px-3 py-1 text-sm rounded-full font-medium transition-colors ${mode === m.key ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                    ${m.label}
                </button>
            `).join('')}
            ${mode === 'custom' ? `
                <input type="date" id="dateFilterFrom" value="${from || ''}"
                    class="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                    onchange="window.handleDateFilterCustomChange()">
                <span class="text-sm text-gray-400">〜</span>
                <input type="date" id="dateFilterTo" value="${to || ''}"
                    class="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                    onchange="window.handleDateFilterCustomChange()">
            ` : ''}
        </div>
    `;
}

// --- ステータスボタンフィルタ（ラベルなし・大きめボタン式） ---
window.handleStatusFilterChange = function (statusKey) {
    // トグル：押したら on/off 切り替え
    if (window.filterState.statusFilters.has(statusKey)) {
        window.filterState.statusFilters.delete(statusKey);
    } else {
        window.filterState.statusFilters.add(statusKey);
    }
    saveAdminStatusFilters();
    renderStatusFilterUI();
    renderDocuments(window.allDocuments);
};

function renderStatusFilterUI() {
    const container = document.getElementById('tabBar');
    if (!container) return;
    const COLOR_MAP = {
        gray:    { on: 'bg-gray-400 text-white border-gray-400 shadow-sm',      off: 'bg-white text-gray-500 border-gray-300 hover:border-gray-500 hover:text-gray-700' },
        slate:   { on: 'bg-slate-800 text-white border-slate-800 shadow-sm',    off: 'bg-white text-slate-700 border-slate-500 hover:border-slate-800 hover:text-slate-900' },
        orange:  { on: 'bg-orange-500 text-white border-orange-500 shadow-sm',  off: 'bg-white text-orange-600 border-orange-300 hover:border-orange-500 hover:text-orange-800' },
        green:   { on: 'bg-green-600 text-white border-green-600 shadow-sm',    off: 'bg-white text-green-700 border-green-300 hover:border-green-600 hover:text-green-900' },
        blue:    { on: 'bg-blue-500 text-white border-blue-500 shadow-sm',      off: 'bg-white text-blue-600 border-blue-400 hover:border-blue-600 hover:text-blue-800' },
        amber:   { on: 'bg-amber-400 text-white border-amber-400 shadow-sm',    off: 'bg-white text-amber-600 border-amber-400 hover:border-amber-600 hover:text-amber-800' },
        red:     { on: 'bg-red-400 text-white border-red-400 shadow-sm',        off: 'bg-white text-red-500 border-red-400 hover:border-red-600 hover:text-red-700' },
    };
    container.innerHTML = `
        <div class="flex flex-wrap items-center gap-2 py-3">
            ${window.STATUS_FILTER_OPTIONS.map(opt => {                const isOn  = window.filterState.statusFilters.has(opt.key);
                const cls   = COLOR_MAP[opt.color] || COLOR_MAP.gray;
                const checkIcon = '<svg class=\"w-4 h-4 flex-shrink-0\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"3\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 13l4 4L19 7\"/></svg>';
                const emptyBox  = '<svg class=\"w-4 h-4 flex-shrink-0 opacity-25\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/></svg>';
                return `
                <button onclick="window.handleStatusFilterChange('${opt.key}')"
                    class="flex items-center gap-2 px-4 py-2 text-base font-bold rounded-xl border-2 transition-all ${isOn ? cls.on : cls.off}">
                    ${isOn ? checkIcon : emptyBox}
                    <span>${opt.label}</span>
                </button>`;
            }).join('')}
            <span class="text-xs text-gray-400 ml-1">未選択 = すべて表示</span>
        </div>
    `;
}

// --- 担当企画フィルタ（プルダウン・大きめ・記憶する） ---
window.handlePlannerFilterChange = function (plannerName) {
    window.filterState.planner = plannerName;
    if (plannerName) {
        localStorage.setItem(PLANNER_FILTER_STORAGE_KEY, plannerName);
    } else {
        localStorage.removeItem(PLANNER_FILTER_STORAGE_KEY);
    }
    renderDocuments(window.allDocuments);
};

function renderPlannerFilterSelect() {
    const selectEl = document.getElementById('plannerFilterSelect');
    if (!selectEl) return;
    const currentValue = window.filterState.planner;
    const activeNames = (window.plannerMasterPlanner || window.plannerMaster.filter(p => (p.role || 'planner') === 'planner')).filter(p => p.active).map(p => p.name);
    const options = ['<option value="">全員</option>'];
    activeNames.forEach(name => {
        const selected = name === currentValue ? 'selected' : '';
        options.push(`<option value="${name}" ${selected}>${name}</option>`);
    });
    selectEl.innerHTML = options.join('');
    selectEl.value = currentValue;
}

// --- タブ ---
// タブのアクセントカラー（accentColor）から、実際のTailwindクラスへのマッピング。
// CDN版Tailwindは実行時にスキャンしてクラスを生成するため、クラス名は文字列として
// 完全な形で記述しておく必要がある（動的な文字列結合だけでは検出されないことがある）。
// タブは廃止。renderStatusFilterUI() が代わりにチェックボックスUIを描画する。
// （後方互換のため renderTabs は renderStatusFilterUI のエイリアスとして残す）
function renderTabs() { renderStatusFilterUI(); }

// v22: 管理画面からのジャンプ機能を、検索窓ベースのシンプルな仕組みに変更。
// 以前は「該当グループを探してスクロール」という処理だったが、タイミングの問題で
// 挙動が不安定になることがあったため、検索窓に依頼番号を入力する方式に変更した。
window.jumpToGroupInActiveTab = function (requestId) {
    requestId = String(requestId).trim();

    // 全フィルタをリセット（対象の依頼書が確実に表示されるように）
    window.filterState.statusFilters.clear();
    window.filterState.dateFilter = { mode: 'all', from: '', to: '' };
    saveAdminDateFilter();
    window.filterState.planner = '';
    localStorage.removeItem(PLANNER_FILTER_STORAGE_KEY);
    renderDateFilterUI();

    // 検索窓に依頼番号を入れて絞り込む
    const searchEl = document.getElementById('searchBar');
    if (searchEl) {
        searchEl.value = requestId;
        updateSearchBarClearBtn();
    }
    renderDocuments(window.allDocuments);
};

// --- メインのレンダリング（グループ表示） ---
function renderDocuments(documents) {
    renderStatusFilterUI();
    renderPlannerFilterSelect();
    const container = document.getElementById('requestList');

    // 再描画前に、開いている依頼グループ・スクロール位置を記憶しておく。
    const openGroupIds = new Set(
        Array.from(container.querySelectorAll('details[data-request-group][open]'))
            .map(el => el.getAttribute('data-request-group'))
    );
    const scrollY = window.scrollY;

    container.innerHTML = '';
    renderDateFilterUI();

    const searchTerm = document.getElementById('searchBar').value.toLowerCase();
    let filteredDocs = documents.filter(doc =>
        doc.requestId.toLowerCase().includes(searchTerm) ||
        (doc.customer && doc.customer.toLowerCase().includes(searchTerm)) ||
        (doc.salesPerson && doc.salesPerson.toLowerCase().includes(searchTerm)) ||
        (doc.designContent && doc.designContent.toLowerCase().includes(searchTerm)) ||
        (doc.planner && doc.planner.toLowerCase().includes(searchTerm)) ||
        (doc.subPlanners && doc.subPlanners.some(name => name.toLowerCase().includes(searchTerm))) ||
        (doc.shippingAddress && doc.shippingAddress.toLowerCase().includes(searchTerm)) ||
        (doc.designType && doc.designType.toLowerCase().includes(searchTerm)) ||
        (doc.memo && doc.memo.toLowerCase().includes(searchTerm)) ||
        (doc.submissionId && doc.submissionId.toLowerCase().includes(searchTerm))
    );

    filteredDocs = applyDateFilter(filteredDocs);

    // 担当者フィルタ（グループ単位で判定）
    if (window.filterState.planner) {
        const target = window.filterState.planner;
        const matchingRequestIds = new Set(
            filteredDocs.filter(d => d.planner === target || (d.subPlanners || []).includes(target)).map(d => d.requestId)
        );
        filteredDocs = filteredDocs.filter(d => matchingRequestIds.has(d.requestId));
    }

    // ステータスチェックボックスフィルタ
    // グループの代表ステータスは「最終枝番（subIdが最大）のステータス」で判定する
    // ※ allDocuments全件から代表ステータスを求める（日付フィルタで枝が除外されても正確に判定）
    if (window.filterState.statusFilters.size > 0) {
        const groupRepStatus = {};
        window.allDocuments.forEach(d => {
            const prev = groupRepStatus[d.requestId];
            if (!prev || Number(d.subId) > Number(prev.subId)) {
                groupRepStatus[d.requestId] = d;
            }
        });
        const matchingRequestIds = new Set(
            Object.values(groupRepStatus).filter(d => {
                const s = d.status || 'pending';
                const normalized = (s === 'submitted') ? 'inSubmission' : s;
                return window.filterState.statusFilters.has(normalized);
            }).map(d => d.requestId)
        );
        filteredDocs = filteredDocs.filter(d => matchingRequestIds.has(d.requestId));
    }

    filteredDocs.sort((a, b) => {
        const order = window.sortState.order === 'asc' ? 1 : -1;
        let comparison = 0;
        switch (window.sortState.key) {
            case 'requestId':
                comparison = (parseInt(a.requestId, 10) || 0) - (parseInt(b.requestId, 10) || 0);
                break;
            case 'requestedAt':
                comparison = (a.requestedAt || '').localeCompare(b.requestedAt || '');
                break;
            case 'deliveryDate':
                comparison = (a.deliveryDate || a.requestDate || '').localeCompare(b.deliveryDate || b.requestDate || '');
                break;
            case 'completedAt':
                comparison = (a.completedAt || '').localeCompare(b.completedAt || '');
                break;
            case 'createdAt':
            default:
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
        }
        if (comparison === 0) {
            comparison = (parseInt(a.requestId, 10) || 0) - (parseInt(b.requestId, 10) || 0);
            if (comparison === 0) comparison = (parseInt(a.subId, 10) || 0) - (parseInt(b.subId, 10) || 0);
        }
        return comparison * order;
    });

    // 「進捗管理」タブは management.html に移管したため、ここでの分岐は不要

    if (filteredDocs.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 mt-8 text-sm">該当する依頼書がありません。</p>';
        window.scrollTo(0, scrollY);
        return;
    }

    const groupedDocs = filteredDocs.reduce((acc, doc) => {
        if (!acc[doc.requestId]) acc[doc.requestId] = [];
        acc[doc.requestId].push(doc);
        return acc;
    }, {});
    const sortedGroupKeys = [...new Set(filteredDocs.map(doc => doc.requestId))];

    sortedGroupKeys.forEach(requestId => {
        const docsInGroup = [...groupedDocs[requestId]].sort((a, b) => Number(b.subId) - Number(a.subId));
        const summaryDoc = docsInGroup[0];

        // 最終枝番（subIdが最大）のステータスをグループ代表とする
        const repDoc = docsInGroup.reduce((prev, cur) =>
            Number(cur.subId) > Number(prev.subId) ? cur : prev, docsInGroup[0]);
        const repStatus = repDoc ? (repDoc.status === 'submitted' ? 'inSubmission' : repDoc.status) : 'pending';

        let statusText, statusColor, dotColor, barColor;
        if (repStatus === 'inSubmission') {
            statusText = '出稿中'; statusColor = 'bg-orange-50 text-orange-700 ring-orange-500/20'; dotColor = 'bg-orange-400'; barColor = 'border-orange-300';
        } else if (repStatus === 'submissionDone') {
            statusText = '出稿済'; statusColor = 'bg-green-50 text-green-700 ring-green-600/20'; dotColor = 'bg-green-400'; barColor = 'border-green-300';
        } else if (repStatus === 'completed') {
            statusText = '完了'; statusColor = 'bg-blue-50 text-blue-700 ring-blue-600/20'; dotColor = 'bg-blue-400'; barColor = 'border-blue-300';
        } else if (repStatus === 'rejected') {
            statusText = '没'; statusColor = 'bg-red-50 text-red-700 ring-red-600/20'; dotColor = 'bg-red-400'; barColor = 'border-red-300';
        } else if (repStatus === 'onHold') {
            statusText = '保留'; statusColor = 'bg-amber-50 text-amber-700 ring-amber-600/20'; dotColor = 'bg-amber-400'; barColor = 'border-amber-300';
        } else {
            statusText = '未完了'; statusColor = 'bg-gray-50 text-gray-500 ring-gray-400/20'; dotColor = 'bg-gray-300'; barColor = 'border-gray-300';
        }

        // 担当者フィルタ中、グループ内に「フィルタ対象者が過去に担当した枝」と「未割り当ての枝」の両方が
        // 混在している場合は、紫枠にして「これは自分の未完了分ではなく、未割り当てが混じっているだけ」と分かるようにする。
        // （管理画面の未割り当てボックスと同じ紫を敢えて使い、未割り当て絡みであることを直感的に紐付けるため）
        if (window.filterState.planner) {
            const target = window.filterState.planner;
            const hasOwnPastAssignment = docsInGroup.some(d => d.planner === target || (d.subPlanners || []).includes(target));
            const hasUnassignedBranch = docsInGroup.some(d => !d.planner && (!d.subPlanners || d.subPlanners.length === 0));
            if (hasOwnPastAssignment && hasUnassignedBranch) {
                barColor = 'border-violet-400';
            }
        }

        const groupContainer = document.createElement('details');
        groupContainer.className = `group bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${barColor} mb-2 transition-all duration-300`;
        groupContainer.setAttribute('data-request-group', String(requestId).trim());
        if (openGroupIds.has(requestId)) {
            groupContainer.open = true;
        }

        const plannerNamesInGroup = [...new Set(docsInGroup.map(d => d.planner).filter(Boolean))];
        const plannerLabel = plannerNamesInGroup.length > 0 ? plannerNamesInGroup.join('・') : '未割り当て';

        let dateFlow = `仕上げ希望：${formatIsoDate(summaryDoc.deliveryDate) || formatDate(summaryDoc.requestDate) || '—'}`;
        if (summaryDoc.requestedAt) {
            dateFlow += ` ／ 依頼日：${formatIsoDate(summaryDoc.requestedAt)}`;
        }
        if (repStatus === 'inSubmission' || repStatus === 'submissionDone') {
            const latestSubmittedAt = docsInGroup.map(d => d.submittedAt).filter(Boolean).sort().pop();
            if (latestSubmittedAt) {
                dateFlow += ` → ${formatIsoDate(latestSubmittedAt)} 出稿`;
                const submittedByNames = [...new Set(docsInGroup.map(d => d.submittedBy).filter(Boolean))];
                if (submittedByNames.length > 0) dateFlow += `：${submittedByNames.join('・')}`;
            }
        } else if (repStatus === 'completed') {
            const latestCompletedAt = docsInGroup.map(d => d.completedAt).filter(Boolean).sort().pop();
            if (latestCompletedAt) dateFlow += ` → ${formatIsoDate(latestCompletedAt)} 完了`;
        }

        // v22: グループ全体の受注番号入力欄・出稿トグル・没ボタン
        // 受注番号は「出稿中/出稿済のいずれかの枝」に入っているものを代表値として表示する
        const submissionIdRepDoc = docsInGroup.find(d => d.status === 'inSubmission' || d.status === 'submitted' || d.status === 'submissionDone');
        const currentSubmissionId = submissionIdRepDoc ? (submissionIdRepDoc.submissionId || '') : '';
        const groupSubmissionRowHtml = `
        <span class="flex items-center gap-1.5 flex-shrink-0" onclick="event.preventDefault(); event.stopPropagation();">
            <input type="text" value="${currentSubmissionId}" placeholder="受注番号（未出稿）"
                onchange="window.updateGroupSubmissionId('${requestId}', this.value)"
                class="w-28 p-1 border border-gray-300 rounded-lg text-xs" title="この依頼番号のすべての枝が一括で出稿中/完了になります">
            ${(repStatus === 'inSubmission' || repStatus === 'submissionDone') ? `
            <button onclick="window.toggleGroupSubmissionDone('${requestId}', ${repStatus === 'inSubmission'})"
                class="text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors flex-shrink-0 ${repStatus === 'submissionDone' ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600' : 'bg-green-600 text-white border-green-600 hover:bg-green-700'}">
                ${repStatus === 'submissionDone' ? '出稿中に戻す' : '出稿済にする'}
            </button>` : ''}
            <button onclick="window.rejectGroup('${requestId}')"
                class="text-xs font-semibold px-2.5 py-1 rounded-full border border-red-300 bg-white text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                没にする
            </button>
        </span>`;

        const hasMemoInGroup = docsInGroup.some(d => d.memo && d.memo.trim());
        const memoIconHtml = hasMemoInGroup
            ? `<svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" title="メモがあります">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/>
               </svg>`
            : '';

        const summaryHtml = `
        <summary class="flex flex-col gap-1.5 p-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl">
        <div class="flex items-center justify-between w-full flex-wrap gap-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
        <span class="flex items-center gap-1.5 text-base font-bold text-gray-800 flex-shrink-0">
          <span class="w-2 h-2 rounded-full ${dotColor}"></span>
          ${requestId}
          ${memoIconHtml}
        </span>
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${statusColor} flex-shrink-0">
        ${statusText}
        </span>
        <span class="text-base font-bold text-gray-800 flex-shrink-0">${docsInGroup.length}件</span>
        <span class="text-gray-300 flex-shrink-0">｜</span>
        ${groupSubmissionRowHtml}
        </div>
        <svg class="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        </div>
        <div class="flex items-center space-x-2 text-sm text-gray-600 pl-0.5">
        <span class="flex-shrink-0">${dateFlow}</span>
        <span class="text-gray-300">|</span>
        <span>${truncateString(summaryDoc.customer, 30)}</span>
        <span class="text-gray-300">|</span>
        <span>${truncateString(summaryDoc.designType, 20)}</span>
        <span class="text-gray-300">|</span>
        <span>${truncateString(summaryDoc.salesPerson, 12)}</span>
        <span class="text-gray-300">|</span>
        <span class="font-medium ${plannerNamesInGroup.length > 0 ? 'text-slate-700' : 'text-gray-400'}">${plannerLabel}</span>
        </div>
        </summary>`;

        groupContainer.innerHTML = summaryHtml + `
        <div class="px-3 pb-3 mt-1 border-t border-gray-100 space-y-2">
        ${docsInGroup.map(docData => {
            let docStatusText, docDotColor, docBarColor;
            switch (docData.status) {
                case 'submitted': docStatusText = '出稿中'; docDotColor = 'bg-orange-400'; docBarColor = 'border-orange-300'; break;
                case 'inSubmission': docStatusText = '出稿中'; docDotColor = 'bg-orange-400'; docBarColor = 'border-orange-300'; break;
                case 'submissionDone': docStatusText = '出稿済'; docDotColor = 'bg-green-400'; docBarColor = 'border-green-300'; break;
                case 'completed': docStatusText = '完了'; docDotColor = 'bg-blue-400'; docBarColor = 'border-blue-300'; break;
                case 'rejected': docStatusText = '没'; docDotColor = 'bg-red-400'; docBarColor = 'border-red-300'; break;
                case 'onHold': docStatusText = '保留'; docDotColor = 'bg-amber-400'; docBarColor = 'border-amber-300'; break;
                default: docStatusText = '未完了'; docDotColor = 'bg-gray-300'; docBarColor = 'border-gray-200';
            }
            const fullRequestId = `${docData.requestId}${docData.subId === '0' ? '' : `-${docData.subId}`}`;
            const compImages = docData.compImages || [];
            const compImagesHtml = compImages.map(img => {
                const isPdfComp = img.url.toLowerCase().endsWith('.pdf');
                const thumbHtml = isPdfComp
                    ? `<div class="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer bg-red-50 flex flex-col items-center justify-center" onclick="window.openImagePreview('${img.url}', 'pdf', '${img.id}')">
                         <svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6"/></svg>
                         <span class="text-[8px] text-red-400 font-bold">PDF</span>
                       </div>`
                    : `<img src="${img.url}" class="w-12 h-12 object-cover rounded-lg border border-gray-200 cursor-pointer" onclick="window.openImagePreview('${img.url}', null, '${img.id}')">`;
                return `
                <div class="relative group/img">
                    ${thumbHtml}
                    <button onmouseenter="window.showHoverPreview('${img.url}', this${isPdfComp ? ", 'pdf'" : ''})" onmouseleave="window.hideHoverPreview()" onclick="window.openImagePreview('${img.url}', ${isPdfComp ? "'pdf'" : 'null'}, '${img.id}')"
                        class="absolute bottom-0.5 right-0.5 bg-slate-700/90 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="M21 21l-4.35-4.35" /></svg>
                    </button>
                    <button onclick="window.deleteCompImage('${docData.id}', '${img.id}')" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] leading-4 text-center opacity-0 group-hover/img:opacity-100 transition-opacity">&times;</button>
                </div>`;
            }).join('');
            const attachments = docData.attachments || [];
            const attachmentsHtml = attachments.map(att => {
                if (att.fileType === 'image') {
                    return `
                    <div class="relative group/att">
                        <img src="${att.url}" class="w-12 h-12 object-cover rounded-lg border border-gray-200 cursor-pointer" onclick="window.openImagePreview('${att.url}', null, null, '${att.id}')" title="${att.fileName}">
                        <button onmouseenter="window.showHoverPreview('${att.url}', this)" onmouseleave="window.hideHoverPreview()" onclick="window.openImagePreview('${att.url}', null, null, '${att.id}')"
                            class="absolute bottom-0.5 right-0.5 bg-slate-700/90 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity">
                            <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="M21 21l-4.35-4.35" /></svg>
                        </button>
                        <button onclick="window.deleteAttachment('${docData.id}', '${att.id}')" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] leading-4 text-center opacity-0 group-hover/att:opacity-100 transition-opacity">&times;</button>
                    </div>`;
                }
                if (att.fileType === 'pdf') {
                    return `
                    <div class="relative group/att">
                        <button onclick="window.openImagePreview('${att.url}', 'pdf', null, '${att.id}')"
                            onmouseenter="window.showHoverPreview('${att.url}', this, 'pdf')" onmouseleave="window.hideHoverPreview()"
                            class="w-12 h-12 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-red-50 text-red-500 hover:bg-red-100" title="${att.fileName}">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            <span class="text-[9px]">PDF</span>
                        </button>
                        <button onclick="window.deleteAttachment('${docData.id}', '${att.id}')" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] leading-4 text-center opacity-0 group-hover/att:opacity-100 transition-opacity">&times;</button>
                    </div>`;
                }
                return `
                <div class="relative group/att">
                    <a href="/api/attachments/${att.id}/download" class="w-12 h-12 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" title="${att.fileName}">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-4-4m-8 4l4-4" /></svg>
                        <span class="text-[9px]">ZIP</span>
                    </a>
                    <button onclick="window.deleteAttachment('${docData.id}', '${att.id}')" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] leading-4 text-center opacity-0 group-hover/att:opacity-100 transition-opacity">&times;</button>
                </div>`;
            }).join('');

            return `
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200 border-l-4 ${docBarColor}">
            <div class="flex items-start justify-between mb-1.5">
            <h4 class="text-sm font-semibold text-gray-800 leading-tight">
            <span class="text-gray-700 font-semibold text-sm">${fullRequestId}</span> ${docData.designContent}
            </h4>
            ${(docData.status === 'inSubmission' || docData.status === 'submissionDone') ? `
            <span class="flex items-center gap-1.5 text-xs font-medium ${docData.status === 'submissionDone' ? 'text-green-700' : 'text-orange-700'} flex-shrink-0 px-1.5 py-0.5" title="出稿の操作はグループ上部（依頼番号の隣）でまとめて行ってください">
              <span class="w-1.5 h-1.5 rounded-full ${docDotColor}"></span>${docData.status === 'submissionDone' ? '出稿済' : '出稿中'}
            </span>
            ` : `
            <select class="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-1.5 py-0.5 bg-white flex-shrink-0"
              onchange="window.changeDocStatus('${docData.id}', this.value)">
              ${Object.entries(window.MANUAL_STATUS_LABELS).map(([value, label]) =>
                  `<option value="${value}" ${value === (docData.status || 'pending') ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
            `}
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2">
            <p><span class="text-gray-400">仕上げ希望日:</span> ${formatIsoDate(docData.deliveryDate) || formatDate(docData.requestDate)}</p>
            <p><span class="text-gray-400">依頼日:</span> ${formatIsoDate(docData.requestedAt) || '—'}</p>
            <p><span class="text-gray-400">得意先:</span> ${docData.customer}</p>
            <p><span class="text-gray-400">直送先:</span> ${docData.shippingAddress || '—'}</p>
            <p><span class="text-gray-400">担当営業:</span> ${docData.salesPerson}</p>
            <p class="col-span-2"><span class="text-gray-400">種別:</span> ${docData.designType}</p>
            ${docData.completedAt ? `<p><span class="text-gray-400">完了日:</span> ${formatIsoDate(docData.completedAt)}</p>` : ''}
            ${docData.submittedAt ? `<p><span class="text-gray-400">出稿日:</span> ${formatIsoDate(docData.submittedAt)}</p>` : ''}
            </div>

            <div class="pt-2 border-t border-gray-200 flex items-center gap-2">
            ${docData.pdfUrl ? `
                <button onclick="window.openImagePreview('${docData.pdfUrl}', 'pdf')"
                    onmouseenter="window.showHoverPreview('${docData.pdfUrl}', this, 'pdf')" onmouseleave="window.hideHoverPreview()"
                    class="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="M21 21l-4.35-4.35" /></svg>
                    依頼書PDFを見る
                </button>
                <a href="${docData.pdfUrl}" target="_blank" rel="noopener" class="text-xs text-gray-400 hover:text-gray-600 hover:underline">別ウィンドウで開く</a>
            ` : `<span class="text-xs text-gray-400">依頼書PDFは保存されていません</span>`}
            </div>

            <div class="pt-2 mt-2 border-t border-gray-200">
            <label class="text-xs font-semibold text-gray-600 block mb-1">別紙（参考資料・手書きメモ）<span class="text-gray-400">画像orPDForZIP・複数可・ドラッグ&ドロップ可</span></label>
            <p class="text-[10px] text-gray-400 mb-1">対応形式：jpg・png・gif等の画像、PDF、zip。PDFはそのままの形式で保存されます。</p>
            <div class="flex flex-wrap items-center gap-2">
            ${attachmentsHtml}
            </div>
            <label id="att-drop-${docData.id}" class="mt-1.5 flex items-center justify-center gap-1.5 h-12 w-full border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-xs cursor-pointer hover:border-slate-400 hover:text-slate-500 hover:bg-gray-50 transition-colors"
                ondragover="event.preventDefault(); event.stopPropagation(); this.classList.add('border-slate-500','bg-slate-50');"
                ondragleave="event.preventDefault(); event.stopPropagation(); this.classList.remove('border-slate-500','bg-slate-50');"
                ondrop="event.preventDefault(); event.stopPropagation(); this.classList.remove('border-slate-500','bg-slate-50'); if(event.dataTransfer.files.length){window.uploadAttachment('${docData.id}', event.dataTransfer.files, '企画');}">
                <span class="text-lg leading-none">+</span> ここに別紙をドラッグ&ドロップ、またはクリックして選択
                <input type="file" accept="image/*,.zip,application/zip,.pdf,application/pdf" multiple class="hidden" onchange="if(this.files.length){window.uploadAttachment('${docData.id}', this.files, '企画'); this.value='';}">
            </label>
            </div>

            <div class="pt-2 mt-2 border-t border-gray-200">
            <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-semibold text-gray-600">★ 完成カンプ画像（複数可・ドラッグ&ドロップ可）</label>
                ${compImages.length > 0 ? `<button onclick="window.downloadAllCompImages('${docData.id}')" class="text-xs text-blue-600 hover:underline">⬇ ${compImages.length}枚をzipでダウンロード</button>` : ''}
            </div>
            <p class="text-[10px] text-gray-400 mb-1">対応形式：画像（jpg/png等）・PDF。容量の大きいPDF・zipはサーバー負荷軽減のため定期的に削除を行います。</p>
            <div class="flex flex-wrap items-center gap-2">
            ${compImagesHtml}
            </div>
            <label id="comp-drop-${docData.id}" class="mt-1.5 flex items-center justify-center gap-1.5 h-16 w-full border-2 border-dashed border-slate-400 bg-slate-50 rounded-lg text-slate-500 text-sm font-medium cursor-pointer hover:border-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                ondragover="event.preventDefault(); event.stopPropagation(); this.classList.add('border-slate-700','bg-slate-100');"
                ondragleave="event.preventDefault(); event.stopPropagation(); this.classList.remove('border-slate-700','bg-slate-100');"
                ondrop="event.preventDefault(); event.stopPropagation(); this.classList.remove('border-slate-700','bg-slate-100'); if(event.dataTransfer.files.length){window.uploadCompImage('${docData.id}', event.dataTransfer.files);}">
                <span class="text-xl leading-none">+</span> ここにカンプ画像をドラッグ&ドロップ、またはクリックして選択
                <input type="file" accept="image/*,.pdf,application/pdf" multiple class="hidden" onchange="if(this.files.length){window.uploadCompImage('${docData.id}', this.files); this.value='';}">
            </label>
            </div>

            <div class="pt-2 mt-2 border-t border-gray-200 grid grid-cols-2 gap-2">
            <div class="col-span-2">
            <label class="text-xs font-semibold text-gray-600 block mb-0.5">担当企画（メイン）</label>
            <select class="w-full p-1.5 border border-gray-300 rounded-lg text-xs bg-white"
            onchange="window.updatePlanner('${docData.id}', this.value)">
            ${buildPlannerOptions(docData.planner || '')}
            </select>
            </div>
            ${docData.submissionId ? `
            <div class="col-span-2">
            <label class="text-xs font-semibold text-gray-600 block mb-0.5">出稿担当者<span class="text-gray-400">（サブ担当・代理対応の場合に変更）</span></label>
            <select class="w-full p-1.5 border border-gray-300 rounded-lg text-xs bg-white"
            onchange="window.updateSubmittedBy('${docData.id}', this.value)">
            ${buildPlannerOptions(docData.submittedBy || docData.planner || '')}
            </select>
            </div>
            ` : ''}
            </div>

            <div class="pt-2 mt-2 border-t border-gray-200">
            <label class="text-xs font-semibold text-gray-600 block mb-1">サブ担当（複数人・代理の場合記入）</label>
            <p class="text-[10px] text-gray-400 mb-1">※自分の担当分が完了したら、名前の左のチェックボックスにチェックを入れてください。管理画面の未完了件数の集計から外れます。</p>
            <div class="flex flex-wrap items-center gap-1.5">
            ${(docData.subPlanners || []).map(name => {
                const isCompleted = (docData.subPlannersCompleted || []).includes(name);
                return `
                <span class="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors ${isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-slate-100 text-slate-700'}">
                    <label class="flex items-center gap-1 cursor-pointer select-none" title="自分の担当分が完了したらチェックしてください（未完了件数の集計から外れます）">
                        <input type="checkbox" class="rounded w-3 h-3" ${isCompleted ? 'checked' : ''}
                            onchange="window.toggleSubPlannerCompleted('${docData.id}', '${name}', this.checked)">
                        <span class="${isCompleted ? 'line-through' : ''}">${name}</span>
                    </label>
                    <button onclick="window.removeSubPlanner('${docData.id}', '${name}')" class="text-slate-400 hover:text-red-600 leading-none">&times;</button>
                </span>
            `;
            }).join('')}
            <select class="text-xs border border-gray-300 rounded-lg px-1.5 py-0.5 bg-white text-gray-500"
                onchange="if(this.value){window.addSubPlanner('${docData.id}', this.value); this.value='';}">
                ${buildAddableSubPlannerOptions(docData.planner, docData.subPlanners)}
            </select>
            </div>
            </div>

            <div class="pt-2 mt-2 border-t border-gray-200">
            <label class="text-xs font-semibold text-gray-600 block mb-1">メモ</label>
            <textarea rows="2" placeholder="自由記入欄（詳細や補足など、なんでも自由にご記入ください）"
                onchange="window.updateDocMemo('${docData.id}', this.value)"
                class="w-full p-1.5 border rounded-lg text-xs resize-none ${(docData.memo && docData.memo.trim()) ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}">${docData.memo || ''}</textarea>
            </div>

            <div class="mt-2 flex justify-end">
            <button class="px-2 py-1 text-gray-400 hover:text-red-600 text-xs font-medium transition-colors"
            onclick="window.deleteDocument('${docData.id}')">依頼書を削除</button>
            </div>
            </div>
            `;
        }).join('')}
        </div>`;
        container.appendChild(groupContainer);
    });

    // 開閉状態の復元によって高さが変わるため、再描画後に元のスクロール位置へ戻す
    window.scrollTo(0, scrollY);
}

async function loadRequestDocuments() {
    try {
        const data = await apiJson('/api/documents');
        window.allDocuments = data.documents || [];
        renderDocuments(window.allDocuments);
    } catch (error) { console.error('Error getting documents:', error); }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 保存済みの並び順をselectに反映
    const sortKeyEl   = document.getElementById('sortKey');
    const sortOrderEl = document.getElementById('sortOrder');
    if (sortKeyEl)   sortKeyEl.value   = window.sortState.key;
    if (sortOrderEl) sortOrderEl.value = window.sortState.order;

    await loadRequestDocuments();
    loadPlannerMaster();

    document.getElementById('searchBar').addEventListener('input', () => { renderDocuments(window.allDocuments); updateSearchBarClearBtn(); });
    updateSearchBarClearBtn();
    document.getElementById('sortKey').addEventListener('change', () => {
        window.sortState.key = document.getElementById('sortKey').value;
        window.sortState.order = document.getElementById('sortOrder').value;
        saveAdminSortState();
        renderDocuments(window.allDocuments);
    });
    document.getElementById('sortOrder').addEventListener('change', () => {
        window.sortState.key = document.getElementById('sortKey').value;
        window.sortState.order = document.getElementById('sortOrder').value;
        saveAdminSortState();
        renderDocuments(window.allDocuments);
    });

    // management.html の依頼書カードから「依頼番号」をクリックして開いた場合、
    // URLパラメータ（?jumpTo=依頼番号）を見て、該当グループを自動的に開いてスクロールする。
    const urlParams = new URLSearchParams(window.location.search);
    const jumpTo = urlParams.get('jumpTo');
    if (jumpTo) {
        window.jumpToGroupInActiveTab(jumpTo);
    }
});