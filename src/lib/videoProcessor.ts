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
  stage: 'loading' | 'downloading' | 'processing' | 'finalizing' | 'complete' | 'paused';
  progress: number;
  message: string;
}

export interface ExportState {
  id: string;
  clips: ClipWithTransition[];
  downloadedClips: number[];
  withTransitions: boolean;
  stage: ProcessingProgress['stage'];
  progress: number;
  createdAt: number;
}

const EXPORT_STATE_KEY = 'highlight_export_state';

class VideoProcessor {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private isPaused = false;
  private currentExportId: string | null = null;

  // Export state management
  saveExportState(state: ExportState): void {
    localStorage.setItem(EXPORT_STATE_KEY, JSON.stringify(state));
  }

  getSavedExportState(): ExportState | null {
    const saved = localStorage.getItem(EXPORT_STATE_KEY);
    if (!saved) return null;
    try {
      const state = JSON.parse(saved) as ExportState;
      // Check if state is less than 24 hours old
      if (Date.now() - state.createdAt > 24 * 60 * 60 * 1000) {
        this.clearExportState();
        return null;
      }
      return state;
    } catch {
      return null;
    }
  }

  clearExportState(): void {
    localStorage.removeItem(EXPORT_STATE_KEY);
    this.currentExportId = null;
  }

  pauseExport(): void {
    this.isPaused = true;
  }

  resumeExport(): void {
    this.isPaused = false;
  }

  isExportPaused(): boolean {
    return this.isPaused;
  }

  async load(onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
    if (this.loaded && this.ffmpeg) return;

    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading video processor...' });

    this.ffmpeg = new FFmpeg();

    // Use single-threaded version which doesn't require SharedArrayBuffer/COOP-COEP headers
    const baseURL = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/umd';
    
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

    onProgress?.({ stage: 'loading', progress: 20, message: 'Downloading FFmpeg core...' });

    try {
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      onProgress?.({ stage: 'loading', progress: 50, message: 'Downloading FFmpeg WASM...' });
      
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      onProgress?.({ stage: 'loading', progress: 80, message: 'Initializing FFmpeg...' });

      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });

      this.loaded = true;
      onProgress?.({ stage: 'loading', progress: 100, message: 'Video processor ready' });
    } catch (error) {
      console.error('FFmpeg load error:', error);
      throw new Error(
        'Failed to load video processor. This may be due to browser restrictions. ' +
        'Try refreshing the page or using a different browser.'
      );
    }
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
    onProgress?: (progress: ProcessingProgress) => void,
    exportId?: string,
    resumeFromClip?: number
  ): Promise<Blob | null> {
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');
    if (clips.length === 0) throw new Error('No clips to process');

    this.isPaused = false;
    this.currentExportId = exportId || `export_${Date.now()}`;
    const downloadedClips: number[] = [];
    const startIndex = resumeFromClip || 0;

    // Download all clips (with pause support)
    for (let i = startIndex; i < clips.length; i++) {
      // Check if paused
      if (this.isPaused) {
        this.saveExportState({
          id: this.currentExportId,
          clips,
          downloadedClips,
          withTransitions: false,
          stage: 'paused',
          progress: Math.round((i / clips.length) * 100),
          createdAt: Date.now()
        });
        onProgress?.({ stage: 'paused', progress: Math.round((i / clips.length) * 100), message: 'Export paused' });
        return null;
      }

      const clip = clips[i];
      const filename = `input${i}.mp4`;
      onProgress?.({ 
        stage: 'downloading', 
        progress: Math.round((i / clips.length) * 100), 
        message: `Downloading clip ${i + 1} of ${clips.length}...` 
      });
      await this.downloadClip(clip.videoUrl, filename);
      downloadedClips.push(i);

      // Save progress after each download
      this.saveExportState({
        id: this.currentExportId,
        clips,
        downloadedClips,
        withTransitions: false,
        stage: 'downloading',
        progress: Math.round(((i + 1) / clips.length) * 100),
        createdAt: Date.now()
      });
    }

    onProgress?.({ stage: 'processing', progress: 0, message: 'Processing clips...' });

    // If only one clip, just copy it
    if (clips.length === 1) {
      await this.ffmpeg.exec(['-i', 'input0.mp4', '-c', 'copy', 'output.mp4']);
    } else {
      let concatContent = '';
      for (let i = 0; i < clips.length; i++) {
        concatContent += `file 'input${i}.mp4'\n`;
      }
      
      const encoder = new TextEncoder();
      await this.ffmpeg.writeFile('concat.txt', encoder.encode(concatContent));
      
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

    // Clear saved state on completion
    this.clearExportState();

    onProgress?.({ stage: 'complete', progress: 100, message: 'Video ready!' });

    return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
  }

  async processWithTransitions(
    clips: ClipWithTransition[],
    onProgress?: (progress: ProcessingProgress) => void,
    exportId?: string,
    resumeFromClip?: number
  ): Promise<Blob | null> {
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');
    if (clips.length === 0) throw new Error('No clips to process');

    this.isPaused = false;
    this.currentExportId = exportId || `export_${Date.now()}`;
    const downloadedClips: number[] = [];
    const startIndex = resumeFromClip || 0;

    // Download all clips (with pause support)
    for (let i = startIndex; i < clips.length; i++) {
      // Check if paused
      if (this.isPaused) {
        this.saveExportState({
          id: this.currentExportId,
          clips,
          downloadedClips,
          withTransitions: true,
          stage: 'paused',
          progress: Math.round((i / clips.length) * 100),
          createdAt: Date.now()
        });
        onProgress?.({ stage: 'paused', progress: Math.round((i / clips.length) * 100), message: 'Export paused' });
        return null;
      }

      const clip = clips[i];
      const filename = `input${i}.mp4`;
      onProgress?.({ 
        stage: 'downloading', 
        progress: Math.round((i / clips.length) * 100), 
        message: `Downloading clip ${i + 1} of ${clips.length}...` 
      });
      await this.downloadClip(clip.videoUrl, filename);
      downloadedClips.push(i);

      // Save progress after each download
      this.saveExportState({
        id: this.currentExportId,
        clips,
        downloadedClips,
        withTransitions: true,
        stage: 'downloading',
        progress: Math.round(((i + 1) / clips.length) * 100),
        createdAt: Date.now()
      });
    }

    onProgress?.({ stage: 'processing', progress: 0, message: 'Applying transitions...' });

    if (clips.length === 1) {
      await this.ffmpeg.exec(['-i', 'input0.mp4', '-c:v', 'libx264', '-c:a', 'aac', 'output.mp4']);
    } else {
      let filterComplex = '';
      let lastOutput = '[0:v]';
      
      for (let i = 1; i < clips.length; i++) {
        const transition = clips[i - 1].transition;
        const transitionType = transition.type === 'none' ? 'fade' : transition.type;
        const duration = transition.duration || 0.5;
        const outputLabel = i === clips.length - 1 ? '[outv]' : `[v${i}]`;
        const offset = 5 - duration;
        
        filterComplex += `${lastOutput}[${i}:v]xfade=transition=${transitionType}:duration=${duration}:offset=${offset}${outputLabel};`;
        lastOutput = outputLabel;
      }
      
      filterComplex = filterComplex.slice(0, -1);
      
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

    // Clear saved state on completion
    this.clearExportState();

    onProgress?.({ stage: 'complete', progress: 100, message: 'Video ready!' });

    return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
  }
}

export const videoProcessor = new VideoProcessor();
