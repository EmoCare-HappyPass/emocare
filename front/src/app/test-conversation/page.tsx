'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

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
  const [wsConnected, setWsConnected] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Load from localStorage and setup WebSocket on mount
  useEffect(() => {
    const savedPatientId = localStorage.getItem('patientId');
    const savedToken = localStorage.getItem('token');
    const savedName = localStorage.getItem('patientName');

    if (savedPatientId && savedToken) {
      setPatientId(savedPatientId);
      setToken(savedToken);
      setPatientName(savedName || '');
      addLog('認証情報を読み込みました');

      // Setup WebSocket connection
      setupWebSocket();
    } else {
      addLog('認証情報が見つかりません。ログインページに移動してください');
    }

    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const setupWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/conversation/`);

      ws.onopen = () => {
        addLog('WebSocket接続が確立されました');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        addLog(`WebSocketエラー: ${error}`);
        setWsConnected(false);
      };

      ws.onclose = () => {
        addLog('WebSocket接続が切断されました');
        setWsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      addLog(`WebSocket接続エラー: ${error}`);
    }
  };

  const handleWebSocketMessage = (data: string) => {
    try {
      const message = JSON.parse(data);
      const messageType = message.type;

      addLog(`WebSocketメッセージ受信: ${messageType}`);

      switch (messageType) {
        case 'connection_established':
          addLog(message.message);
          break;

        case 'session_started':
          setSessionId(message.session_id);
          addLog(`セッション開始: ${message.session_id}`);
          // 自動的に録音を開始
          setTimeout(() => {
            startRecordingInternal(message.session_id);
          }, 100);
          break;

        case 'audio_processed':
          setTranscribedText(message.transcribed_text);
          setAccumulatedText(message.accumulated_text);
          addLog(`STT結果: ${message.transcribed_text} (信頼度: ${message.confidence})`);
          break;

        case 'session_ended':
          console.log('session_ended message received:', message);
          setAiResponse(message.ai_response_text);
          setEmotion(message.emotion.name_ja || message.emotion.name);
          setEmotionReason(message.emotion_reason);
          addLog(`AI応答: ${message.ai_response_text}`);
          addLog(`感情: ${message.emotion.name_ja} (${message.emotion.name})`);
          addLog(`理由: ${message.emotion_reason}`);

          // Play AI audio response automatically
          console.log('Checking audio data...', {
            hasAudioData: !!message.ai_audio_base64,
            audioLength: message.ai_audio_base64?.length || 0,
            audioRefExists: !!audioRef.current
          });

          if (message.ai_audio_base64 && message.ai_audio_base64.length > 0) {
            addLog(`音声データ受信: ${message.ai_audio_base64.length} 文字 (base64)`);

            try {
              const audioBlob = base64ToBlob(message.ai_audio_base64, 'audio/mpeg');
              console.log('Audio blob created:', audioBlob.size, 'bytes');
              addLog(`音声Blob作成完了: ${audioBlob.size} bytes`);

              const audioUrl = URL.createObjectURL(audioBlob);
              console.log('Audio URL created:', audioUrl);

              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                addLog('音声ソース設定完了、再生開始...');

                audioRef.current.play().then(() => {
                  addLog('✓ AI音声を自動再生中...');
                }).catch((err) => {
                  addLog(`✗ 音声再生エラー: ${err.message}`);
                  console.error('Audio play error:', err);
                });
              } else {
                addLog('✗ エラー: audioRef.currentがnullです');
              }
            } catch (error) {
              addLog(`✗ 音声処理エラー: ${error}`);
              console.error('Audio processing error:', error);
            }
          } else {
            addLog('✗ 警告: 音声データが空です');
            console.log('Audio data is empty or missing');
          }

          // Clear session ID
          setSessionId('');
          addLog('セッション終了完了。新しいセッションを開始できます。');
          break;

        case 'error':
          addLog(`エラー: ${message.message}`);
          alert(`エラー: ${message.message}`);
          break;

        default:
          addLog(`未知のメッセージタイプ: ${messageType}`);
      }
    } catch (error) {
      addLog(`メッセージ処理エラー: ${error}`);
    }
  };

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

    if (!wsConnected || !wsRef.current) {
      alert('WebSocket接続がありません。ページをリロードしてください。');
      return;
    }

    try {
      addLog('セッション開始リクエスト送信中...');

      // Send WebSocket message to start session
      wsRef.current.send(JSON.stringify({
        type: 'start_session',
        patient_id: patientId
      }));

      // Recording will be started automatically after receiving session_started message

    } catch (error) {
      addLog(`エラー: ${error}`);
      alert(`セッション開始失敗: ${error}`);
    }
  };

  const startRecordingInternal = async (sessionIdParam?: string) => {
    const currentSessionId = sessionIdParam || sessionId;
    if (!currentSessionId) {
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
    if (!sessionId) return;

    if (!wsConnected || !wsRef.current) {
      addLog('WebSocket接続がありません');
      return;
    }

    try {
      addLog('STT処理リクエスト送信中...');

      // Send WebSocket message to process audio
      wsRef.current.send(JSON.stringify({
        type: 'process_audio',
        session_id: sessionId,
        audio_data: base64Audio
      }));

    } catch (error) {
      addLog(`STT処理エラー: ${error}`);
      alert(`音声認識失敗: ${error}`);
    }
  };

  const endSession = async () => {
    if (!sessionId) {
      alert('先にセッションを開始してください');
      return;
    }

    if (!wsConnected || !wsRef.current) {
      alert('WebSocket接続がありません');
      return;
    }

    // 録音中の場合は停止して、音声データを送信
    if (isRecording && mediaRecorderRef.current) {
      addLog('録音を停止しています...');
      stopRecording();
      // 録音停止処理とSTT処理が完了するまで待つ
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      addLog('セッション終了リクエスト送信中...');

      // Send WebSocket message to end session
      wsRef.current.send(JSON.stringify({
        type: 'end_session',
        session_id: sessionId
      }));

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
              disabled={!patientId || !token || !!sessionId}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sessionId ? '録音中...' : '1. セッション開始（自動録音）'}
            </button>
            <button
              onClick={endSession}
              disabled={!sessionId}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              3. セッション終了 (LLM解析)
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
            <li>「セッション開始（録音開始）」ボタンをクリック - 自動的に録音が開始されます</li>
            <li>話したいことを話す</li>
            <li>「録音停止」ボタンをクリックしてSTT処理を実行（必要に応じて録音再開も可能）</li>
            <li>「セッション終了」ボタンをクリックしてLLM解析とTTS生成を実行</li>
            <li>AI応答と感情分析結果を確認、音声が自動再生されます</li>
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
