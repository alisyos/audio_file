'use client';

import { useState } from 'react';
import { Upload, FileAudio, Loader2, Download, FileText, CheckCircle, Settings, RefreshCw } from 'lucide-react';
import { DocumentSuggestion, AnalysisResponse, TranscriptionResponse, DocumentGenerationResponse } from '@/types';
import Link from 'next/link';
import { convertToOptimizedWav, canConvertAudio } from '@/utils/audioConverter';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<DocumentSuggestion | null>(null);
  const [editableSuggestion, setEditableSuggestion] = useState<DocumentSuggestion | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFile, setConvertedFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setCurrentStep(1);
      setConvertedFile(null);
      // 모든 후속 단계 상태 초기화
      setTranscribedText('');
      setSuggestions([]);
      setSelectedSuggestion(null);
      setEditableSuggestion(null);
      setGeneratedDocument('');
      // 로딩 상태도 초기화
      setIsTranscribing(false);
      setIsAnalyzing(false);
      setIsGenerating(false);
      setIsConverting(false);
    }
  };

  // M4A 파일을 MP3로 변환
  const handleConvertM4A = async () => {
    if (!file) return;

    setIsConverting(true);
    setError('');

    try {
      const converted = await convertToOptimizedWav(file);
      setConvertedFile(converted);
      
      // 변환 성공 메시지
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
      const convertedSizeMB = (converted.size / 1024 / 1024).toFixed(2);
      const compressionRatio = ((1 - converted.size / file.size) * 100).toFixed(1);
      
      console.log(`파일 변환 완료: ${originalSizeMB}MB → ${convertedSizeMB}MB (${compressionRatio}% 압축)`);
      setError('');
    } catch (err) {
      console.error('변환 오류:', err);
      setError('파일 변환 중 오류가 발생했습니다. 브라우저가 이 파일 형식을 지원하지 않을 수 있습니다.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setError('');

    try {
      const formData = new FormData();
      // 변환된 파일이 있으면 그것을 사용, 없으면 원본 파일 사용
      const fileToUpload = convertedFile || file;
      formData.append('audio', fileToUpload);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data: TranscriptionResponse = await response.json();

      if (data.success) {
        setTranscribedText(data.text);
        setCurrentStep(2);
        // 자동으로 분석하지 않고 사용자가 텍스트를 확인할 수 있도록 대기
      } else {
        setError(data.error || '음성 변환에 실패했습니다.');
      }
    } catch (err) {
      setError('음성 변환 중 오류가 발생했습니다.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data: AnalysisResponse = await response.json();

      if (data.suggestions) {
        setSuggestions(data.suggestions);
        setCurrentStep(3);
      } else {
        setError('문서 유형 분석에 실패했습니다.');
      }
    } catch (err) {
      setError('문서 유형 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectSuggestion = (suggestion: DocumentSuggestion) => {
    setSelectedSuggestion(suggestion);
    setEditableSuggestion({ ...suggestion }); // 편집 가능한 복사본 생성
    // 3단계에서 선택만 하고 단계는 이동하지 않음
  };

  const handleGenerateDocument = async () => {
    if (!editableSuggestion || !transcribedText) return;

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcribedText,
          selectedType: editableSuggestion,
          outline: editableSuggestion.outline,
        }),
      });

      const data: DocumentGenerationResponse = await response.json();

      if (data.success) {
        setGeneratedDocument(data.document);
        // 문서 생성 완료 후 자동으로 4단계로 이동
        setCurrentStep(4);
      } else {
        setError(data.error || '문서 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('문서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (format: 'txt' | 'md') => {
    const content = generatedDocument;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetProcess = () => {
    setFile(null);
    setCurrentStep(1);
    setTranscribedText('');
    setSuggestions([]);
    setSelectedSuggestion(null);
    setEditableSuggestion(null);
    setGeneratedDocument('');
    setError('');
    setConvertedFile(null);
    // 로딩 상태도 초기화
    setIsTranscribing(false);
    setIsAnalyzing(false);
    setIsGenerating(false);
    setIsConverting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-end mb-4">
            <Link 
              href="/admin"
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              관리자 페이지
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎙️ 음성파일 기반 문서 자동화 시스템
          </h1>
          <p className="text-lg text-gray-600">
            음성 파일을 업로드하여 자동으로 문서를 생성해보세요
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex justify-center space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { step: 1, label: '파일 업로드', icon: Upload },
              { step: 2, label: '텍스트 변환', icon: FileAudio },
              { step: 3, label: '문서 생성', icon: FileText },
              { step: 4, label: '문서 확인', icon: Download }
            ].map(({ step, label, icon: Icon }) => (
              <button
                key={step}
                onClick={() => {
                  // 각 단계별 접근 조건 확인
                  if (step === 1) {
                    setCurrentStep(step);
                  } else if (step === 2 && transcribedText) {
                    setCurrentStep(step);
                  } else if (step === 3 && suggestions.length > 0) {
                    setCurrentStep(step);
                  } else if (step === 4 && generatedDocument) {
                    setCurrentStep(step);
                  }
                }}
                disabled={
                  (step === 2 && !transcribedText) ||
                  (step === 3 && suggestions.length === 0) ||
                  (step === 4 && !generatedDocument)
                }
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currentStep === step
                    ? 'bg-white text-blue-600 shadow-sm'
                    : (
                        (step === 1) ||
                        (step === 2 && transcribedText) ||
                        (step === 3 && suggestions.length > 0) ||
                        (step === 4 && generatedDocument)
                      )
                    ? 'text-green-600 hover:bg-white/50 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {(
                  (step === 1 && transcribedText) ||
                  (step === 2 && suggestions.length > 0) ||
                  (step === 3 && generatedDocument) ||
                  (step === 4 && currentStep > 4)
                ) ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 min-h-[400px]">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                1. 음성 파일 업로드
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".flac,.m4a,.mp3,.mp4,.mpeg,.mpga,.oga,.ogg,.wav,.webm"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="audio-upload"
                />
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <FileAudio className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    음성 파일을 선택하세요
                  </p>
                  <p className="text-sm text-gray-500">
                    지원 형식: FLAC, M4A, MP3, MP4, MPEG, MPGA, OGA, OGG, WAV, WEBM (최대 25MB)
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ M4A 파일 호환성 문제가 있을 경우 MP3로 변환 후 업로드해주세요
                  </p>
                </label>
              </div>

              {file && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    선택된 파일: <span className="font-medium">{file.name}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    크기: {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {/* M4A 파일인 경우 변환 옵션 표시 */}
                  {file.name.toLowerCase().endsWith('.m4a') && canConvertAudio() && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 mb-2">
                        ⚠️ M4A 파일은 호환성 문제가 있을 수 있습니다. 최적화된 WAV로 변환하는 것을 권장합니다.
                      </p>
                      <p className="text-xs text-orange-600 mb-2">
                        최적화 변환: 모노 변환 + 낮은 샘플링 레이트 (16kHz/8kHz)로 파일 크기 대폭 감소
                      </p>
                      {!convertedFile ? (
                        <button
                          onClick={handleConvertM4A}
                          disabled={isConverting}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center"
                        >
                          {isConverting ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              최적화 중...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              최적화된 WAV로 변환
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="text-sm text-green-700">
                          ✅ 최적화 완료: {convertedFile.name}
                          <br />
                          <span className="text-xs">
                            크기: {(file.size / 1024 / 1024).toFixed(2)}MB → {(convertedFile.size / 1024 / 1024).toFixed(2)}MB 
                            ({((1 - convertedFile.size / file.size) * 100).toFixed(1)}% 압축)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          음성 변환 중...
                        </>
                      ) : (
                        <>
                          음성 변환 시작
                          {convertedFile && (
                            <span className="ml-1 text-xs">(변환된 파일 사용)</span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Transcribed Text */}
          {currentStep === 2 && transcribedText && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                2. 텍스트 변환
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  변환된 텍스트를 확인하고 필요시 수정해주세요:
                </label>
                <textarea
                  value={transcribedText}
                  onChange={(e) => setTranscribedText(e.target.value)}
                  className="w-full h-60 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="변환된 텍스트가 여기에 표시됩니다..."
                />
              </div>
              
              {!isAnalyzing && (
                <div className="flex justify-center">
                  <button
                    onClick={() => handleAnalyze(transcribedText)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    {suggestions.length === 0 ? '다음 단계로 진행' : '텍스트 다시 분석'}
                  </button>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="flex items-center text-blue-600">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  문서 유형 분석 중...
                </div>
              )}
            </div>
          )}

          {/* Step 3: Document Type Selection & Generation */}
          {currentStep === 3 && suggestions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">
                🎯 3. 문서 생성
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Document Type Selection */}
                <div>
                  <h3 className="text-lg font-medium mb-4">문서 유형 선택</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedSuggestion === suggestion
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectSuggestion(suggestion)}
                      >
                        <h4 className="font-semibold text-lg mb-2">
                          {index + 1}. {suggestion.type}
                        </h4>
                        <p className="text-gray-600">{suggestion.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Document Generation */}
                {selectedSuggestion && editableSuggestion ? (
                  <div>
                    <h3 className="text-lg font-medium mb-4">선택한 문서 유형 편집</h3>
                    
                    {/* Editable Document Type */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          문서 유형:
                        </label>
                        <input
                          type="text"
                          value={editableSuggestion.type}
                          onChange={(e) => setEditableSuggestion({
                            ...editableSuggestion,
                            type: e.target.value
                          })}
                          className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          문서 제목:
                        </label>
                        <input
                          type="text"
                          value={editableSuggestion.title}
                          onChange={(e) => setEditableSuggestion({
                            ...editableSuggestion,
                            title: e.target.value
                          })}
                          className="w-full p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          목차 (한 줄에 하나씩):
                        </label>
                        <textarea
                          value={editableSuggestion.outline.join('\n')}
                          onChange={(e) => setEditableSuggestion({
                            ...editableSuggestion,
                            outline: e.target.value.split('\n').filter(line => line.trim() !== '')
                          })}
                          className="w-full h-32 p-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="목차를 한 줄에 하나씩 입력하세요"
                        />
                      </div>
                    </div>
                    
                    {/* Generation Buttons */}
                    <div className="flex flex-col space-y-3">
                      <button
                        onClick={handleGenerateDocument}
                        disabled={isGenerating}
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            문서 생성 중...
                          </>
                        ) : generatedDocument ? (
                          '문서 재생성하기'
                        ) : (
                          '문서 생성하기'
                        )}
                      </button>
                      

                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-center">
                      ← 왼쪽에서 문서 형식을 선택해주세요
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Download */}
          {currentStep === 4 && generatedDocument && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                4. 문서 확인
              </h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">생성된 문서</h3>
                <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: generatedDocument.replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">다운로드</h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleDownload('txt')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    TXT 다운로드
                  </button>
                  <button
                    onClick={() => handleDownload('md')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Markdown 다운로드
                  </button>
                  <button
                    onClick={resetProcess}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    새로 시작
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
