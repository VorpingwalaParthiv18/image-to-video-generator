const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const Video = require('../models/video');
const videoService = require('../services/videoService');
const fs = require('fs');
const path = require('path');

// Ensure generated directory exists
const generatedDir = 'generated/';
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

// Upload images and create video project
router.post('/upload', upload.array('images', 3), async (req, res) => {
  try {
    const { textPrompt, title, duration = 6 } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    if (!textPrompt || textPrompt.trim() === '') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    // Fixed duration validation - ensure minimum 5 seconds
    let requestedDuration = parseFloat(duration);
    if (!requestedDuration || isNaN(requestedDuration) || requestedDuration < 5) {
      console.log(`Invalid duration ${duration}, using default 6 seconds`);
      requestedDuration = 6;
    }

    // Limit maximum duration to 60 seconds for better performance
    const maxDuration = 60;
    if (requestedDuration > maxDuration) {
      requestedDuration = maxDuration;
      console.log(`Duration capped at ${maxDuration} seconds`);
    }

    // Calculate proper duration per image (minimum 2 seconds)
    const minDurationPerImage = 2;
    const calculatedDurationPerImage = Math.max(requestedDuration / req.files.length, minDurationPerImage);
    const adjustedTotalDuration = calculatedDurationPerImage * req.files.length;

    console.log(`Video setup: ${req.files.length} images, ${calculatedDurationPerImage}s per image, total: ${adjustedTotalDuration}s`);

    // Determine processing complexity
    let complexity = 'simple';
    let estimatedTime = '1-2 minutes';
    
    if (adjustedTotalDuration > 15) {
      complexity = 'medium';
      estimatedTime = '2-3 minutes';
    }
    if (adjustedTotalDuration > 30) {
      complexity = 'complex';
      estimatedTime = '3-5 minutes';
    }

    // Create video record with corrected metadata
    const video = new Video({
      title: title || 'Generated Video',
      images: req.files.map(file => ({
        filename: file.filename,
        path: file.path
      })),
      textPrompt: textPrompt.trim(),
      status: 'pending',
      duration: adjustedTotalDuration,
      durationPerImage: calculatedDurationPerImage,
      imageCount: req.files.length,
      complexity: complexity,
      estimatedProcessingTime: estimatedTime,
      processingProgress: 0,
      processingStage: 'Queued for processing'
    });

    await video.save();

    // Start video generation
    generateVideoBackground(video._id);

    res.json({
      success: true,
      videoId: video._id,
      message: `Video generation started. Expected duration: ${adjustedTotalDuration} seconds`,
      video: {
        id: video._id,
        title: video.title,
        status: video.status,
        textPrompt: video.textPrompt,
        duration: adjustedTotalDuration,
        durationPerImage: calculatedDurationPerImage,
        imageCount: req.files.length,
        complexity: complexity,
        estimatedProcessingTime: estimatedTime,
        images: video.images.map(img => ({
          filename: img.filename,
          url: `/uploads/${img.filename}`
        })),
        createdAt: video.createdAt
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Get video status with duration verification
router.get('/video/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    let processingTime = null;
    if (video.status === 'completed' && video.completedAt && video.createdAt) {
      processingTime = Math.round((video.completedAt - video.createdAt) / 1000);
    }

    // Enhanced video file verification
    let videoFileInfo = null;
    let actualDuration = null;
    
    if (video.generatedVideoPath && fs.existsSync(video.generatedVideoPath)) {
      const stats = fs.statSync(video.generatedVideoPath);
      videoFileInfo = {
        size: stats.size,
        sizeReadable: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
        exists: true
      };

      // Try to get actual video duration
      try {
        actualDuration = await videoService.getVideoDuration(video.generatedVideoPath);
        console.log(`Video ${video._id} actual duration: ${actualDuration}s`);
      } catch (err) {
        console.log('Could not determine video duration:', err.message);
      }
    }

    res.json({
      id: video._id,
      title: video.title,
      status: video.status,
      textPrompt: video.textPrompt,
      expectedDuration: video.duration,
      actualDuration: actualDuration,
      durationPerImage: video.durationPerImage,
      imageCount: video.imageCount,
      complexity: video.complexity,
      estimatedProcessingTime: video.estimatedProcessingTime,
      actualProcessingTime: processingTime,
      images: video.images.map(img => ({
        filename: img.filename,
        url: `/uploads/${img.filename}`
      })),
      generatedVideoPath: video.generatedVideoPath,
      generatedVideoUrl: video.generatedVideoPath ? `/${video.generatedVideoPath}` : null,
      videoFileInfo: videoFileInfo,
      createdAt: video.createdAt,
      completedAt: video.completedAt,
      error: video.error,
      processingProgress: video.processingProgress,
      processingStage: video.processingStage
    });

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to get video info: ' + error.message });
  }
});

// Enhanced background video generation
async function generateVideoBackground(videoId) {
  try {
    const video = await Video.findById(videoId);
    if (!video) {
      console.error('Video not found:', videoId);
      return;
    }

    console.log(`Starting video generation for "${video.title}" - Expected: ${video.duration}s`);
    
    // Update to processing status
    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 10,
      processingStage: 'Initializing video generation'
    });

    const updateProgress = async (progress, stage) => {
      try {
        await Video.findByIdAndUpdate(videoId, {
          processingProgress: progress,
          processingStage: stage
        });
        console.log(`Progress: ${progress}% - ${stage}`);
      } catch (err) {
        console.error('Failed to update progress:', err);
      }
    };

    // Prepare generation options with guaranteed minimum duration
    const videoOptions = {
      duration: Math.max(video.duration || 6, 5), // Ensure minimum 5 seconds
      minDurationPerImage: video.durationPerImage || 2,
      maxTotalDuration: 60
    };

    console.log('Generation options:', videoOptions);

    await updateProgress(20, `Generating ${videoOptions.duration}s video`);

    // Generate the video
    const generatedPath = await videoService.generateVideo(
      video.images,
      video.textPrompt,
      updateProgress,
      videoOptions
    );

    // Verify the generated video
    if (!fs.existsSync(generatedPath)) {
      throw new Error('Generated video file not found');
    }

    const videoStats = fs.statSync(generatedPath);
    if (videoStats.size < 10000) {
      throw new Error('Generated video file is too small (likely corrupted)');
    }

    // Get actual video duration for verification
    let actualDuration = null;
    try {
      actualDuration = await videoService.getVideoDuration(generatedPath);
      console.log(`Generated video duration: ${actualDuration}s (expected: ${video.duration}s)`);
    } catch (err) {
      console.log('Could not verify video duration:', err.message);
    }

    // Update completion status
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      generatedVideoPath: generatedPath,
      completedAt: new Date(),
      processingProgress: 100,
      processingStage: `Video completed (${actualDuration ? `${actualDuration.toFixed(1)}s` : 'duration unknown'})`
    });

    console.log(`Video generation completed: ${generatedPath} (${videoStats.size} bytes)`);

  } catch (error) {
    console.error('Video generation failed:', error);
    
    // Enhanced error handling
    let errorMessage = error.message;
    if (error.message.includes('duration')) {
      errorMessage = 'Video duration processing failed. Please try again.';
    } else if (error.message.includes('FFmpeg')) {
      errorMessage = 'Video encoding failed. Check your images and try again.';
    } else if (error.message.includes('RunwayML')) {
      errorMessage = 'AI video generation failed. Falling back to slideshow mode.';
    }

    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      error: errorMessage,
      processingProgress: 0,
      processingStage: 'Generation failed',
      failedAt: new Date()
    });
  }
}

// Test endpoint with duration verification
router.post('/test-video', upload.array('images', 3), async (req, res) => {
  try {
    const { textPrompt = 'Test video', duration = 6 } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded for test' });
    }

    const testDuration = Math.max(parseFloat(duration) || 6, 5);
    console.log(`Testing video generation: ${testDuration}s total`);
    
    const outputPath = await videoService.createSlideshow(
      req.files,
      textPrompt,
      testDuration
    );

    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      
      // Get actual duration
      let actualDuration = null;
      try {
        actualDuration = await videoService.getVideoDuration(outputPath);
      } catch (err) {
        console.log('Could not get test video duration:', err.message);
      }

      res.json({
        success: true,
        message: 'Test video generated successfully',
        videoPath: outputPath,
        videoUrl: `/${outputPath}`,
        fileSize: stats.size,
        fileSizeReadable: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
        expectedDuration: testDuration,
        actualDuration: actualDuration,
        imageCount: req.files.length
      });
    } else {
      res.status(500).json({ error: 'Test video file not created' });
    }

  } catch (error) {
    console.error('Test video error:', error);
    res.status(500).json({ error: 'Test video failed: ' + error.message });
  }
});

// Health check with duration info
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Video generation service is running',
    features: {
      minDuration: '5 seconds',
      maxDuration: '60 seconds',
      defaultDuration: '6 seconds',
      minDurationPerImage: '2 seconds',
      supportedFormats: ['jpg', 'jpeg', 'png'],
      maxImages: 3,
      videoFormats: ['mp4'],
      aiProviders: ['RunwayML Gen-3', 'Slideshow fallback']
    }
  });
});

// Get all videos
router.get('/videos', async (req, res) => {
  try {
    const { status, complexity, limit = 50 } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (complexity) filter.complexity = complexity;

    const videos = await Video.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title status textPrompt createdAt completedAt images generatedVideoPath duration durationPerImage complexity processingProgress imageCount');
      
    const videosWithUrls = videos.map(video => ({
      ...video.toObject(),
      generatedVideoUrl: video.generatedVideoPath ? `/${video.generatedVideoPath}` : null,
      images: video.images.map(img => ({
        filename: img.filename,
        url: `/uploads/${img.filename}`
      }))
    }));

    res.json(videosWithUrls);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to fetch videos: ' + error.message });
  }
});

// Delete video
router.delete('/video/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete uploaded images
    video.images.forEach(img => {
      if (fs.existsSync(img.path)) {
        fs.unlinkSync(img.path);
      }
    });

    // Delete generated video
    if (video.generatedVideoPath && fs.existsSync(video.generatedVideoPath)) {
      fs.unlinkSync(video.generatedVideoPath);
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Video deleted successfully' });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video: ' + error.message });
  }
});

// Enhanced statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = await Video.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    const complexityStats = await Video.aggregate([
      {
        $group: {
          _id: '$complexity',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    const durationStats = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          minDuration: { $min: '$duration' },
          maxDuration: { $max: '$duration' }
        }
      }
    ]);

    res.json({
      statusStats: stats,
      complexityStats: complexityStats,
      durationStats: durationStats[0] || {},
      totalVideos: await Video.countDocuments()
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;