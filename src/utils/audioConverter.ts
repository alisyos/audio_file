// 오디오 파일을 최적화된 WAV 형식으로 변환하는 유틸리티
export async function convertToOptimizedWav(file: File, maxSizeBytes: number = 4 * 1024 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as unknown as typeof AudioContext))();
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        console.log('Original audio:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          length: audioBuffer.length
        });
        
        // 1. 모노로 변환 (파일 크기 50% 감소)
        if (audioBuffer.numberOfChannels > 1) {
          audioBuffer = convertToMono(audioBuffer, audioContext);
        }
        
        // 2. 적극적인 샘플링 레이트 최적화
        let targetSampleRate = 8000; // 기본적으로 8kHz로 시작 (전화 품질, 음성 인식에 충분)
        
        // 파일 길이에 따라 샘플링 레이트 조정
        const durationMinutes = audioBuffer.duration / 60;
        if (durationMinutes > 10) {
          targetSampleRate = 8000; // 10분 이상: 8kHz
        } else if (durationMinutes > 5) {
          targetSampleRate = 11025; // 5-10분: 11kHz
        } else {
          targetSampleRate = 16000; // 5분 이하: 16kHz
        }
        
        // 예상 파일 크기 계산 및 조정
        let estimatedSize = (audioBuffer.duration * targetSampleRate * 2) + 44; // 16-bit mono + header
        
        console.log('Target sample rate:', targetSampleRate, 'Estimated size:', (estimatedSize / 1024 / 1024).toFixed(2), 'MB');
        
        // 여전히 크면 더 낮은 샘플링 레이트 사용
        while (estimatedSize > maxSizeBytes && targetSampleRate > 4000) {
          targetSampleRate = Math.max(4000, targetSampleRate * 0.75);
          estimatedSize = (audioBuffer.duration * targetSampleRate * 2) + 44;
          console.log('Reducing sample rate to:', targetSampleRate, 'New estimated size:', (estimatedSize / 1024 / 1024).toFixed(2), 'MB');
        }
        
        // 리샘플링 적용
        if (targetSampleRate !== audioBuffer.sampleRate) {
          audioBuffer = resampleAudio(audioBuffer, targetSampleRate, audioContext);
        }
        
        // 3. 필요시 오디오 길이 제한 (극단적인 경우)
        const maxDurationSeconds = 600; // 10분 제한
        if (audioBuffer.duration > maxDurationSeconds) {
          const maxLength = Math.floor(maxDurationSeconds * audioBuffer.sampleRate);
          audioBuffer = truncateAudio(audioBuffer, maxLength, audioContext);
          console.log('Audio truncated to', maxDurationSeconds, 'seconds');
        }
        
        // WAV로 변환
        const wavBuffer = audioBufferToWav(audioBuffer);
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        
        console.log('Final converted file size:', (wavBlob.size / 1024 / 1024).toFixed(2), 'MB');
        
        // 크기 검증
        if (wavBlob.size > maxSizeBytes) {
          throw new Error(`변환된 파일이 여전히 너무 큽니다 (${(wavBlob.size / 1024 / 1024).toFixed(2)}MB). 더 짧은 오디오를 사용해주세요.`);
        }
        
        // 새로운 파일명 생성
        const originalName = file.name.replace(/\.[^/.]+$/, "");
        const wavFile = new File([wavBlob], `${originalName}_optimized.wav`, { 
          type: 'audio/wav' 
        });
        
        resolve(wavFile);
      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = () => reject(new Error('파일 읽기 실패'));
    fileReader.readAsArrayBuffer(file);
  });
}

// 스테레오를 모노로 변환
function convertToMono(audioBuffer: AudioBuffer, audioContext: AudioContext): AudioBuffer {
  const monoBuffer = audioContext.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
  const monoData = monoBuffer.getChannelData(0);
  
  if (audioBuffer.numberOfChannels === 1) {
    monoData.set(audioBuffer.getChannelData(0));
  } else {
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    
    for (let i = 0; i < audioBuffer.length; i++) {
      monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
    }
  }
  
  return monoBuffer;
}

// 오디오 리샘플링 (개선된 버전)
function resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number, audioContext: AudioContext): AudioBuffer {
  const ratio = audioBuffer.sampleRate / targetSampleRate;
  const newLength = Math.floor(audioBuffer.length / ratio);
  const resampledBuffer = audioContext.createBuffer(1, newLength, targetSampleRate); // 모노로 강제
  
  const inputData = audioBuffer.getChannelData(0); // 첫 번째 채널만 사용
  const outputData = resampledBuffer.getChannelData(0);
  
  // 간단한 선형 보간
  for (let i = 0; i < newLength; i++) {
    const sourceIndex = i * ratio;
    const index = Math.floor(sourceIndex);
    const fraction = sourceIndex - index;
    
    if (index + 1 < inputData.length) {
      outputData[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
    } else {
      outputData[i] = inputData[index] || 0;
    }
  }
  
  return resampledBuffer;
}

// 오디오 길이 제한
function truncateAudio(audioBuffer: AudioBuffer, maxLength: number, audioContext: AudioContext): AudioBuffer {
  const truncatedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels, 
    Math.min(maxLength, audioBuffer.length), 
    audioBuffer.sampleRate
  );
  
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const inputData = audioBuffer.getChannelData(channel);
    const outputData = truncatedBuffer.getChannelData(channel);
    outputData.set(inputData.slice(0, maxLength));
  }
  
  return truncatedBuffer;
}

// AudioBuffer를 WAV 형식으로 변환
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV 헤더 작성
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF 헤더
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');

  // fmt 청크
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt 청크 크기
  view.setUint16(20, 1, true); // PCM 형식
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 비트 깊이

  // data 청크
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // 오디오 데이터 작성
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

// 파일이 변환 가능한지 확인
export function canConvertAudio(): boolean {
  return !!(window.AudioContext || (window as unknown as typeof AudioContext));
} 