
import React, { useState } from 'react';

interface PasswordOverlayProps {
  onSuccess: () => void;
}

const PasswordOverlay: React.FC<PasswordOverlayProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (password === 'komq1234!!') {
      onSuccess();
    } else {
      setError('잘못된 비밀번호입니다. 다시 시도해주세요.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">투석기 시뮬레이터 Pro</h1>
          <p className="text-slate-500 mt-2">한국경영품질연구원 교육용 시스템</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">액세스 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
          >
            시작하기
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Copyright © 2024 Korea Management Quality Institute</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordOverlay;
