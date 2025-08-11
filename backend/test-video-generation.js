// test-video-generation.js - Run this to test your video generation
const videoService = require('./services/videoService');
const fs = require('fs');
const path = require('path');

async function testVideoGeneration() {
  console.log('Starting video generation test...');
  
  // Create test images array (replace with your actual uploaded image paths)
  const testImages = [
    { path: 'uploads/test-image1.jpg' }, // Replace with actual image paths
    { path: 'uploads/test-image2.jpg' },
    { path: 'uploads/test-image3.jpg' }
  ].filter(img => fs.existsSync(img.path)); // Only include existing images

  if (testImages.length === 0) {
    console.error('No test images found. Please add some images to the uploads/ directory');
    return;
  }

  const testPrompt = 'A beautiful slideshow of images with smooth transitions';
  const testDuration = 6; // 6 seconds total

  console.log(`Testing with ${testImages.length} images, ${testDuration} seconds total`);

  try {
    // Test progress callback
    const updateProgress = (progress, stage) => {
      console.log(`Progress: ${progress}% - ${stage}`);
    };

    // Test video generation
    const result = await videoService.generateVideo(
      testImages,
      testPrompt,
      updateProgress,
      { duration: testDuration }
    );

    console.log('✅ Video generation successful!');
    console.log('Generated video:', result);

    // Verify the video file
    if (fs.existsSync(result)) {
      const stats = fs.statSync(result);
      console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

      // Try to get duration
      try {
        const actualDuration = await videoService.getVideoDuration(result);
        console.log(`Video duration: ${actualDuration} seconds`);
        
        if (actualDuration >= 5) {
          console.log('✅ Video duration is correct (>= 5 seconds)');
        } else {
          console.log('⚠️  Video duration is less than expected');
        }
      } catch (err) {
        console.log('Could not determine video duration:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ Video generation failed:', error.message);
  }
}

// Run the test
testVideoGeneration().catch(console.error);

// Export for use in other scripts
module.exports = { testVideoGeneration };