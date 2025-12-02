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
  private targetFps = 30;
  private frameInterval = 1000 / 30;

  async processWithTransitions(
    clips: ClipWithTransition[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Blob | null> {
    if (clips.length === 0) throw new Error('No clips to process');

    onProgress?.({ stage: 'loading', progress: 0, message: 'Initializing...' });

    // Create canvas
    this.canvas = document.createElement('canvas');
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

    // Start recording
    const stream = this.canvas.captureStream(this.targetFps);

    this.recordedChunks = [];
    const mimeType = this.getSupportedMimeType();
    
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000 // 8 Mbps for better quality
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);

    onProgress?.({ stage: 'processing', progress: 0, message: 'Processing clips...' });

    // Calculate total duration for progress
    let totalFrames = 0;
    for (let i = 0; i < clips.length; i++) {
      const video = videos[i];
      const transitionDuration = i < clips.length - 1 ? clips[i].transition.duration : 0;
      const clipFrames = Math.ceil((video.duration - transitionDuration) * this.targetFps);
      const transitionFrames = Math.ceil(transitionDuration * this.targetFps);
      totalFrames += clipFrames + transitionFrames;
    }

    let processedFrames = 0;

    // Process each clip
    for (let i = 0; i < clips.length; i++) {
      const video = videos[i];
      const nextVideo = videos[i + 1];
      const transition = clips[i].transition;
      const transitionDuration = nextVideo && transition.type !== 'none' ? transition.duration : 0;

      // Play the main portion of the video (before transition)
      const mainDuration = video.duration - transitionDuration;
      const mainFrames = Math.ceil(mainDuration * this.targetFps);
      
      video.currentTime = 0;
      await video.play().catch(() => {});

      for (let frame = 0; frame < mainFrames; frame++) {
        const targetTime = frame / this.targetFps;
        video.currentTime = Math.min(targetTime, video.duration);
        
        // Wait for video to seek
        await this.waitForSeek(video);
        
        this.ctx!.drawImage(video, 0, 0, this.canvas!.width, this.canvas!.height);
        
        processedFrames++;
        if (processedFrames % 10 === 0) {
          onProgress?.({
            stage: 'processing',
            progress: Math.round((processedFrames / totalFrames) * 100),
            message: `Processing clip ${i + 1} of ${clips.length}...`
          });
        }
        
        await this.sleep(this.frameInterval / 2); // Allow MediaRecorder to capture
      }

      video.pause();

      // Apply transition to next video if exists
      if (nextVideo && transition.type !== 'none' && transitionDuration > 0) {
        const transitionFrames = Math.ceil(transitionDuration * this.targetFps);
        
        nextVideo.currentTime = 0;
        await nextVideo.play().catch(() => {});

        for (let frame = 0; frame < transitionFrames; frame++) {
          const progress = frame / transitionFrames;
          const fromTime = mainDuration + (frame / this.targetFps);
          const toTime = frame / this.targetFps;

          video.currentTime = Math.min(fromTime, video.duration);
          nextVideo.currentTime = Math.min(toTime, nextVideo.duration);
          
          await this.waitForSeek(video);
          await this.waitForSeek(nextVideo);
          
          this.drawTransitionFrame(video, nextVideo, transition.type, progress);
          
          processedFrames++;
          await this.sleep(this.frameInterval / 2);
        }

        nextVideo.pause();
        
        onProgress?.({
          stage: 'processing',
          progress: Math.round((processedFrames / totalFrames) * 100),
          message: `Applied ${transition.type} transition`
        });
      }
    }

    // Stop recording
    this.mediaRecorder.stop();

    onProgress?.({ stage: 'finalizing', progress: 95, message: 'Finalizing video...' });

    // Wait for all data
    await new Promise<void>((resolve) => {
      this.mediaRecorder!.onstop = () => resolve();
    });

    const blob = new Blob(this.recordedChunks, { type: mimeType });
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Video ready!' });
    
    return blob;
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
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
      video.playsInline = true;
      
      video.onloadeddata = () => resolve(video);
      video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
      
      video.src = url;
      video.load();
    });
  }

  private waitForSeek(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      if (video.readyState >= 2) {
        resolve();
      } else {
        video.onseeked = () => resolve();
        setTimeout(resolve, 50); // Fallback timeout
      }
    });
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
          this.ctx!.drawImage(fromVideo, 0, 0, width, height);
          this.ctx!.fillStyle = `rgba(0, 0, 0, ${progress * 2})`;
          this.ctx!.fillRect(0, 0, width, height);
        } else {
          this.ctx!.fillStyle = 'black';
          this.ctx!.fillRect(0, 0, width, height);
          this.ctx!.globalAlpha = (progress - 0.5) * 2;
          this.ctx!.drawImage(toVideo, 0, 0, width, height);
          this.ctx!.globalAlpha = 1;
        }
        break;

      case 'fadewhite':
        if (progress < 0.5) {
          this.ctx!.drawImage(fromVideo, 0, 0, width, height);
          this.ctx!.fillStyle = `rgba(255, 255, 255, ${progress * 2})`;
          this.ctx!.fillRect(0, 0, width, height);
        } else {
          this.ctx!.fillStyle = 'white';
          this.ctx!.fillRect(0, 0, width, height);
          this.ctx!.globalAlpha = (progress - 0.5) * 2;
          this.ctx!.drawImage(toVideo, 0, 0, width, height);
          this.ctx!.globalAlpha = 1;
        }
        break;

      case 'slideleft':
        const slideLeftX = Math.round(width * (1 - progress));
        this.ctx!.drawImage(fromVideo, -Math.round(width * progress), 0, width, height);
        this.ctx!.drawImage(toVideo, slideLeftX, 0, width, height);
        break;

      case 'slideright':
        const slideRightX = -Math.round(width * (1 - progress));
        this.ctx!.drawImage(fromVideo, Math.round(width * progress), 0, width, height);
        this.ctx!.drawImage(toVideo, slideRightX, 0, width, height);
        break;

      case 'wipeleft':
        this.ctx!.drawImage(fromVideo, 0, 0, width, height);
        this.ctx!.save();
        this.ctx!.beginPath();
        this.ctx!.rect(0, 0, Math.round(width * progress), height);
        this.ctx!.clip();
        this.ctx!.drawImage(toVideo, 0, 0, width, height);
        this.ctx!.restore();
        break;

      case 'wiperight':
        this.ctx!.drawImage(fromVideo, 0, 0, width, height);
        this.ctx!.save();
        this.ctx!.beginPath();
        this.ctx!.rect(Math.round(width * (1 - progress)), 0, Math.round(width * progress), height);
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
