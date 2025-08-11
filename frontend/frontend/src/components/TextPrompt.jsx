import React, { useState } from 'react';

const TextPrompt = ({ onPromptChange, prompt, onTitleChange, title }) => {
  const [activeCategory, setActiveCategory] = useState('cinematic');

  const suggestionCategories = {
    cinematic: {
      name: '🎬 Cinematic',
      suggestions: [
        "A cinematic transition between the images with smooth camera movement",
        "Slow zoom into the scene with dramatic lighting changes",
        "Pan across the images with a film-like depth of field effect",
        "Create a movie trailer style montage with epic transitions"
      ]
    },
    magical: {
      name: '✨ Magical',
      suggestions: [
        "Transform the scene with magical particles and glowing effects",
        "Add sparkles and fairy dust floating through the scene",
        "Create a dreamy, ethereal atmosphere with floating elements",
        "Mystical transformation with swirling energy and light"
      ]
    },
    nature: {
      name: '🌿 Nature',
      suggestions: [
        "Add gentle wind effects making elements sway naturally",
        "Create realistic water ripples and flowing effects",
        "Animate the scene with falling leaves or petals",
        "Add atmospheric effects like mist, clouds, or rain"
      ]
    },
    artistic: {
      name: '🎨 Artistic',
      suggestions: [
        "Transform into a painting-like animation with brush strokes",
        "Create a time-lapse effect showing artistic progression",
        "Add abstract geometric shapes and color transitions",
        "Morph between different art styles and techniques"
      ]
    },
    dynamic: {
      name: '⚡ Dynamic',
      suggestions: [
        "High-energy transitions with quick cuts and movements",
        "Add explosive effects and dynamic camera rotations",
        "Create fast-paced action with motion blur effects",
        "Energetic scene changes with vibrant color shifts"
      ]
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onPromptChange(suggestion);
  };

  const characterCount = prompt.length;
  const isNearLimit = characterCount > 400;
  const isAtLimit = characterCount >= 500;

  return (
    <div className="text-prompt-section">
      <div className="section-header">
        <h3>✍️ Step 2: Describe Your Vision</h3>
        <p>Tell the AI how you want your images transformed into video</p>
      </div>

      <div className="input-group">
        <label htmlFor="video-title" className="input-label">
          Video Title (Optional)
        </label>
        <input
          id="video-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Give your video a memorable title..."
          className="title-input"
          maxLength={100}
        />
      </div>
      
      <div className="input-group">
        <label htmlFor="text-prompt" className="input-label">
          Video Description *
        </label>
        <div className="prompt-input-container">
          <textarea
            id="text-prompt"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Describe how you want your images to be transformed into a video. Be specific about movements, effects, transitions, mood, and style you envision..."
            className={`prompt-textarea ${isNearLimit ? 'near-limit' : ''} ${isAtLimit ? 'at-limit' : ''}`}
            rows={5}
            maxLength={500}
            required
          />
          <div className={`character-count ${isNearLimit ? 'warning' : ''}`}>
            {characterCount}/500 characters
            {isNearLimit && <span className="limit-warning"> (approaching limit)</span>}
          </div>
        </div>
      </div>

      <div className="suggestions-section">
        <h4>💡 Get Inspired - Click to Use:</h4>
        
        <div className="category-tabs">
          {Object.entries(suggestionCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`category-tab ${activeCategory === key ? 'active' : ''}`}
              type="button"
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="suggestions-grid">
          {suggestionCategories[activeCategory].suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-button"
              type="button"
            >
              <span className="suggestion-text">{suggestion}</span>
              <span className="use-button">Use This</span>
            </button>
          ))}
        </div>
      </div>

      <div className="prompt-tips">
        <h4>🎯 Pro Tips for Better Results:</h4>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🎥</div>
            <div className="tip-content">
              <strong>Camera Movements</strong>
              <p>Specify zoom in/out, pan left/right, rotate, or tracking shots</p>
            </div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">🌟</div>
            <div className="tip-content">
              <strong>Visual Effects</strong>
              <p>Add particles, lighting changes, weather effects, or magical elements</p>
            </div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">🎨</div>
            <div className="tip-content">
              <strong>Style & Mood</strong>
              <p>Mention the desired atmosphere: dreamy, dramatic, realistic, vintage</p>
            </div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">⚡</div>
            <div className="tip-content">
              <strong>Pacing</strong>
              <p>Describe speed: slow motion, time-lapse, smooth, or quick transitions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextPrompt;