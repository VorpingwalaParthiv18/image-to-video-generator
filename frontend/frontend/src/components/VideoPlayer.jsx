import React, { useState, useEffect } from 'react';
import { getAllVideos, deleteVideo, getVideoUrl } from '../services/api';

const VideoGallery = ({ onVideoSelect }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const videoData = await getAllVideos();
      setVideos(videoData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await deleteVideo(videoId);
      setVideos(videos.filter(video => video._id !== videoId));
    } catch (err) {
      alert('Failed to delete video: ' + err.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'processing': return 'status-processing';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner"></div>
        <p>Loading your videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-error">
        <p>Failed to load videos: {error}</p>
        <button onClick={fetchVideos} className="retry-button">
          🔄 Retry
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="gallery-empty">
        <div className="empty-icon">📹</div>
        <h3>No videos yet</h3>
        <p>Create your first AI-generated video using the form above!</p>
      </div>
    );
  }

  return (
    <div className="video-gallery">
      <div className="gallery-header">
        <h3>🎥 Your Video Gallery</h3>
        <p>View and manage all your AI-generated videos</p>
      </div>

      <div className="gallery-grid">
        {videos.map((video) => (
          <div key={video._id} className="gallery-item">
            <div className="video-thumbnail">
              {video.images && video.images[0] ? (
                <img 
                  src={getVideoUrl(video.images[0].url)} 
                  alt={video.title}
                  className="thumbnail-image"
                />
              ) : (
                <div className="placeholder-thumbnail">
                  <span>📽️</span>
                </div>
              )}
              
              <div className={`status-badge ${getStatusBadgeClass(video.status)}`}>
                {video.status}
              </div>

              {video.status === 'completed' && (
                <div className="play-overlay">
                  <button 
                    onClick={() => onVideoSelect(video)}
                    className="play-button"
                  >
                    ▶️
                  </button>
                </div>
              )}
            </div>

            <div className="video-info">
              <h4 className="video-title" title={video.title}>
                {video.title || 'Untitled Video'}
              </h4>
              
              <p className="video-prompt" title={video.textPrompt}>
                {video.textPrompt.length > 60 
                  ? `${video.textPrompt.substring(0, 60)}...` 
                  : video.textPrompt
                }
              </p>

              <div className="video-meta">
                <span className="creation-date">
                  {new Date(video.createdAt).toLocaleDateString()}
                </span>
                <span className="image-count">
                  {video.images?.length || 0} images
                </span>
              </div>

              <div className="video-actions">
                <button 
                  onClick={() => onVideoSelect(video)}
                  className="action-btn view-btn"
                >
                  👁️ View
                </button>
                
                {video.status === 'completed' && video.generatedVideoUrl && (
                  <a 
                    href={getVideoUrl(video.generatedVideoUrl)}
                    download={`${video.title || 'video'}.mp4`}
                    className="action-btn download-btn"
                  >
                    📥 Download
                  </a>
                )}
                
                <button 
                  onClick={() => handleDelete(video._id)}
                  className="action-btn delete-btn"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="gallery-footer">
        <button 
          onClick={fetchVideos}
          className="refresh-button"
        >
          🔄 Refresh Gallery
        </button>
      </div>
    </div>
  );
};

export default VideoGallery;