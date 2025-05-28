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

    // m4a 파일의 경우 MIME 타입을 명시적으로 설정
    let processedFile = file;
    if (fileExtension === 'm4a') {
      console.log('Processing M4A file - Original MIME type:', file.type);
      // m4a 파일을 새로운 File 객체로 생성하여 MIME 타입을 명시적으로 설정
      const arrayBuffer = await file.arrayBuffer();
      console.log('M4A file buffer size:', arrayBuffer.byteLength);
      
      // 여러 MIME 타입을 시도해볼 수 있도록 준비
      processedFile = new File([arrayBuffer], file.name, { 
        type: 'audio/mp4' // m4a는 실제로 audio/mp4 컨테이너 형식
      });
      console.log('M4A file processed with MIME type:', processedFile.type);
      console.log('File name preserved:', processedFile.name);
    }

    // 파일 크기 제한 (25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ 
        error: '파일 크기가 너무 큽니다. 25MB 이하의 파일만 업로드 가능합니다.' 
      }, { status: 400 });
    }

    // OpenAI transcriptions API를 사용하여 오디오를 텍스트로 변환
    const transcription = await openai.audio.transcriptions.create({
      file: processedFile,
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
        error: `M4A 파일 처리 중 오류가 발생했습니다. 이 파일은 특정 인코딩 방식으로 인해 지원되지 않을 수 있습니다. 다음을 시도해보세요:\n\n1. 다른 M4A 파일로 시도\n2. MP3 형식으로 변환 후 업로드\n3. WAV 형식으로 변환 후 업로드` 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: '음성 변환 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 