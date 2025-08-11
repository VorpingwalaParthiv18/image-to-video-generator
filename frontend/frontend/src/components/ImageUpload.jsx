import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

const ImageUpload = ({ onImagesSelect, selectedImages }) => {
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    // Create preview URLs for selected images
    const newPreviews = selectedImages.map((file, index) => ({
      id: index,
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setPreviews(newPreviews);

    // Cleanup function to revoke object URLs
    return () => {
      newPreviews.forEach(item => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [selectedImages]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      alert('Some files were rejected. Please upload only image files (JPG, PNG, GIF).');
    }

    const currentCount = selectedImages.length;
    const newFilesCount = acceptedFiles.length;
    
    if (currentCount + newFilesCount > 3) {
      alert('Maximum 3 images allowed');
      return;
    }

    const validFiles = acceptedFiles.slice(0, 3 - currentCount);
    onImagesSelect([...selectedImages, ...validFiles]);
  }, [selectedImages, onImagesSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 3,
    disabled: selectedImages.length >= 3
  });

  const removeImage = (indexToRemove) => {
    const newImages = selectedImages.filter((_, index) => index !== indexToRemove);
    onImagesSelect(newImages);
  };

  return (
    <div className="image-upload-section">
      <div className="section-header">
        <h3>📸 Step 1: Upload Images</h3>
        <p>Select up to 3 images that will be transformed into a video</p>
      </div>
      
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${selectedImages.length >= 3 ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <div className="upload-icon">
            {selectedImages.length >= 3 ? '✅' : '📤'}
          </div>
          <p>
            {selectedImages.length >= 3
              ? 'Maximum images selected (3/3)'
              : isDragActive
              ? 'Drop the images here...'
              : 'Drag & drop images here, or click to select files'
            }
          </p>
          <p className="upload-hint">
            Supports: JPG, PNG, GIF • Max 3 files • Up to 10MB each
          </p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="image-previews">
          <h4>Selected Images ({previews.length}/3):</h4>
          <div className="preview-grid">
            {previews.map((item, index) => (
              <div key={item.id} className="preview-item">
                <div className="preview-image-container">
                  <img 
                    src={item.preview} 
                    alt={`Preview ${index + 1}`}
                    className="preview-image"
                  />
                  <button 
                    onClick={() => removeImage(index)}
                    className="remove-button"
                    type="button"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                  <div className="image-number">{index + 1}</div>
                </div>
                <div className="image-info">
                  <span className="filename" title={item.file.name}>
                    {item.file.name.length > 20 
                      ? `${item.file.name.substring(0, 20)}...` 
                      : item.file.name
                    }
                  </span>
                  <span className="filesize">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="order-hint">
            💡 Images will be processed in the order shown above
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;