import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 프롬프트 가져오기 함수
async function getPrompts() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/prompts`);
    const data = await response.json();
    return data.prompts || [];
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, selectedType, outline } = await request.json();

    if (!text || !selectedType || !outline) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // 활성화된 프롬프트 가져오기
    const prompts = await getPrompts();
    const systemPrompt = prompts.find((p: { id: string; isActive: boolean; prompt: string }) => p.id === 'generate-system' && p.isActive)?.prompt || 
      '당신은 전문적인 문서 작성 전문가입니다. 주어진 텍스트와 구조를 바탕으로 완성도 높은 문서를 작성합니다.';
    
    const userPromptTemplate = prompts.find((p: { id: string; isActive: boolean; prompt: string }) => p.id === 'generate-user' && p.isActive)?.prompt || 
      `다음 원본 텍스트를 바탕으로 "{selectedType}" 형식의 문서를 작성해주세요.

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

문서를 작성해주세요:`;

    // 템플릿에 값들 삽입
    const userPrompt = userPromptTemplate
      .replace('{selectedType}', selectedType.type)
      .replace('{text}', text)
      .replace('{title}', selectedType.title)
      .replace('{outline}', outline.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n'));

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const document = completion.choices[0].message.content;

    return NextResponse.json({ 
      document,
      success: true 
    });

  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json({ 
      error: '문서 생성 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 