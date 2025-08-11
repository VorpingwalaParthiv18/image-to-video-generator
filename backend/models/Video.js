const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  images: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  textPrompt: {
    type: String,
    required: true
  },
  generatedVideoPath: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  error: String,
  processingProgress: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Video', videoSchema);
