'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function TestConversationPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [emotion, setEmotion] = useState('');
  const [emotionReason, setEmotionReason] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [patientName, setPatientName] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedPatientId = localStorage.getItem('patientId');
    const savedToken = localStorage.getItem('token');
    const savedName = localStorage.getItem('patientName');

    if (savedPatientId && savedToken) {
      setPatientId(savedPatientId);
      setToken(savedToken);
      setPatientName(savedName || '');
      addLog('認証情報を読み込みました');
    } else {
      addLog('認証情報が見つかりません。ログインページに移動してください');
    }
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleLogout = () => {
    localStorage.removeItem('patientId');
    localStorage.removeItem('token');
    localStorage.removeItem('patientName');
    router.push('/login');
  };

  const startSession = async () => {
    if (!patientId || !token) {
      alert('Patient IDとTokenを入力してください');
      return;
    }

    try {
      addLog('セッション開始リクエスト送信中...');
      const response = await fetch(`${API_BASE_URL}/conversation/start/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ patient_id: patientId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }

      const data = await response.json();
      setSessionId(data.session_id);
      addLog(`セッション開始: ${data.session_id}`);
      alert(`セッション開始成功！\nSession ID: ${data.session_id}`);
    } catch (error) {
      addLog(`エラー: ${error}`);
      alert(`セッション開始失敗: ${error}`);
    }
  };

  const startRecording = async () => {
    if (!sessionId) {
      alert('先にセッションを開始してください');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      addLog('録音開始');
    } catch (error) {
      addLog(`録音開始エラー: ${error}`);
      alert(`マイクへのアクセスが許可されませんでした: ${error}`);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    addLog('録音停止');

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      addLog(`音声データサイズ: ${audioBlob.size} bytes`);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendAudioToBackend(base64Audio);
      };

      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    };
  };

  const sendAudioToBackend = async (base64Audio: string) => {
    if (!sessionId || !token) return;

    try {
      addLog('STT処理リクエスト送信中...');
      const response = await fetch(`${API_BASE_URL}/conversation/session/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          audio_data: base64Audio,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }

      const data = await response.json();
      setTranscribedText(data.transcribed_text);
      setAccumulatedText(data.accumulated_text);
      addLog(`STT結果: ${data.transcribed_text} (信頼度: ${data.confidence})`);
    } catch (error) {
      addLog(`STT処理エラー: ${error}`);
      alert(`音声認識失敗: ${error}`);
    }
  };

  const endSession = async () => {
    if (!sessionId || !token) {
      alert('先にセッションを開始してください');
      return;
    }

    try {
      addLog('セッション終了リクエスト送信中...');
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/end/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error));
      }

      const data = await response.json();
      setAiResponse(data.ai_response_text);
      setEmotion(data.emotion.name_ja || data.emotion.name);
      setEmotionReason(data.emotion_reason);
      addLog(`AI応答: ${data.ai_response_text}`);
      addLog(`感情: ${data.emotion.name_ja} (${data.emotion.name})`);
      addLog(`理由: ${data.emotion_reason}`);

      // Play AI audio response automatically
      if (data.ai_audio_base64 && data.ai_audio_base64.length > 0) {
        addLog(`音声データ受信: ${data.ai_audio_base64.length} bytes (base64)`);
        const audioBlob = base64ToBlob(data.ai_audio_base64, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().then(() => {
            addLog('AI音声を自動再生中...');
          }).catch((err) => {
            addLog(`音声再生エラー: ${err.message}`);
            console.error('Audio play error:', err);
          });
        }
      } else {
        addLog('警告: 音声データが空です');
      }

      // セッションIDをクリア（新しいセッション開始を可能にする）
      setSessionId('');
      addLog('セッション終了完了。新しいセッションを開始できます。');
    } catch (error) {
      addLog(`セッション終了エラー: ${error}`);
      alert(`セッション終了失敗: ${error}`);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const clearAll = () => {
    setSessionId('');
    setTranscribedText('');
    setAccumulatedText('');
    setAiResponse('');
    setEmotion('');
    setEmotionReason('');
    addLog('結果をクリアしました');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">会話管理API テスト</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            ログアウト
          </button>
        </div>

        {patientName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              <strong>ログイン中:</strong> {patientName}
            </p>
          </div>
        )}

        {!token && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 mb-2">
              <strong>認証が必要です</strong>
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              ログインページへ
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient ID (UUID)
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="例: 123e4567-e89b-12d3-a456-426614174000"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                認証Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                placeholder="ログイン後に自動設定"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">操作</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={startSession}
              disabled={!patientId || !token}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              1. セッション開始
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!sessionId}
              className={`${
                isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              } text-white px-4 py-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed`}
            >
              {isRecording ? '3. 録音停止 (STT実行)' : '2. 録音開始'}
            </button>
            <button
              onClick={endSession}
              disabled={!sessionId || !accumulatedText}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              4. セッション終了 (LLM解析)
            </button>
            <button
              onClick={clearAll}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              クリア
            </button>
          </div>
        </div>

        {sessionId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">セッション情報</h2>
            <p className="text-sm text-gray-600 break-all">
              <strong>Session ID:</strong> {sessionId}
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">結果</h2>
          
          {transcribedText && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">最後のSTT結果:</h3>
              <p className="bg-gray-50 p-3 rounded border text-gray-900">{transcribedText}</p>
            </div>
          )}

          {accumulatedText && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">累積テキスト:</h3>
              <p className="bg-gray-50 p-3 rounded border text-gray-900">{accumulatedText}</p>
            </div>
          )}

          {aiResponse && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">AI応答:</h3>
              <p className="bg-blue-50 p-3 rounded border border-blue-200 text-gray-900">{aiResponse}</p>
              <audio ref={audioRef} controls className="w-full mt-2" />
            </div>
          )}

          {emotion && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">検出された感情:</h3>
              <p className="bg-yellow-50 p-3 rounded border border-yellow-200 text-gray-900">
                <strong>{emotion}</strong>
              </p>
            </div>
          )}

          {emotionReason && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">感情選定理由:</h3>
              <p className="bg-gray-50 p-3 rounded border text-gray-900">{emotionReason}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">ログ</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">ログはまだありません</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">使用方法:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>認証情報が自動で読み込まれます</li>
            <li>「セッション開始」ボタンをクリック</li>
            <li>「録音開始」ボタンをクリックして話す</li>
            <li>「録音停止」ボタンをクリックしてSTT処理を実行</li>
            <li>必要に応じて3-4を繰り返す</li>
            <li>「セッション終了」ボタンをクリックしてLLM解析とTTS生成を実行</li>
            <li>AI応答と感情分析結果を確認</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>注意:</strong> ログインしていない場合は、
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-800 underline mx-1"
              >
                ログインページ
              </button>
              から認証してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
