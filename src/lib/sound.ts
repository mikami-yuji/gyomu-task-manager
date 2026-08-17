/**
 * Web Audio API を使用した優しい通知チャイム音の再生ユーティリティ
 * 外部音声ファイルへの依存がなく、オフラインや制限環境でも確実に動作します
 */

export const playChimeNotification = (): void => {
  // ブラウザの AudioContext を安全に取得
  if (typeof window === 'undefined') return;

  try {
    // ミュート設定の確認
    const isMuted = localStorage.getItem('gyomu_sound_muted') === 'true';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    // ユーザー操作前で suspended の場合は再開
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // 優しい「ポ・ロン♪」の和音（C5 = 523.25Hz -> E5 = 659.25Hz -> C6 = 1046.5Hz）
    const notes = [
      { freq: 523.25, time: 0.00, duration: 0.35, gain: 0.15 },
      { freq: 659.25, time: 0.10, duration: 0.35, gain: 0.15 },
      { freq: 1046.50, time: 0.22, duration: 0.60, gain: 0.20 },
    ];

    notes.forEach(note => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine'; // 優しい丸みのあるサイン波
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      // 音量エンベロープ（滑らかなアタックと自然な減衰）
      gainNode.gain.setValueAtTime(0.0001, now + note.time);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, now + note.time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration + 0.05);
    });
  } catch (err) {
    console.warn('チャイム音再生エラー (ブラウザポリシーによる制限等):', err);
  }
};
