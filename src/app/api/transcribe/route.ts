import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  let fileExtension: string | undefined;
  
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // OpenAI Speech to text API가 지원하는 파일 형식 확인 (API 에러 메시지 기준)
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    console.log('Uploaded file:', file.name, 'Extension:', fileExtension, 'Size:', file.size, 'Type:', file.type);
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return NextResponse.json({ 
        error: `지원되지 않는 파일 형식입니다. 지원 형식: ${supportedFormats.join(', ')}` 
      }, { status: 400 });
    }

    // m4a 파일의 경우 특별 처리
    let processedFile = file;
    if (fileExtension === 'm4a') {
      console.log('Processing M4A file - Original MIME type:', file.type);
      console.log('Original file name:', file.name);
      
      try {
        // 파일을 ArrayBuffer로 읽기
        const arrayBuffer = await file.arrayBuffer();
        console.log('M4A file buffer size:', arrayBuffer.byteLength);
        
        // 파일 헤더 확인 (M4A 파일은 'ftyp' 시그니처를 가져야 함)
        const headerView = new Uint8Array(arrayBuffer.slice(0, 12));
        const headerString = Array.from(headerView.slice(4, 8))
          .map(byte => String.fromCharCode(byte))
          .join('');
        
        console.log('File header signature:', headerString);
        
        // 여러 MIME 타입으로 시도
        const mimeTypes = [
          'audio/mp4',
          'audio/m4a', 
          'audio/x-m4a',
          'audio/aac'
        ];
        
        // 원본 파일명에서 확장자를 명확히 설정
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const newFileName = `${baseName}.m4a`;
        
        // 첫 번째 시도: audio/mp4 타입으로
        processedFile = new File([arrayBuffer], newFileName, { 
          type: mimeTypes[0]
        });
        
        console.log('M4A file processed:');
        console.log('- New file name:', processedFile.name);
        console.log('- MIME type:', processedFile.type);
        console.log('- Size:', processedFile.size);
        
      } catch (error) {
        console.error('Error processing M4A file:', error);
        // 처리 실패 시 원본 파일 사용
        processedFile = file;
      }
    }

    // 파일 크기 제한 (4MB)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ 
        error: '파일 크기가 너무 큽니다. 4MB 이하의 파일만 업로드 가능합니다.' 
      }, { status: 400 });
    }

    // OpenAI transcriptions API를 사용하여 오디오를 텍스트로 변환
    let transcription;
    let lastError;
    
    // M4A 파일의 경우 여러 MIME 타입으로 재시도
    if (fileExtension === 'm4a') {
      const mimeTypes = ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];
      const arrayBuffer = await processedFile.arrayBuffer();
      const baseName = processedFile.name.replace(/\.[^/.]+$/, "");
      
      for (let i = 0; i < mimeTypes.length; i++) {
        try {
          console.log(`Attempting M4A transcription with MIME type: ${mimeTypes[i]} (attempt ${i + 1}/${mimeTypes.length})`);
          
          const retryFile = new File([arrayBuffer], `${baseName}.m4a`, { 
            type: mimeTypes[i]
          });
          
          transcription = await openai.audio.transcriptions.create({
            file: retryFile,
            model: 'whisper-1',
            response_format: 'text',
            temperature: 0.1,
          });
          
          console.log(`M4A transcription successful with MIME type: ${mimeTypes[i]}`);
          break; // 성공하면 루프 종료
          
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`M4A transcription failed with MIME type ${mimeTypes[i]}:`, errorMessage);
          lastError = error;
          
          // 마지막 시도가 아니면 계속
          if (i < mimeTypes.length - 1) {
            continue;
          }
          
          // 모든 시도가 실패하면 에러 던지기
          throw lastError;
        }
      }
    } else {
      // 일반 파일 처리
      transcription = await openai.audio.transcriptions.create({
        file: processedFile,
        model: 'whisper-1',
        response_format: 'text',
        temperature: 0.1,
      });
    }

    const transcribedText = transcription;

    return NextResponse.json({ 
      text: transcribedText,
      success: true 
    });

  } catch (error: unknown) {
    console.error('Transcription error:', error);
    
    const errorDetails = error instanceof Error ? {
      message: error.message,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
      type: (error as { type?: string }).type,
      param: (error as { param?: string }).param
    } : { message: 'Unknown error' };
    
    console.error('Error details:', errorDetails);
    
    // OpenAI API 에러인 경우 더 구체적인 메시지 제공
    if (errorDetails.status === 400 && errorDetails.message?.includes('Invalid file format')) {
      if (fileExtension === 'm4a') {
        return NextResponse.json({ 
          error: `M4A 파일 처리 중 오류가 발생했습니다. 여러 MIME 타입으로 시도했지만 모두 실패했습니다.\n\n해결 방법:\n1. 파일을 MP3로 변환 후 업로드\n2. 파일을 WAV로 변환 후 업로드\n3. 다른 M4A 파일로 시도\n4. 파일이 손상되지 않았는지 확인\n\n참고: iPhone에서 녹음된 일부 M4A 파일은 특별한 인코딩으로 인해 호환성 문제가 있을 수 있습니다.` 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `파일 형식이 올바르지 않습니다. 지원되는 형식으로 변환 후 다시 시도해주세요.` 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: '음성 변환 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 