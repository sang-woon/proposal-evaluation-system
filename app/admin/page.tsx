'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { isAdmin, adminLogin } = useAdmin();
  const router = useRouter();

  // 이미 로그인되어 있으면 대시보드로 리다이렉트
  useEffect(() => {
    if (isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [isAdmin, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = adminLogin(username, password);
    if (success) {
      router.push('/admin/dashboard');
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  if (isAdmin) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f4f5f6',
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e6e8ea',
        padding: '40px',
        width: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#256ef4', margin: '0 0 8px 0' }}>
            관리자 로그인
          </h1>
          <p style={{ fontSize: '14px', color: '#6d7882', margin: 0 }}>
            제안평가시스템 관리자 페이지
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#1e2124', display: 'block', marginBottom: '8px' }}>
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #cdd1d5',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#1e2124', display: 'block', marginBottom: '8px' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #cdd1d5',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !password.trim()}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: (username.trim() && password.trim()) ? '#256ef4' : '#cdd1d5',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: (username.trim() && password.trim()) ? 'pointer' : 'not-allowed',
            }}
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
