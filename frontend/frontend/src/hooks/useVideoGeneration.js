import { useState, useCallback } from 'react';
import { uploadImages, getVideoStatus } from '../services/api';

export const useVideoGeneration = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [textPrompt, setTextPrompt] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = useCallback(() => {
    setSelectedImages([]);
    setTextPrompt('');
    setVideoTitle('');
    setCurrentVideo(null);
    setError(null);
  }, []);

  const startGeneration = useCallback(async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image');
      return;
    }

    if (!textPrompt.trim()) {
      setError('Please enter a text prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });
      formData.append('textPrompt', textPrompt.trim());
      formData.append('title', videoTitle.trim() || 'Untitled Video');

      const response = await uploadImages(formData);
      setCurrentVideo(response.video);
      
      // Start polling for status updates
      pollVideoStatus(response.videoId);
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [selectedImages, textPrompt, videoTitle]);

  const pollVideoStatus = useCallback(async (videoId) => {
    const maxPolls = 120; // 10 minutes max (5 second intervals)
    let pollCount = 0;

    const poll = async () => {
      try {
        const videoData = await getVideoStatus(videoId);
        setCurrentVideo(videoData);

        if (videoData.status === 'completed' || videoData.status === 'failed') {
          setLoading(false);
          return;
        }

        if (pollCount < maxPolls) {
          pollCount++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setError('Video generation timeout');
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    poll();
  }, []);

  return {
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
  };
};