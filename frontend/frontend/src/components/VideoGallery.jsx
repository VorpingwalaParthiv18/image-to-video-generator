import React, { useState, useEffect } from 'react';
import { getVideoStatus, getVideoUrl } from '../services/api';

const VideoPlayer = ({ videoId, initialVideoData }) => {
  const [video, setVideo] = useState(initialVideoData || null);
  const [loading, setLoading] = useState(!initialVideoData);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!videoId) return;

    let pollInterval;
    
    const fetchVideoStatus = async () => {
      try {
        const videoData = await getVideoStatus(videoId);
        setVideo(videoData);
        setLoading(false);
        setError(null);

        // Continue polling if still processing
        if (videoData.status === 'processing' || videoData.status === 'pending') {
          pollInterval = setTimeout(fetchVideoStatus, 3000);
        }
      } catch (err) {
        console.error('Failed to fetch video status:', err);
        setError(err.message);
        setLoading(false);
        
        // Retry mechanism
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchVideoStatus();
          }, 5000);
        }
      }
    };

    if (!initialVideoData) {
      fetchVideoStatus();
    }

    return () => {
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
    };
  }, [videoId, initialVideoData, retryCount]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending': return 'Your video is queued for processing...';
      case 'processing': return 'Generating your video with AI... This may take a few minutes.';
      case 'completed': return 'Your video is ready! 🎉';
      case 'failed': return 'Video generation failed. Please try again.';
      default: return 'Unknown status';
    }
  };

  const getProgressPercentage = (status, progress = 0) => {
    switch (status) {
      case 'pending': return 5;
      case 'processing': return Math.max(10, progress || 50);
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  };

  const handleDownload = () => {
    if (video?.generatedVideoUrl) {
      const link = document.createElement('a');
      link.href = getVideoUrl(video.generatedVideoUrl);
      link.download = `${video.title || 'video'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    const videoUrl = getVideoUrl(video?.generatedVideoUrl);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'My AI Generated Video',
          text: 'Check out this video I created with AI!',
          url: videoUrl,
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(videoUrl);
        alert('Video link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(videoUrl);
      alert('Video link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="video-player-section">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading video status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-player-section">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setRetryCount(0);
              setLoading(true);
            }}
            className="retry-button"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="video-player-section">
        <div className="empty-state">
          <p>No video data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-section">
      <div className="section-header">
        <h3>🎬 Step 3: Your AI Generated Video</h3>
      </div>
      
      <div className="video-container">
        <div className="video-header">
          <div className="video-info">
            <h4 className="video-title">{video.title}</h4>
            <div className="video-meta">
              <span className="creation-time">
                Created {new Date(video.createdAt).toLocaleDateString()}
              </span>
              <span className="image-count">
                {video.images?.length || 0} images
              </span>
            </div>
          </div>
          <div className="status-badge">
            <span className="status-icon">{getStatusIcon(video.status)}</span>
            <span className="status-text">{video.status}</span>
          </div>
        </div>

        <div className="status-section">
          <div className="status-message">
            <p>{getStatusMessage(video.status)}</p>
          </div>
          
          {(video.status === 'pending' || video.status === 'processing') && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${getProgressPercentage(video.status, video.processingProgress)}%` 
                  }}
                ></div>
              </div>
              <div className="progress-text">
                {getProgressPercentage(video.status, video.processingProgress)}%
              </div>
            </div>
          )}

          {video.status === 'processing' && (
            <div className="processing-steps">
              <div className="step active">🖼️ Analyzing images</div>
              <div className="step active">🤖 Applying AI magic</div>
              <div className="step">🎬 Rendering video</div>
            </div>
          )}
        </div>

        {video.textPrompt && (
          <div className="prompt-display">
            <h5>Your Prompt:</h5>
            <p>"{video.textPrompt}"</p>
          </div>
        )}

        {video.images && video.images.length > 0 && (
          <div className="source-images">
            <h5>Source Images:</h5>
            <div className="image-thumbnails">
              {video.images.map((img, index) => (
                <img
                  key={index}
                  src={getVideoUrl(img.url)}
                  alt={`Source ${index + 1}`}
                  className="thumbnail"
                />
              ))}
            </div>
          </div>
        )}

        {video.status === 'completed' && video.generatedVideoUrl && (
          <div className="video-result">
            <div className="video-wrapper">
              <video 
                controls 
                preload="metadata"
                className="generated-video"
                poster={video.images?.[0] ? getVideoUrl(video.images[0].url) : undefined}
              >
                <source 
                  src={getVideoUrl(video.generatedVideoUrl)} 
                  type="video/mp4" 
                />
                Your browser does not support the video tag.
              </video>
            </div>
            
            <div className="video-actions">
              <button 
                onClick={handleDownload}
                className="action-button primary"
              >
                📥 Download Video
              </button>
              <button 
                onClick={handleShare}
                className="action-button secondary"
              >
                🔗 Share
              </button>
            </div>

            <div className="completion-info">
              <p>
                ✨ Generated in {
                  video.completedAt && video.createdAt
                    ? Math.round((new Date(video.completedAt) - new Date(video.createdAt)) / 1000 / 60)
                    : '?'
                } minutes
              </p>
            </div>
          </div>
        )}

        {video.status === 'failed' && (
          <div className="error-result">
            <div className="error-icon">💥</div>
            <h4>Generation Failed</h4>
            <p>{video.error || 'An unknown error occurred during video generation.'}</p>
            <div className="error-actions">
              <button 
                onClick={() => window.location.reload()}
                className="action-button primary"
              >
                🔄 Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
