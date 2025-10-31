import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          EmoCare
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI感情可視化・共感ケア支援システム
        </p>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            ようこそ
          </h2>
          <p className="text-gray-600 mb-6">
            患者の感情を可視化し、適切なケアを提供するためのシステムです。<br />
            音声で会話し、AIが共感的に応答します。
          </p>
          
          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              ログイン / 新規登録
            </Link>
            
            <Link
              href="/test-conversation"
              className="block w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              会話テストページ
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">🎤</div>
            <h3 className="font-semibold text-gray-800 mb-2">音声会話</h3>
            <p className="text-sm text-gray-600">
              音声で自然に話しかけることができます
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-semibold text-gray-800 mb-2">AI応答</h3>
            <p className="text-sm text-gray-600">
              共感的で非批判的な応答を生成します
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-800 mb-2">感情分析</h3>
            <p className="text-sm text-gray-600">
              52種類の感情から適切な感情を判定します
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
