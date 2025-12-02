import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type TransitionType = 'none' | 'fade' | 'fadeblack' | 'fadewhite' | 'slideleft' | 'slideright' | 'wipeleft' | 'wiperight';

export interface ClipWithTransition {
  videoUrl: string;
  name: string;
  order: number;
  transition: {
    type: TransitionType;
    duration: number; // in seconds
  };
}

export interface ProcessingProgress {
  stage: 'loading' | 'downloading' | 'processing' | 'finalizing' | 'complete';
  progress: number;
  message: string;
}

class VideoProcessor {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async load(onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
    if (this.loaded && this.ffmpeg) return;

    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading video processor...' });

    this.ffmpeg = new FFmpeg();

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      onProgress?.({ 
        stage: 'processing', 
        progress: Math.round(progress * 100), 
        message: `Processing video... ${Math.round(progress * 100)}%` 
      });
    });

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
    onProgress?.({ stage: 'loading', progress: 100, message: 'Video processor ready' });
  }

  async downloadClip(url: string, filename: string, onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');
    
    onProgress?.({ stage: 'downloading', progress: 0, message: `Downloading ${filename}...` });
    
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    await this.ffmpeg.writeFile(filename, new Uint8Array(data));
    
    onProgress?.({ stage: 'downloading', progress: 100, message: `Downloaded ${filename}` });
  }

  async processHighlight(
    clips: ClipWithTransition[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Blob> {
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');
    if (clips.length === 0) throw new Error('No clips to process');

    // Download all clips
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const filename = `input${i}.mp4`;
      onProgress?.({ 
        stage: 'downloading', 
        progress: Math.round((i / clips.length) * 100), 
        message: `Downloading clip ${i + 1} of ${clips.length}...` 
      });
      await this.downloadClip(clip.videoUrl, filename);
    }

    onProgress?.({ stage: 'processing', progress: 0, message: 'Processing clips...' });

    // If only one clip, just copy it
    if (clips.length === 1) {
      await this.ffmpeg.exec(['-i', 'input0.mp4', '-c', 'copy', 'output.mp4']);
    } else {
      // Create a concat file for simple concatenation (no transitions)
      // For transitions, we'd use xfade filter but it's complex and slow
      // Using simple concat for now
      let concatContent = '';
      for (let i = 0; i < clips.length; i++) {
        concatContent += `file 'input${i}.mp4'\n`;
      }
      
      const encoder = new TextEncoder();
      await this.ffmpeg.writeFile('concat.txt', encoder.encode(concatContent));
      
      // Use concat demuxer for simple concatenation
      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        'output.mp4'
      ]);
    }

    onProgress?.({ stage: 'finalizing', progress: 90, message: 'Finalizing video...' });

    const data = await this.ffmpeg.readFile('output.mp4') as Uint8Array;
    
    // Cleanup
    for (let i = 0; i < clips.length; i++) {
      await this.ffmpeg.deleteFile(`input${i}.mp4`);
    }
    if (clips.length > 1) {
      await this.ffmpeg.deleteFile('concat.txt');
    }
    await this.ffmpeg.deleteFile('output.mp4');

    onProgress?.({ stage: 'complete', progress: 100, message: 'Video ready!' });

    return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
  }

  async processWithTransitions(
    clips: ClipWithTransition[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Blob> {
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');
    if (clips.length === 0) throw new Error('No clips to process');

    // Download all clips
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const filename = `input${i}.mp4`;
      onProgress?.({ 
        stage: 'downloading', 
        progress: Math.round((i / clips.length) * 100), 
        message: `Downloading clip ${i + 1} of ${clips.length}...` 
      });
      await this.downloadClip(clip.videoUrl, filename);
    }

    onProgress?.({ stage: 'processing', progress: 0, message: 'Applying transitions...' });

    if (clips.length === 1) {
      await this.ffmpeg.exec(['-i', 'input0.mp4', '-c:v', 'libx264', '-c:a', 'aac', 'output.mp4']);
    } else {
      // Build filter complex for xfade transitions
      let filterComplex = '';
      let lastOutput = '[0:v]';
      
      for (let i = 1; i < clips.length; i++) {
        const transition = clips[i - 1].transition;
        const transitionType = transition.type === 'none' ? 'fade' : transition.type;
        const duration = transition.duration || 0.5;
        const outputLabel = i === clips.length - 1 ? '[outv]' : `[v${i}]`;
        
        // Get video duration (approximate - using offset)
        const offset = 5 - duration; // Assume 5 second clips, adjust offset
        
        filterComplex += `${lastOutput}[${i}:v]xfade=transition=${transitionType}:duration=${duration}:offset=${offset}${outputLabel};`;
        lastOutput = outputLabel;
      }
      
      // Remove trailing semicolon
      filterComplex = filterComplex.slice(0, -1);
      
      // Build input arguments
      const inputArgs: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        inputArgs.push('-i', `input${i}.mp4`);
      }
      
      try {
        await this.ffmpeg.exec([
          ...inputArgs,
          '-filter_complex', filterComplex,
          '-map', '[outv]',
          '-c:v', 'libx264',
          '-preset', 'fast',
          'output.mp4'
        ]);
      } catch (error) {
        console.error('Transition processing failed, falling back to simple concat:', error);
        // Fallback to simple concat
        let concatContent = '';
        for (let i = 0; i < clips.length; i++) {
          concatContent += `file 'input${i}.mp4'\n`;
        }
        const encoder = new TextEncoder();
        await this.ffmpeg.writeFile('concat.txt', encoder.encode(concatContent));
        await this.ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'output.mp4']);
      }
    }

    onProgress?.({ stage: 'finalizing', progress: 90, message: 'Finalizing video...' });

    const data = await this.ffmpeg.readFile('output.mp4') as Uint8Array;
    
    // Cleanup
    for (let i = 0; i < clips.length; i++) {
      await this.ffmpeg.deleteFile(`input${i}.mp4`);
    }
    await this.ffmpeg.deleteFile('output.mp4');

    onProgress?.({ stage: 'complete', progress: 100, message: 'Video ready!' });

    return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
  }
}

export const videoProcessor = new VideoProcessor();
