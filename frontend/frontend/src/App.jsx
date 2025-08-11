import React, { useState } from 'react';
import './App.css';
import ImageUpload from './components/ImageUpload';
import TextPrompt from './components/TextPrompt';
import VideoPlayer from './components/VideoPlayer';
import VideoGallery from './components/VideoGallery';
import { useVideoGeneration } from './hooks/useVideoGeneration';

function App() {
  const [activeView, setActiveView] = useState('create'); // 'create' or 'gallery'
  const [selectedVideo, setSelectedVideo] = useState(null);

  const {
    selectedImages,
    setSelectedImages,
    textPrompt,
    setTextPrompt,
    videoTitle,
    setVideoTitle,
    currentVideo,
    loading,
    error,
    startGeneration,
    resetForm
  } = useVideoGeneration();

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setActiveView('create');
  };

  const handleStartOver = () => {
    resetForm();
    setSelectedVideo(null);
  };

  const canGenerate = selectedImages.length > 0 && textPrompt.trim().length > 0 && !loading;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🎬 AI Video Generator</h1>
          <p>Transform your images into stunning videos with the power of AI</p>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeView === 'create' ? 'active' : ''}`}
              onClick={() => setActiveView('create')}
            >
              ✨ Create Video
            </button>
            <button 
              className={`nav-tab ${activeView === 'gallery' ? 'active' : ''}`}
              onClick={() => setActiveView('gallery')}
            >
              🎥 My Videos
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {activeView === 'create' ? (
            <>
              <div className="creation-workflow">
                {!currentVideo && !selectedVideo && (
                  <>
                    <ImageUpload 
                      onImagesSelect={setSelectedImages}
                      selectedImages={selectedImages}
                    />

                    <TextPrompt 
                      onPromptChange={setTextPrompt}
                      prompt={textPrompt}
                      onTitleChange={setVideoTitle}
                      title={videoTitle}
                    />

                    {error && (
                      <div className="error-message">
                        <div className="error-icon">⚠️</div>
                        <p>{error}</p>
                      </div>
                    )}

                    <div className="generation-controls">
                      <button 
                        onClick={startGeneration}
                        disabled={!canGenerate}
                        className={`generate-button ${canGenerate ? 'ready' : 'disabled'}`}
                      >
                        {loading ? (
                          <>
                            <span className="loading-icon">🔄</span>
                            Starting Generation...
                          </>
                        ) : (
                          <>
                            <span className="magic-icon">✨</span>
                            Generate AI Video
                          </>
                        )}
                      </button>

                      {(selectedImages.length > 0 || textPrompt) && (
                        <button 
                          onClick={handleStartOver}
                          className="reset-button"
                        >
                          🔄 Start Over
                        </button>
                      )}
                    </div>

                    <div className="workflow-info">
                      <div className="info-grid">
                        <div className="info-card">
                          <h4>🚀 How it works</h4>
                          <ol>
                            <li>Upload 1-3 images</li>
                            <li>Describe your vision</li>
                            <li>AI generates your video</li>
                            <li>Download and share</li>
                          </ol>
                        </div>
                        <div className="info-card">
                          <h4>⚡ Generation Time</h4>
                          <p>Most videos are ready in 2-5 minutes. Complex animations may take longer.</p>
                        </div>
                        <div className="info-card">
                          <h4>📱 Supported Formats</h4>
                          <p>Input: JPG, PNG, GIF<br />Output: MP4 (1920x1080)</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {(currentVideo || selectedVideo) && (
                  <VideoPlayer 
                    videoId={currentVideo?.id || selectedVideo?._id}
                    initialVideoData={selectedVideo || currentVideo}
                  />
                )}

                {(currentVideo || selectedVideo) && (
                  <div className="post-generation-actions">
                    <button 
                      onClick={handleStartOver}
                      className="new-video-button"
                    >
                      ➕ Create Another Video
                    </button>
                    <button 
                      onClick={() => setActiveView('gallery')}
                      className="view-gallery-button"
                    >
                      🎥 View All Videos
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <VideoGallery onVideoSelect={handleVideoSelect} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>Made with ❤️ using AI technology</p>
          <div className="footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;