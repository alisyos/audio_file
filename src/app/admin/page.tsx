'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { SystemPrompt, SystemPromptsResponse, UpdatePromptResponse } from '@/types';
import Link from 'next/link';

export default function AdminPage() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPrompts, setEditingPrompts] = useState<{ [key: string]: string }>({});

  // 프롬프트 로드
  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/prompts');
      const data: SystemPromptsResponse = await response.json();
      
      if (data.success) {
        setPrompts(data.prompts);
        // 편집용 상태 초기화
        const editingState: { [key: string]: string } = {};
        data.prompts.forEach(prompt => {
          editingState[prompt.id] = prompt.prompt;
        });
        setEditingPrompts(editingState);
      } else {
        setError(data.error || '프롬프트 로드 실패');
      }
    } catch {
      setError('프롬프트 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 프롬프트 저장
  const savePrompt = async (id: string) => {
    try {
      setSaving(id);
      setError('');
      setSuccess('');

      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          prompt: editingPrompts[id],
        }),
      });

      const data: UpdatePromptResponse = await response.json();

      if (data.success) {
        setSuccess('프롬프트가 성공적으로 저장되었습니다.');
        await loadPrompts(); // 새로고침
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || '저장 실패');
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(null);
    }
  };

  // 프롬프트 활성화/비활성화
  const togglePrompt = async (id: string, isActive: boolean) => {
    try {
      const prompt = prompts.find(p => p.id === id);
      if (!prompt) return;

      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          prompt: prompt.prompt,
          isActive,
        }),
      });

      const data: UpdatePromptResponse = await response.json();

      if (data.success) {
        await loadPrompts();
      } else {
        setError(data.error || '상태 변경 실패');
      }
    } catch {
      setError('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 프롬프트 초기화
  const resetPrompts = async () => {
    if (!confirm('모든 프롬프트를 기본값으로 초기화하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/prompts', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('프롬프트가 초기화되었습니다.');
        await loadPrompts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('초기화 실패');
      }
    } catch {
      setError('초기화 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 편집 중인 프롬프트 업데이트
  const updateEditingPrompt = (id: string, value: string) => {
    setEditingPrompts(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  // 변경사항 확인
  const hasChanges = (id: string) => {
    const original = prompts.find(p => p.id === id)?.prompt || '';
    return editingPrompts[id] !== original;
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프롬프트 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                메인으로 돌아가기
              </Link>
            </div>
            <button
              onClick={resetPrompts}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              초기화
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Settings className="w-8 h-8 mr-3" />
              시스템 프롬프트 관리
            </h1>
            <p className="text-lg text-gray-600">
              AI 모델의 동작을 제어하는 시스템 프롬프트를 관리합니다
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Prompts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all ${
                prompt.isActive ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {prompt.name}
                  </h3>
                  <p className="text-sm text-gray-500">{prompt.description}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      prompt.category === 'analyze' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {prompt.category === 'analyze' ? '분석' : '생성'}
                    </span>
                    <span className="text-xs text-gray-400">
                      수정: {new Date(prompt.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => togglePrompt(prompt.id, !prompt.isActive)}
                  className={`flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    prompt.isActive
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {prompt.isActive ? (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      활성
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      비활성
                    </>
                  )}
                </button>
              </div>

              {/* Prompt Editor */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프롬프트 내용
                </label>
                <textarea
                  value={editingPrompts[prompt.id] || ''}
                  onChange={(e) => updateEditingPrompt(prompt.id, e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="프롬프트를 입력하세요..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {hasChanges(prompt.id) && (
                    <span className="text-orange-600 font-medium">
                      • 저장되지 않은 변경사항이 있습니다
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => savePrompt(prompt.id)}
                  disabled={saving === prompt.id || !hasChanges(prompt.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    hasChanges(prompt.id)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saving === prompt.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 사용 가이드
          </h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• <strong>분석 프롬프트</strong>: 음성 텍스트를 분석하여 문서 유형을 제안하는 역할</li>
            <li>• <strong>생성 프롬프트</strong>: 선택된 문서 유형에 맞춰 최종 문서를 생성하는 역할</li>
            <li>• <strong>시스템 프롬프트</strong>: AI의 역할과 행동 방식을 정의</li>
            <li>• <strong>사용자 프롬프트</strong>: 구체적인 작업 지시사항 (템플릿 변수 사용 가능)</li>
            <li>• 템플릿 변수: {'{text}'}, {'{selectedType}'}, {'{title}'}, {'{outline}'} 등</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 