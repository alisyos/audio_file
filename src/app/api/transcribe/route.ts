import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // OpenAI Speech to text API가 지원하는 파일 형식 확인 (API 에러 메시지 기준)
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    console.log('Uploaded file:', file.name, 'Extension:', fileExtension, 'Size:', file.size, 'Type:', file.type);
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return NextResponse.json({ 
        error: `지원되지 않는 파일 형식입니다. 지원 형식: ${supportedFormats.join(', ')}` 
      }, { status: 400 });
    }

    // 파일 크기 제한 (25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ 
        error: '파일 크기가 너무 큽니다. 25MB 이하의 파일만 업로드 가능합니다.' 
      }, { status: 400 });
    }

    // OpenAI transcriptions API를 사용하여 오디오를 텍스트로 변환
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'text',
      temperature: 0.1,
    });

    const transcribedText = transcription;

    return NextResponse.json({ 
      text: transcribedText,
      success: true 
    });

  } catch (error: any) {
    console.error('Transcription error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      param: error.param
    });
    
    // OpenAI API 에러인 경우 더 구체적인 메시지 제공
    if (error.status === 400 && error.message?.includes('Invalid file format')) {
      return NextResponse.json({ 
        error: `파일 형식이 올바르지 않습니다. 파일이 손상되었거나 실제 형식이 다를 수 있습니다. 다른 m4a 파일로 시도해보세요.` 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: '음성 변환 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 