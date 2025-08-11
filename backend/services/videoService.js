const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const sharp = require('sharp');

ffmpeg.setFfmpegPath(ffmpegStatic);

class VideoService {
  constructor() {
    this.runwayApiKey = process.env.RUNWAYML_API_KEY;
    
  }

  // Enhanced prompt analysis for better video generation
  analyzePrompt(textPrompt) {
    const prompt = textPrompt.toLowerCase();
    
    const analysis = {
      style: 'cinematic', // default for motion-based prompts
      speed: 'normal',
      transitions: 'fade',
      duration: 6,
      effects: [],
      motionType: 'static', // static, gentle, dynamic, action
      complexity: 'simple', // simple, moderate, complex
      isActionBased: false,
      requiresMotion: false,
      sceneType: 'general'
    };

    // Detect action/motion keywords
    const actionKeywords = [
      'playing', 'running', 'jumping', 'dancing', 'fighting', 'flying', 'swimming',
      'walking', 'talking', 'singing', 'cooking', 'driving', 'working', 'exercise',
      'sport', 'game', 'match', 'performance', 'action', 'movement', 'motion'
    ];

    const sportKeywords = [
      'cricket', 'football', 'basketball', 'tennis', 'soccer', 'baseball',
      'volleyball', 'badminton', 'golf', 'hockey', 'boxing', 'wrestling'
    ];

    const emotionKeywords = [
      'happy', 'sad', 'angry', 'excited', 'calm', 'peaceful', 'dramatic',
      'romantic', 'funny', 'scary', 'mysterious', 'energetic'
    ];

    // Check for action-based content
    analysis.isActionBased = actionKeywords.some(keyword => prompt.includes(keyword));
    analysis.requiresMotion = analysis.isActionBased || sportKeywords.some(keyword => prompt.includes(keyword));

    // Determine motion type
    if (prompt.includes('fast') || prompt.includes('quick') || prompt.includes('rapid') || 
        prompt.includes('action') || sportKeywords.some(keyword => prompt.includes(keyword))) {
      analysis.motionType = 'action';
      analysis.speed = 'fast';
      analysis.duration = 8; // Longer for action sequences
    } else if (prompt.includes('gentle') || prompt.includes('slow') || prompt.includes('peaceful') ||
               prompt.includes('calm') || prompt.includes('smooth')) {
      analysis.motionType = 'gentle';
      analysis.speed = 'slow';
      analysis.duration = 10;
    } else if (analysis.isActionBased) {
      analysis.motionType = 'dynamic';
      analysis.speed = 'normal';
      analysis.duration = 7;
    }

    // Scene type detection
    if (sportKeywords.some(keyword => prompt.includes(keyword))) {
      analysis.sceneType = 'sports';
    } else if (prompt.includes('conversation') || prompt.includes('talking') || prompt.includes('meeting')) {
      analysis.sceneType = 'dialogue';
    } else if (prompt.includes('nature') || prompt.includes('landscape') || prompt.includes('outdoor')) {
      analysis.sceneType = 'nature';
    } else if (prompt.includes('indoor') || prompt.includes('room') || prompt.includes('home')) {
      analysis.sceneType = 'indoor';
    }

    // Complexity assessment
    const complexityIndicators = prompt.split(' ').length;
    if (complexityIndicators > 15 || prompt.includes('and') || prompt.includes('while') || prompt.includes('then')) {
      analysis.complexity = 'complex';
      analysis.duration = Math.max(analysis.duration, 10);
    } else if (complexityIndicators > 8) {
      analysis.complexity = 'moderate';
    }

    // Transition effects based on motion type
    if (analysis.motionType === 'action') {
      analysis.transitions = 'quick_cut';
    } else if (analysis.motionType === 'gentle') {
      analysis.transitions = 'fade';
    } else if (analysis.motionType === 'dynamic') {
      analysis.transitions = 'slide';
    }

    // Effects based on emotions and scene type
    emotionKeywords.forEach(emotion => {
      if (prompt.includes(emotion)) {
        analysis.effects.push(emotion);
      }
    });

    return analysis;
  }

  // Enhanced prompt for RunwayML to generate better motion
  enhancePromptForRunway(originalPrompt, images) {
    const analysis = this.analyzePrompt(originalPrompt);
    let enhancedPrompt = originalPrompt;

    // Add cinematic and motion descriptors based on analysis
    const cinematicTerms = [];
    
    if (analysis.motionType === 'action') {
      cinematicTerms.push('dynamic camera movement', 'fast-paced action', 'energetic motion');
    } else if (analysis.motionType === 'gentle') {
      cinematicTerms.push('smooth camera movement', 'gentle motion', 'fluid animation');
    } else if (analysis.motionType === 'dynamic') {
      cinematicTerms.push('cinematic movement', 'natural motion', 'realistic animation');
    }

    // Add scene-specific enhancements
    if (analysis.sceneType === 'sports') {
      cinematicTerms.push('athletic movement', 'sports action', 'competitive energy');
    } else if (analysis.sceneType === 'dialogue') {
      cinematicTerms.push('natural gestures', 'conversational movement', 'subtle expressions');
    }

    // Add quality and style terms
    const qualityTerms = [
      'high quality',
      '4K resolution',
      'professional cinematography',
      'realistic lighting',
      'natural shadows'
    ];

    // Combine enhanced prompt
    if (cinematicTerms.length > 0) {
      enhancedPrompt += `, ${cinematicTerms.join(', ')}`;
    }
    
    enhancedPrompt += `, ${qualityTerms.slice(0, 2).join(', ')}`;

    // Add motion continuity for multi-image scenarios
    if (images.length > 1) {
      enhancedPrompt += ', seamless transition between scenes, continuous narrative flow';
    }

    console.log(`Original prompt: "${originalPrompt}"`);
    console.log(`Enhanced prompt: "${enhancedPrompt}"`);
    
    return enhancedPrompt;
  }

  // Improved RunwayML generation with better image handling
  async generateWithRunway(images, textPrompt, duration = 5) {
    try {
      if (!this.runwayApiKey) {
        throw new Error('RunwayML API key not configured');
      }

      console.log('Starting RunwayML Gen-3 video generation with prompt:', textPrompt);
      
      const analysis = this.analyzePrompt(textPrompt);
      const enhancedPrompt = this.enhancePromptForRunway(textPrompt, images);
      
      // Adjust duration based on complexity and motion type
      let adjustedDuration = duration;
      if (analysis.complexity === 'complex') {
        adjustedDuration = Math.min(duration + 3, 10);
      } else if (analysis.motionType === 'action') {
        adjustedDuration = Math.min(duration + 2, 10);
      }

      // Process the first image for better results
      let processedImagePath = null;
      if (images.length > 0 && fs.existsSync(images[0].path)) {
        processedImagePath = await this.preprocessImageForRunway(images[0].path, analysis);
      }

      const requestBody = {
        model: 'gen3a_turbo',
        prompt: enhancedPrompt,
        duration: Math.min(Math.max(adjustedDuration, 5), 10),
        ratio: '16:9',
        seed: Math.floor(Math.random() * 1000000),
        // Add more control parameters
        motion_bucket_id: analysis.motionType === 'action' ? 180 : 
                         analysis.motionType === 'gentle' ? 60 : 127,
        cond_aug: 0.02 // Lower for more faithful image adherence
      };

      if (processedImagePath && fs.existsSync(processedImagePath)) {
        const imageBuffer = fs.readFileSync(processedImagePath);
        const base64Image = imageBuffer.toString('base64');
        requestBody.image_prompt = `data:image/jpeg;base64,${base64Image}`;
      }

      console.log('Creating RunwayML generation task with enhanced prompt...');
      const createResponse = await axios.post(
        'https://api.dev.runwayml.com/v1/image_to_video',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.runwayApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const taskId = createResponse.data.id;
      console.log(`RunwayML task created with ID: ${taskId}`);

      // Clean up processed image
      if (processedImagePath && processedImagePath !== images[0].path) {
        fs.unlinkSync(processedImagePath);
      }

      return await this.pollRunwayResult(taskId);

    } catch (error) {
      console.error('RunwayML API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate video with RunwayML: ' + (error.response?.data?.message || error.message));
    }
  }

  // Preprocess image for better RunwayML results
  async preprocessImageForRunway(imagePath, analysis) {
    try {
      const processedPath = path.join('generated', `runway_prep_${Date.now()}.jpg`);
      
      if (!fs.existsSync('generated')) {
        fs.mkdirSync('generated', { recursive: true });
      }

      let imageProcessor = sharp(imagePath)
        .resize(1024, 576, { // RunwayML preferred resolution for 16:9
          fit: 'cover',
          position: 'center'
        });

      // Apply preprocessing based on scene analysis
      if (analysis.sceneType === 'sports' || analysis.motionType === 'action') {
        // Enhance contrast and sharpness for action scenes
        imageProcessor = imageProcessor
          .sharpen({ sigma: 1.5 })
          .modulate({ brightness: 1.05, contrast: 1.1 });
      } else if (analysis.motionType === 'gentle') {
        // Soften for gentle scenes
        imageProcessor = imageProcessor
          .blur(0.5)
          .modulate({ brightness: 1.02, saturation: 0.95 });
      }

      await imageProcessor.jpeg({ quality: 90 }).toFile(processedPath);
      return processedPath;
      
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error.message);
      return imagePath;
    }
  }

  // Enhanced slideshow creation with motion simulation
  async createMotionSimulatedVideo(images, textPrompt, totalDuration = 6) {
    try {
      console.log(`Creating motion-simulated video for: "${textPrompt}"`);
      
      const analysis = this.analyzePrompt(textPrompt);
      const finalDuration = totalDuration || analysis.duration;
      
      const minDuration = 4;
      const maxDuration = 30;
      const validDuration = Math.min(Math.max(finalDuration, minDuration), maxDuration);
      
      // Calculate timing based on complexity and motion type
      let durationPerImage;
      if (analysis.motionType === 'action') {
        durationPerImage = Math.max(validDuration / images.length, 2.0); // Quick cuts for action
      } else if (analysis.motionType === 'gentle') {
        durationPerImage = Math.max(validDuration / images.length, 4.0); // Longer for gentle scenes
      } else {
        durationPerImage = Math.max(validDuration / images.length, 3.0); // Standard duration
      }
      
      console.log(`Motion analysis:`, analysis);
      console.log(`Video settings: ${images.length} images, ${durationPerImage}s each`);
      
      const outputPath = path.join('generated', `motion_video_${Date.now()}.mp4`);
      
      if (!fs.existsSync('generated')) {
        fs.mkdirSync('generated', { recursive: true });
      }

      // Process images with motion-based effects
      const processedImages = [];
      for (let i = 0; i < images.length; i++) {
        const processedPath = path.join('generated', `motion_temp_${i}_${Date.now()}.jpg`);
        
        let imageProcessor = sharp(images[i].path)
          .resize(1920, 1080, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
          });

        // Apply motion-appropriate effects
        if (analysis.motionType === 'action' && analysis.effects.includes('energetic')) {
          imageProcessor = imageProcessor
            .sharpen({ sigma: 2 })
            .modulate({ brightness: 1.1, saturation: 1.3, contrast: 1.2 });
        } else if (analysis.sceneType === 'sports') {
          imageProcessor = imageProcessor
            .sharpen({ sigma: 1.5 })
            .modulate({ brightness: 1.05, saturation: 1.2, contrast: 1.1 });
        }

        await imageProcessor.jpeg({ quality: 95 }).toFile(processedPath);
        processedImages.push(processedPath);
      }

      return new Promise((resolve, reject) => {
        let command = ffmpeg();

        processedImages.forEach(imgPath => {
          command = command
            .input(imgPath)
            .inputOptions([
              '-loop', '1',
              '-t', durationPerImage.toString(),
              '-r', '30'
            ]);
        });

        // Create advanced motion effects based on analysis
        const videoFilters = [];
        const fadeTime = analysis.motionType === 'action' ? 0.3 : 
                        analysis.motionType === 'gentle' ? 1.0 : 0.5;

        for (let i = 0; i < processedImages.length; i++) {
          let filter = `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30`;
          
          // Apply motion-based transforms
          if (analysis.motionType === 'action') {
            // Quick zoom with slight rotation for action
            const zoomStart = 1.0;
            const zoomEnd = 1.2;
            filter += `,zoompan=z='if(lte(on,1),${zoomStart},${zoomStart}+(${zoomEnd}-${zoomStart})*((on-1)/${durationPerImage-1}))':d=${Math.floor(durationPerImage * 30)}:s=1920x1080`;
          } else if (analysis.sceneType === 'sports') {
            // Simulate camera following action
            const panAmount = '1.15';
            filter += `,zoompan=z=${panAmount}:x='if(gte(on,1),(iw-ow)*sin((on-1)*2*PI/${Math.floor(durationPerImage * 30)})/2+(iw-ow)/2,0)':y='if(gte(on,1),(ih-oh)*cos((on-1)*2*PI/${Math.floor(durationPerImage * 30)})/4+(ih-oh)/2,0)':d=${Math.floor(durationPerImage * 30)}:s=1920x1080`;
          } else if (analysis.motionType === 'gentle') {
            // Slow, smooth zoom
            const zoomStart = 1.0;
            const zoomEnd = 1.05;
            filter += `,zoompan=z='${zoomStart}+(${zoomEnd}-${zoomStart})*sin((on-1)*PI/${Math.floor(durationPerImage * 30)})':d=${Math.floor(durationPerImage * 30)}:s=1920x1080`;
          }

          // Apply transitions based on motion type
          if (analysis.transitions === 'quick_cut') {
            // No fade for quick cuts
          } else {
            if (i === 0 && processedImages.length > 1) {
              filter += `,fade=t=out:st=${durationPerImage - fadeTime}:d=${fadeTime}`;
            } else if (i === processedImages.length - 1 && processedImages.length > 1) {
              filter += `,fade=t=in:st=0:d=${fadeTime}`;
            } else if (processedImages.length > 1) {
              filter += `,fade=t=in:st=0:d=${fadeTime},fade=t=out:st=${durationPerImage - fadeTime}:d=${fadeTime}`;
            }
          }
          
          filter += `[v${i}]`;
          videoFilters.push(filter);
        }

        const concatFilter = processedImages.map((_, i) => `[v${i}]`).join('') + 
          `concat=n=${processedImages.length}:v=1:a=0[outv]`;

        // Encoding settings based on motion type
        const crf = analysis.motionType === 'action' ? '16' : '20'; // Higher quality for action

        command
          .complexFilter(`${videoFilters.join(';')};${concatFilter}`)
          .outputOptions([
            '-map', '[outv]',
            '-c:v', 'libx264',
            '-r', '30',
            '-pix_fmt', 'yuv420p',
            '-preset', 'medium',
            '-crf', crf,
            '-movflags', '+faststart'
          ])
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`Processing motion video: ${Math.round(progress.percent)}% done`);
            }
          })
          .on('end', () => {
            console.log('Motion-simulated video creation completed');
            
            // Clean up
            processedImages.forEach(imgPath => {
              if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
              }
            });

            if (fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath);
              console.log(`Output file size: ${stats.size} bytes`);
              
              if (stats.size > 10000) {
                resolve(outputPath);
              } else {
                reject(new Error('Output file too small'));
              }
            } else {
              reject(new Error('Output file not created'));
            }
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            processedImages.forEach(imgPath => {
              if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
              }
            });
            reject(new Error(`Motion video generation failed: ${err.message}`));
          })
          .run();
      });

    } catch (error) {
      console.error('Motion video creation error:', error);
      throw new Error(`Failed to create motion video: ${error.message}`);
    }
  }

  // Main generation method with intelligent routing
  async generateVideo(images, textPrompt, updateProgress, videoOptions = {}) {
    const defaultOptions = {
      duration: 6,
      minDurationPerImage: 1.5,
      maxTotalDuration: 30,
      prioritizeMotion: true // Prioritize methods that can create motion
    };

    const options = { ...defaultOptions, ...videoOptions };
    
    // Enhanced prompt analysis
    const analysis = this.analyzePrompt(textPrompt);
    let totalDuration = parseFloat(options.duration) || analysis.duration;
    totalDuration = Math.min(Math.max(totalDuration, 4), options.maxTotalDuration);
    
    console.log(`Starting intelligent video generation for: "${textPrompt}"`);
    console.log(`Analysis:`, analysis);
    console.log(`Duration: ${totalDuration}s, Images: ${images.length}`);

    // Intelligent method selection based on prompt analysis
    const methods = [
      {
        name: 'RunwayML Gen-3 (AI Motion)',
        method: () => this.generateWithRunway(images, textPrompt, Math.min(totalDuration, 10)),
        enabled: !!this.runwayApiKey,
        priority: analysis.requiresMotion ? 1 : 3, // High priority for motion-based prompts
        suitability: this.calculateSuitability('runway', analysis, images.length)
      },
      {
        name: 'Motion-Simulated Video',
        method: () => this.createMotionSimulatedVideo(images, textPrompt, totalDuration),
        enabled: true,
        priority: analysis.requiresMotion ? 2 : 1, // Good fallback for motion
        suitability: this.calculateSuitability('motion', analysis, images.length)
      },
      {
        name: 'Enhanced Slideshow',
        method: () => this.createPromptBasedVideo(images, textPrompt, totalDuration),
        enabled: true,
        priority: 3, // Lowest priority but always available
        suitability: this.calculateSuitability('slideshow', analysis, images.length)
      }
    ];

    // Sort methods by suitability and priority
    const sortedMethods = methods
      .filter(m => m.enabled)
      .sort((a, b) => (b.suitability * b.priority) - (a.suitability * a.priority));

    for (let i = 0; i < sortedMethods.length; i++) {
      const { name, method } = sortedMethods[i];
      
      try {
        console.log(`Attempting video generation with ${name} (suitability: ${sortedMethods[i].suitability})`);
        if (updateProgress) {
          updateProgress(20 + (i * 40), `Processing with ${name}`);
        }
        
        const result = await method();
        
        if (fs.existsSync(result)) {
          const stats = fs.statSync(result);
          if (stats.size > 10000) {
            console.log(`Successfully generated video with ${name}: ${result}`);
            if (updateProgress) {
              updateProgress(100, 'Video generation completed');
            }
            return result;
          }
        }
        
        console.log(`${name} generated invalid file, trying next method`);
        
      } catch (error) {
        console.log(`${name} failed: ${error.message}`);
        continue;
      }
    }

    throw new Error('All video generation methods failed');
  }

  // Calculate method suitability based on prompt analysis
  calculateSuitability(methodType, analysis, imageCount) {
    let score = 0;

    switch (methodType) {
      case 'runway':
        // RunwayML is best for motion and action
        if (analysis.requiresMotion) score += 3;
        if (analysis.motionType === 'action') score += 2;
        if (analysis.sceneType === 'sports') score += 2;
        if (imageCount <= 2) score += 1; // Works better with fewer images
        if (analysis.complexity === 'complex') score += 1;
        break;

      case 'motion':
        // Motion simulation is good middle ground
        if (analysis.requiresMotion) score += 2;
        if (analysis.motionType !== 'static') score += 1;
        if (imageCount <= 5) score += 1;
        score += 1; // Always decent option
        break;

      case 'slideshow':
        // Slideshow is good for static or simple content
        if (!analysis.requiresMotion) score += 2;
        if (analysis.motionType === 'static') score += 2;
        if (imageCount > 3) score += 1; // Better with more images
        score += 1; // Reliable fallback
        break;
    }

    return Math.max(score, 1); // Minimum score of 1
  }

  // Keep existing methods...
  async pollRunwayResult(taskId) {
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        console.log(`Polling RunwayML task ${taskId}, attempt ${attempts + 1}`);
        
        const response = await axios.get(
          `https://api.dev.runwayml.com/v1/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.runwayApiKey}`
            },
            timeout: 30000
          }
        );

        const task = response.data;
        console.log(`Task status: ${task.status}`);

        if (task.status === 'SUCCEEDED') {
          const videoUrl = task.output[0];
          const videoPath = path.join('generated', `runway_video_${Date.now()}.mp4`);
          
          console.log('Downloading generated video from RunwayML...');
          const videoResponse = await axios.get(videoUrl, {
            responseType: 'stream',
            timeout: 60000
          });

          const writer = fs.createWriteStream(videoPath);
          videoResponse.data.pipe(writer);

          return new Promise((resolve, reject) => {
            writer.on('finish', () => {
              console.log(`RunwayML video saved to: ${videoPath}`);
              resolve(videoPath);
            });
            writer.on('error', reject);
          });
        }

        if (task.status === 'FAILED') {
          throw new Error(`RunwayML generation failed: ${task.failure_reason || 'Unknown error'}`);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;

      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    throw new Error('RunwayML video generation timeout');
  }

  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration;
          resolve(duration);
        }
      });
    });
  }
}

module.exports = new VideoService();