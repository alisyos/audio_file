import { NextRequest, NextResponse } from 'next/server';
import { SystemPrompt } from '@/types';

// 기본 시스템 프롬프트들 (실제로는 데이터베이스에 저장되어야 함)
const defaultPrompts: SystemPrompt[] = [
  {
    id: 'analyze-system',
    name: '문서 분석 시스템 프롬프트',
    description: '텍스트를 분석하여 적절한 문서 형식을 제안하는 시스템 프롬프트',
    prompt: '당신은 텍스트 내용을 분석하여 적절한 문서 형식을 제안하는 전문가입니다. 항상 JSON 형식으로 응답하세요.',
    category: 'analyze',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'analyze-user',
    name: '문서 분석 사용자 프롬프트',
    description: '텍스트 분석을 위한 사용자 프롬프트 템플릿',
    prompt: `다음 텍스트를 분석하여 가장 적절한 문서 유형 3가지를 제안해주세요. 
각 문서 유형에 대해 구체적인 목차를 포함해서 JSON 형식으로 응답해주세요.

텍스트: "{text}"

응답 형식:
{
  "suggestions": [
    {
      "type": "문서유형명",
      "title": "문서 제목",
      "outline": [
        "목차1",
        "목차2",
        "목차3",
        "목차4",
        "목차5"
      ]
    }
  ]
}

가능한 문서 유형: 회의록, 제안서, 인터뷰 요약, 강의 요약, 브레인스토밍 결과, 프로젝트 계획서, 업무 보고서, 연구 노트 등`,
    category: 'analyze',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'generate-system',
    name: '문서 생성 시스템 프롬프트',
    description: '문서를 생성하는 시스템 프롬프트',
    prompt: '당신은 전문적인 문서 작성 전문가입니다. 주어진 텍스트와 구조를 바탕으로 완성도 높은 문서를 작성합니다.',
    category: 'generate',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'generate-user',
    name: '문서 생성 사용자 프롬프트',
    description: '문서 생성을 위한 사용자 프롬프트 템플릿',
    prompt: `다음 원본 텍스트를 바탕으로 "{selectedType}" 형식의 문서를 작성해주세요.

원본 텍스트: "{text}"

문서 제목: {title}

목차 구조:
{outline}

요구사항:
1. 위 목차 구조를 정확히 따라주세요
2. 각 섹션에 적절한 내용을 채워주세요
3. 마크다운 형식으로 작성해주세요
4. 원본 텍스트의 핵심 내용을 빠뜨리지 말고 포함해주세요
5. 전문적이고 체계적인 문서로 작성해주세요
6. 한국어로 작성해주세요

문서를 작성해주세요:`,
    category: 'generate',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 메모리에 프롬프트 저장 (실제로는 데이터베이스 사용)
let prompts: SystemPrompt[] = [...defaultPrompts];

// GET: 모든 프롬프트 조회
export async function GET() {
  try {
    return NextResponse.json({
      prompts,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({
      prompts: [],
      success: false,
      error: '프롬프트 조회 중 오류가 발생했습니다.',
    }, { status: 500 });
  }
}

// PUT: 프롬프트 업데이트
export async function PUT(request: NextRequest) {
  try {
    const { id, prompt, isActive } = await request.json();

    if (!id || !prompt) {
      return NextResponse.json({
        success: false,
        error: 'ID와 프롬프트는 필수입니다.',
      }, { status: 400 });
    }

    const promptIndex = prompts.findIndex(p => p.id === id);
    if (promptIndex === -1) {
      return NextResponse.json({
        success: false,
        error: '프롬프트를 찾을 수 없습니다.',
      }, { status: 404 });
    }

    // 프롬프트 업데이트
    prompts[promptIndex] = {
      ...prompts[promptIndex],
      prompt,
      isActive: isActive !== undefined ? isActive : prompts[promptIndex].isActive,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json({
      success: false,
      error: '프롬프트 업데이트 중 오류가 발생했습니다.',
    }, { status: 500 });
  }
}

// POST: 프롬프트 초기화
export async function POST() {
  try {
    prompts = [...defaultPrompts];
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error resetting prompts:', error);
    return NextResponse.json({
      success: false,
      error: '프롬프트 초기화 중 오류가 발생했습니다.',
    }, { status: 500 });
  }
} 