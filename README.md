# 🎙️ 음성파일 기반 문서 자동화 시스템

OpenAI GPT-4o-mini와 Whisper API를 활용하여 음성 파일을 자동으로 분석하고 적절한 문서 형식으로 변환하는 웹 애플리케이션입니다.

## ✨ 주요 기능

1. **음성 파일 업로드**: MP3, WAV, M4A, FLAC, WEBM, OGG 형식 지원 (최대 25MB)
2. **음성-텍스트 변환**: OpenAI Whisper API를 사용한 고품질 음성 인식
3. **문서 유형 제안**: GPT-4o-mini가 텍스트 내용을 분석하여 3가지 적절한 문서 유형 제안
4. **자동 문서 생성**: 선택된 문서 유형에 맞춰 완성된 문서 자동 생성
5. **다운로드 기능**: TXT, Markdown 형식으로 문서 다운로드

## 🚀 시작하기

### 1. 환경 설정

```bash
# 프로젝트 클론
git clone <repository-url>
cd audio-document-automation

# 의존성 설치
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 OpenAI API 키를 설정하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

OpenAI API 키는 [OpenAI Platform](https://platform.openai.com/api-keys)에서 발급받을 수 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 📋 사용 방법

1. **음성 파일 업로드**: 지원되는 형식의 음성 파일을 선택하여 업로드
2. **음성 변환**: 자동으로 음성이 텍스트로 변환됩니다
3. **문서 유형 선택**: AI가 제안하는 3가지 문서 유형 중 하나를 선택
4. **문서 생성**: 선택한 유형에 맞춰 완성된 문서가 자동 생성됩니다
5. **다운로드**: 생성된 문서를 TXT 또는 Markdown 형식으로 다운로드

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4o-mini, Whisper API
- **UI**: Lucide React Icons
- **배포**: Vercel

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── transcribe/     # 음성-텍스트 변환 API
│   │   ├── analyze/        # 텍스트 분석 API
│   │   └── generate/       # 문서 생성 API
│   ├── page.tsx           # 메인 페이지
│   └── layout.tsx         # 레이아웃
├── types/
│   └── index.ts           # TypeScript 타입 정의
```

## 🌐 Vercel 배포

### 1. Vercel 계정 연결

```bash
# Vercel CLI 설치 (선택사항)
npm i -g vercel

# 배포
vercel
```

### 2. 환경 변수 설정

Vercel 대시보드에서 프로젝트 설정 → Environment Variables에 다음을 추가:

- `OPENAI_API_KEY`: OpenAI API 키

### 3. 자동 배포

GitHub 저장소와 연결하면 푸시할 때마다 자동으로 배포됩니다.

## 📝 지원되는 문서 유형

- 회의록
- 제안서
- 인터뷰 요약
- 강의 요약
- 브레인스토밍 결과
- 프로젝트 계획서
- 업무 보고서
- 연구 노트

## ⚠️ 주의사항

- OpenAI API 사용량에 따라 비용이 발생할 수 있습니다
- 파일 크기는 25MB로 제한됩니다
- 인터넷 연결이 필요합니다

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.
