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
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // 활성화된 프롬프트 가져오기
    const prompts = await getPrompts();
    const systemPrompt = prompts.find((p: { id: string; isActive: boolean; prompt: string }) => p.id === 'analyze-system' && p.isActive)?.prompt || 
      '당신은 텍스트 내용을 분석하여 적절한 문서 형식을 제안하는 전문가입니다. 항상 JSON 형식으로 응답하세요.';
    
    const userPromptTemplate = prompts.find((p: { id: string; isActive: boolean; prompt: string }) => p.id === 'analyze-user' && p.isActive)?.prompt || 
      `다음 텍스트를 분석하여 가장 적절한 문서 유형 3가지를 제안해주세요. 
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

가능한 문서 유형: 회의록, 제안서, 인터뷰 요약, 강의 요약, 브레인스토밍 결과, 프로젝트 계획서, 업무 보고서, 연구 노트 등`;

    // 템플릿에 텍스트 삽입
    const userPrompt = userPromptTemplate.replace('{text}', text);

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
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;
    
    try {
      const suggestions = JSON.parse(responseText || '{}');
      return NextResponse.json(suggestions);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ 
        error: '응답 파싱 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ 
      error: '텍스트 분석 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 