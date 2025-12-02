export type TransitionType = 'none' | 'fade' | 'fadeblack' | 'fadewhite' | 'slideleft' | 'slideright' | 'wipeleft' | 'wiperight';

export interface ClipWithTransition {
  videoUrl: string;
  name: string;
  order: number;
  transition: {
    type: TransitionType;
    duration: number;
  };
}

export interface ProcessingProgress {
  stage: 'loading' | 'downloading' | 'processing' | 'finalizing' | 'complete' | 'error';
  progress: number;
  message: string;
}

class CanvasVideoProcessor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  async processWithTransitions(
    clips: ClipWithTransition[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Blob | null> {
    if (clips.length === 0) throw new Error('No clips to process');

    onProgress?.({ stage: 'loading', progress: 0, message: 'Initializing...' });

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d')!;

    // Load all videos first
    onProgress?.({ stage: 'downloading', progress: 0, message: 'Loading videos...' });
    const videos: HTMLVideoElement[] = [];
    
    for (let i = 0; i < clips.length; i++) {
      const video = await this.loadVideo(clips[i].videoUrl);
      videos.push(video);
      onProgress?.({ 
        stage: 'downloading', 
        progress: Math.round(((i + 1) / clips.length) * 100), 
        message: `Loaded ${i + 1} of ${clips.length} clips` 
      });
    }

    // Set canvas size to first video's dimensions
    if (videos[0]) {
      this.canvas.width = videos[0].videoWidth || 1280;
      this.canvas.height = videos[0].videoHeight || 720;
    }

    // Start recording (video only - audio mixing requires more complex handling)
    const stream = this.canvas.captureStream(30);

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getSupportedMimeType(),
      videoBitsPerSecond: 5000000
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);

    onProgress?.({ stage: 'processing', progress: 0, message: 'Processing clips...' });

    // Process each clip
    for (let i = 0; i < clips.length; i++) {
      const video = videos[i];
      const nextVideo = videos[i + 1];
      const transition = clips[i].transition;

      // Play the main portion of the video
      await this.playVideoSegment(video, 0, video.duration - (nextVideo ? transition.duration : 0), onProgress, i, clips.length);

      // Apply transition to next video if exists
      if (nextVideo && transition.type !== 'none') {
        await this.applyTransition(video, nextVideo, transition.type, transition.duration, onProgress, i, clips.length);
      }
    }

    // Stop recording
    this.mediaRecorder.stop();

    onProgress?.({ stage: 'finalizing', progress: 90, message: 'Finalizing video...' });

    // Wait for all data
    await new Promise<void>((resolve) => {
      this.mediaRecorder!.onstop = () => resolve();
    });

    const blob = new Blob(this.recordedChunks, { type: this.getSupportedMimeType() });
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Video ready!' });
    
    return blob;
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  }

  private loadVideo(url: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';
      
      video.onloadeddata = () => resolve(video);
      video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
      
      video.src = url;
      video.load();
    });
  }

  private async playVideoSegment(
    video: HTMLVideoElement,
    startTime: number,
    endTime: number,
    onProgress?: (progress: ProcessingProgress) => void,
    clipIndex?: number,
    totalClips?: number
  ): Promise<void> {
    video.currentTime = startTime;
    video.muted = false;
    
    return new Promise((resolve) => {
      const drawFrame = () => {
        if (video.currentTime >= endTime || video.ended) {
          video.pause();
          resolve();
          return;
        }
        
        this.ctx!.drawImage(video, 0, 0, this.canvas!.width, this.canvas!.height);
        
        if (onProgress && clipIndex !== undefined && totalClips !== undefined) {
          const clipProgress = (video.currentTime - startTime) / (endTime - startTime);
          const overallProgress = ((clipIndex + clipProgress) / totalClips) * 100;
          onProgress({
            stage: 'processing',
            progress: Math.round(overallProgress),
            message: `Processing clip ${clipIndex + 1} of ${totalClips}...`
          });
        }
        
        requestAnimationFrame(drawFrame);
      };
      
      video.play().then(drawFrame).catch(() => {
        // Fallback for autoplay restrictions
        drawFrame();
      });
    });
  }

  private async applyTransition(
    fromVideo: HTMLVideoElement,
    toVideo: HTMLVideoElement,
    type: TransitionType,
    duration: number,
    onProgress?: (progress: ProcessingProgress) => void,
    clipIndex?: number,
    totalClips?: number
  ): Promise<void> {
    const fps = 30;
    const frames = Math.round(duration * fps);
    const frameDuration = 1000 / fps;

    toVideo.currentTime = 0;
    await toVideo.play().catch(() => {});

    for (let frame = 0; frame < frames; frame++) {
      const progress = frame / frames;
      
      // Draw transition frame
      this.drawTransitionFrame(fromVideo, toVideo, type, progress);
      
      if (onProgress && clipIndex !== undefined && totalClips !== undefined) {
        onProgress({
          stage: 'processing',
          progress: Math.round(((clipIndex + 0.5 + progress * 0.5) / totalClips!) * 100),
          message: `Applying ${type} transition...`
        });
      }
      
      await this.sleep(frameDuration);
    }
  }

  private drawTransitionFrame(
    fromVideo: HTMLVideoElement,
    toVideo: HTMLVideoElement,
    type: TransitionType,
    progress: number
  ): void {
    const { width, height } = this.canvas!;

    switch (type) {
      case 'fade':
        this.ctx!.globalAlpha = 1;
        this.ctx!.drawImage(fromVideo, 0, 0, width, height);
        this.ctx!.globalAlpha = progress;
        this.ctx!.drawImage(toVideo, 0, 0, width, height);
        this.ctx!.globalAlpha = 1;
        break;

      case 'fadeblack':
        if (progress < 0.5) {
          this.ctx!.globalAlpha = 1 - progress * 2;
          this.ctx!.drawImage(fromVideo, 0, 0, width, height);
          this.ctx!.globalAlpha = progress * 2;
          this.ctx!.fillStyle = 'black';
          this.ctx!.fillRect(0, 0, width, height);
        } else {
          this.ctx!.globalAlpha = (progress - 0.5) * 2;
          this.ctx!.fillStyle = 'black';
          this.ctx!.fillRect(0, 0, width, height);
          this.ctx!.globalAlpha = (progress - 0.5) * 2;
          this.ctx!.drawImage(toVideo, 0, 0, width, height);
        }
        this.ctx!.globalAlpha = 1;
        break;

      case 'fadewhite':
        if (progress < 0.5) {
          this.ctx!.globalAlpha = 1 - progress * 2;
          this.ctx!.drawImage(fromVideo, 0, 0, width, height);
          this.ctx!.globalAlpha = progress * 2;
          this.ctx!.fillStyle = 'white';
          this.ctx!.fillRect(0, 0, width, height);
        } else {
          this.ctx!.globalAlpha = (progress - 0.5) * 2;
          this.ctx!.fillStyle = 'white';
          this.ctx!.fillRect(0, 0, width, height);
          this.ctx!.globalAlpha = (progress - 0.5) * 2;
          this.ctx!.drawImage(toVideo, 0, 0, width, height);
        }
        this.ctx!.globalAlpha = 1;
        break;

      case 'slideleft':
        const slideLeftX = width * (1 - progress);
        this.ctx!.drawImage(fromVideo, -width * progress, 0, width, height);
        this.ctx!.drawImage(toVideo, slideLeftX, 0, width, height);
        break;

      case 'slideright':
        const slideRightX = -width * (1 - progress);
        this.ctx!.drawImage(fromVideo, width * progress, 0, width, height);
        this.ctx!.drawImage(toVideo, slideRightX, 0, width, height);
        break;

      case 'wipeleft':
        this.ctx!.drawImage(fromVideo, 0, 0, width, height);
        this.ctx!.save();
        this.ctx!.beginPath();
        this.ctx!.rect(0, 0, width * progress, height);
        this.ctx!.clip();
        this.ctx!.drawImage(toVideo, 0, 0, width, height);
        this.ctx!.restore();
        break;

      case 'wiperight':
        this.ctx!.drawImage(fromVideo, 0, 0, width, height);
        this.ctx!.save();
        this.ctx!.beginPath();
        this.ctx!.rect(width * (1 - progress), 0, width * progress, height);
        this.ctx!.clip();
        this.ctx!.drawImage(toVideo, 0, 0, width, height);
        this.ctx!.restore();
        break;

      default:
        this.ctx!.drawImage(toVideo, 0, 0, width, height);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const canvasVideoProcessor = new CanvasVideoProcessor();
