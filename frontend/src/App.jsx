import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = 'http://localhost:8000'

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Environment Management - Multiple API Keys
  const [showEnvModal, setShowEnvModal] = useState(false)
  const [geminiKeys, setGeminiKeys] = useState([]) // Array of {id, name, key, enabled, lastUsed}
  const [elevenLabsKeys, setElevenLabsKeys] = useState([]) // Array of {id, name, key, enabled, lastUsed}
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Cleanup Modal
  const [showCleanupModal, setShowCleanupModal] = useState(false)
  
  // Preview Modal
  const [showPreview, setShowPreview] = useState(false)
  const [previewType, setPreviewType] = useState('') // 'video', 'audio', 'final'
  const [previewSrc, setPreviewSrc] = useState('')
  
  // Step 1: Download
  const [videoUrl, setVideoUrl] = useState('')
  const [downloadedVideo, setDownloadedVideo] = useState(null)
  
  // Step 2: Script
  const [script, setScript] = useState('')
  const [audioPath, setAudioPath] = useState('')
  const [translating, setTranslating] = useState(false)
  
  // Step 3: Generate Video
  const [bgmPath, setBgmPath] = useState('bgm/fun.mp3')
  const [sfxPath, setSfxPath] = useState('sfx/wow.mp3')
  const [finalVideoPath, setFinalVideoPath] = useState('')
  
  // Load API keys from localStorage
  useEffect(() => {
    const savedGeminiKeys = localStorage.getItem('algovids_gemini_keys')
    const savedElevenLabsKeys = localStorage.getItem('algovids_elevenlabs_keys')
    
    if (savedGeminiKeys) {
      try {
        const parsed = JSON.parse(savedGeminiKeys)
        // Convert lastUsed strings back to Date objects, handling potential issues
        const processed = parsed.map(k => ({
          ...k,
          lastUsed: k.lastUsed ? new Date(k.lastUsed) : null
        }))
        // Validate that dates are valid
        const validated = processed.map(k => ({
          ...k,
          lastUsed: k.lastUsed && k.lastUsed !== "Invalid Date" && !isNaN(k.lastUsed.getTime()) ? k.lastUsed : null
        }))
        setGeminiKeys(validated)
      } catch (e) {
        console.error('Error loading gemini keys:', e)
        setGeminiKeys([])
      }
    }
    if (savedElevenLabsKeys) {
      try {
        const parsed = JSON.parse(savedElevenLabsKeys)
        // Convert lastUsed strings back to Date objects, handling potential issues
        const processed = parsed.map(k => ({
          ...k,
          lastUsed: k.lastUsed ? new Date(k.lastUsed) : null
        }))
        // Validate that dates are valid
        const validated = processed.map(k => ({
          ...k,
          lastUsed: k.lastUsed && k.lastUsed !== "Invalid Date" && !isNaN(k.lastUsed.getTime()) ? k.lastUsed : null
        }))
        setElevenLabsKeys(validated)
      } catch (e) {
        console.error('Error loading elevenlabs keys:', e)
        setElevenLabsKeys([])
      }
    }
    
    // Set hydration flag after loading from localStorage
    setIsHydrated(true)
  }, [])
  
  // Save API keys to localStorage
  useEffect(() => {
    // Only save to localStorage after hydration is complete
    if (!isHydrated) return;
    
    // Convert Date objects to ISO strings for storage, handling potential issues
    const serializedGeminiKeys = geminiKeys.map(k => ({
      ...k,
      lastUsed: k.lastUsed && k.lastUsed !== "Invalid Date" && !isNaN(k.lastUsed.getTime()) ? k.lastUsed.toISOString() : null
    }))
    localStorage.setItem('algovids_gemini_keys', JSON.stringify(serializedGeminiKeys))
    
    const serializedElevenLabsKeys = elevenLabsKeys.map(k => ({
      ...k,
      lastUsed: k.lastUsed && k.lastUsed !== "Invalid Date" && !isNaN(k.lastUsed.getTime()) ? k.lastUsed.toISOString() : null
    }))
    localStorage.setItem('algovids_elevenlabs_keys', JSON.stringify(serializedElevenLabsKeys))
  }, [geminiKeys, elevenLabsKeys, isHydrated])
  
  // Auto-navigate on completion
  useEffect(() => {
    if (downloadedVideo && currentStep === 1) {
      setTimeout(() => setCurrentStep(2), 800)
    }
  }, [downloadedVideo])
  
  useEffect(() => {
    if (audioPath && currentStep === 2) {
      setTimeout(() => setCurrentStep(3), 800)
    }
  }, [audioPath])
  
  useEffect(() => {
    if (finalVideoPath) {
      setTimeout(() => setShowCleanupModal(true), 1000)
    }
  }, [finalVideoPath])

  const handleDownload = async () => {
    if (!videoUrl) {
      setError('Please enter a video URL')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await axios.post(`${API_BASE}/download`, { 
        url: videoUrl 
      })
      setDownloadedVideo(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateTTS = async () => {
    if (!script) {
      setError('Please enter a script')
      return
    }
    
    const enabledKeys = elevenLabsKeys.filter(k => k.enabled)
    if (enabledKeys.length === 0) {
      setError('No enabled ElevenLabs API key found')
      return
    }
    
    // Use the first enabled key
    const activeKey = enabledKeys[0]
    
    setLoading(true)
    setError('')
    
    try {
      const response = await axios.post(`${API_BASE}/generate-tts`, { 
        script 
      }, {
        headers: {
          'X-ElevenLabs-Key': activeKey.key
        }
      })
      setAudioPath(response.data.audio_path)
      setError('')
      
      // Update last used timestamp
      const now = new Date()
      setElevenLabsKeys(prevKeys => prevKeys.map(k => 
        k.id === activeKey.id ? {...k, lastUsed: now} : k
      ))
    } catch (err) {
      setError(err.response?.data?.detail || 'TTS generation failed')
    } finally {
      setLoading(false)
    }
  }
  
  const handleTranslateToHindi = async () => {
    if (!script.trim()) {
      setError('Please enter text to translate')
      return
    }
    
    // Get the latest enabled keys from state
    const enabledKeys = geminiKeys.filter(k => k.enabled)
    if (enabledKeys.length === 0) {
      setError('No enabled Gemini API key found')
      return
    }
    
    // Use the first enabled key
    const activeKey = enabledKeys[0]
    
    setTranslating(true)
    setError('')
    
    try {
      const response = await axios.post(`${API_BASE}/translate-hindi`, {
        text: script
      }, {
        headers: {
          'X-Gemini-Key': activeKey.key
        }
      })
      
      // Update the script with the translated text
      setScript(response.data.translated_text)
      
      // Update last used timestamp
      const now = new Date()
      setGeminiKeys(prevKeys => prevKeys.map(k => 
        k.id === activeKey.id ? {...k, lastUsed: now} : k
      ))
      
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!downloadedVideo?.path || !audioPath || !bgmPath || !sfxPath) {
      setError('Please complete all previous steps and provide BGM and SFX paths')
      return
    }
    
    const enabledKeys = geminiKeys.filter(k => k.enabled)
    if (enabledKeys.length === 0) {
      setError('No enabled Gemini API key found')
      return
    }
    
    // Use the first enabled key
    const activeKey = enabledKeys[0]
    
    setLoading(true)
    setError('')
    
    try {
      const response = await axios.post(`${API_BASE}/generate-video`, {
        video_path: downloadedVideo.path,
        audio_path: audioPath,
        bgm_path: bgmPath,
        sfx_path: sfxPath
      }, {
        headers: {
          'X-Gemini-Key': activeKey.key
        }
      })
      setFinalVideoPath(response.data.video_path)
      setError('')
      
      // Update last used timestamp
      const now = new Date()
      setGeminiKeys(prevKeys => prevKeys.map(k => 
        k.id === activeKey.id ? {...k, lastUsed: now} : k
      ))
    } catch (err) {
      setError(err.response?.data?.detail || 'Video generation failed')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCleanup = async (deleteFiles) => {
    setShowCleanupModal(false)
    
    if (deleteFiles) {
      try {
        const response = await axios.post(`${API_BASE}/cleanup`, {
          video_path: downloadedVideo?.path || '',
          audio_path: audioPath || ''
        })
        
        if (response.data.success) {
          alert(`✅ Cleanup completed!\nDeleted: ${response.data.deleted.length} file(s)`)
        } else {
          alert(`⚠️ Partial cleanup\nDeleted: ${response.data.deleted.length}\nErrors: ${response.data.errors.join('\n')}`)
        }
      } catch (err) {
        alert(`❌ Cleanup failed: ${err.response?.data?.detail || err.message}`)
      }
    }
  }
  

  
  // Helper functions for managing keys
  const addGeminiKey = () => {
    const newKey = {
      id: Date.now().toString(),
      name: `Gemini Key ${geminiKeys.length + 1}`,
      key: '',
      enabled: true,
      lastUsed: null
    }
    setGeminiKeys(prevKeys => [...prevKeys, newKey])
  }
  
  const addElevenLabsKey = () => {
    const newKey = {
      id: Date.now().toString(),
      name: `ElevenLabs Key ${elevenLabsKeys.length + 1}`,
      key: '',
      enabled: true,
      lastUsed: null
    }
    setElevenLabsKeys(prevKeys => [...prevKeys, newKey])
  }
  
  const updateGeminiKey = (id, updates) => {
    setGeminiKeys(prevKeys => {
      return prevKeys.map(k => {
        if (k.id === id) {
          return {...k, ...updates};
        }
        return k;
      });
    });
  }
  
  const updateElevenLabsKey = (id, updates) => {
    setElevenLabsKeys(prevKeys => {
      return prevKeys.map(k => {
        if (k.id === id) {
          return {...k, ...updates};
        }
        return k;
      });
    });
  }
  
  const deleteGeminiKey = (id) => {
    setGeminiKeys(prevKeys => prevKeys.filter(k => k.id !== id))
  }
  
  const deleteElevenLabsKey = (id) => {
    setElevenLabsKeys(prevKeys => prevKeys.filter(k => k.id !== id))
  }
  
  // Auto-navigate on completion
  useEffect(() => {
    if (downloadedVideo && currentStep === 1) {
      setTimeout(() => setCurrentStep(2), 800)
    }
  }, [downloadedVideo])
  
  useEffect(() => {
    if (audioPath && currentStep === 2) {
      setTimeout(() => setCurrentStep(3), 800)
    }
  }, [audioPath])
  
  useEffect(() => {
    if (finalVideoPath) {
      setTimeout(() => setShowCleanupModal(true), 1000)
    }
  }, [finalVideoPath])
  
  // Preview handlers
  const openPreview = (type, src) => {
    setPreviewType(type)
    setPreviewSrc(src)
    setShowPreview(true)
  }
  
  const closePreview = () => {
    setShowPreview(false)
    setPreviewType('')
    setPreviewSrc('')
  }
  
  // Manual navigation
  const goToStep = (step) => {
    if (step >= 1 && step <= 3) {
      setCurrentStep(step)
    }
  }

  return (
    <div className="app-container">
      {/* Environment Settings Button */}
      <button className="env-settings-btn" onClick={() => setShowEnvModal(true)}>
        ⚙️
      </button>

      <div className="card">
        <h1 className="title">🎬 Algovids AI</h1>
        <p className="subtitle">AI video creator in 3 steps</p>
        
        {/* Step Navigation with Animation */}
        <div className="step-navigation">
          <div 
            className={`step ${currentStep === 1 ? 'active' : ''} ${downloadedVideo ? 'completed' : ''}`}
            onClick={() => goToStep(1)}
          >
            <span className="step-number">
              {downloadedVideo ? '✓' : '1'}
            </span>
            <span className="step-label">Download</span>
          </div>
          <div className={`step-divider ${currentStep >= 2 ? 'active' : ''}`}>
            <div className="divider-progress"></div>
          </div>
          <div 
            className={`step ${currentStep === 2 ? 'active' : ''} ${audioPath ? 'completed' : ''}`}
            onClick={() => goToStep(2)}
          >
            <span className="step-number">
              {audioPath ? '✓' : '2'}
            </span>
            <span className="step-label">Script</span>
          </div>
          <div className={`step-divider ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="divider-progress"></div>
          </div>
          <div 
            className={`step ${currentStep === 3 ? 'active' : ''} ${finalVideoPath ? 'completed' : ''}`}
            onClick={() => goToStep(3)}
          >
            <span className="step-number">
              {finalVideoPath ? '✓' : '3'}
            </span>
            <span className="step-label">Generate</span>
          </div>
        </div>

        {error && <div className="error-message">❌ {error}</div>}
        
        {/* Step 1: Download Video */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2>📥 Step 1: Download Video</h2>
            <p className="step-description">Enter a YouTube or video URL to download</p>
            
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input-field"
            />
            
            <button 
              onClick={handleDownload} 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '⏳ Downloading...' : '📥 Download Video'}
            </button>
            
            {downloadedVideo && (
              <div className="success-box">
                <h3>✅ Download Complete!</h3>
                <p><strong>Title:</strong> {downloadedVideo.title}</p>
                <p><strong>Path:</strong> {downloadedVideo.path}</p>
                <button 
                  className="btn btn-preview"
                  onClick={() => openPreview('video', `${API_BASE}/download/${encodeURIComponent(downloadedVideo.path.split(/[\\\/]/).pop())}`)}
                >
                  🎬 Preview Video
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Generate Script/TTS */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2>🎙️ Step 2: Generate Voiceover</h2>
            <p className="step-description">Enter your script for AI voiceover generation</p>
                    
            <textarea
              placeholder="Enter your script here..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="textarea-field"
              rows="6"
            />
                    
            <div className="button-row">
              <button 
                onClick={handleTranslateToHindi} 
                disabled={translating || !script.trim()}
                className="btn btn-magic"
              >
                {translating ? '...' : '✨'}
              </button>
                      
              <button 
                onClick={handleGenerateTTS} 
                disabled={loading || !script.trim()}
                className="btn btn-primary"
              >
                {loading ? '⏳ Generating Audio...' : '🎙️ Generate Voiceover'}
              </button>
            </div>
                    
            {audioPath && (
              <div className="success-box">
                <h3>✅ Audio Generated!</h3>
                <p><strong>Path:</strong> {audioPath}</p>
                <button 
                  className="btn btn-preview"
                  onClick={() => openPreview('audio', `${API_BASE}/audio/${encodeURIComponent(audioPath.split(/[\/]/).pop())}`)}
                >
                  🎙️ Preview Audio
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Step 3: Generate Final Video */}
        {currentStep === 3 && (
          <div className="step-content">
            <h2>🎥 Step 3: Generate Final Video</h2>
            <p className="step-description">Add BGM and SFX to create your final video</p>
            
            <div className="form-group-row">
              <div className="form-group-half">
                <label>🎵 Background Music (BGM) Path:</label>
                <input
                  type="text"
                  placeholder="assets/bgm.mp3"
                  value={bgmPath}
                  onChange={(e) => setBgmPath(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="form-group-half">
                <label>🔊 Sound Effects (SFX) Path:</label>
                <input
                  type="text"
                  placeholder="assets/sfx.mp3"
                  value={sfxPath}
                  onChange={(e) => setSfxPath(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            
            <div className="info-box">
              <p><strong>📹 Video:</strong> {downloadedVideo?.path || 'Not selected'}</p>
              <p><strong>🎙️ Audio:</strong> {audioPath || 'Not generated'}</p>
            </div>
            
            <button 
              onClick={handleGenerateVideo} 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '⏳ Generating Video...' : '🎬 Generate Final Video'}
            </button>
            
            {finalVideoPath && (
              <div className="success-box">
                <h3>🎉 Video Generated Successfully!</h3>
                <p><strong>Output Path:</strong> {finalVideoPath}</p>
                <button 
                  className="btn btn-preview"
                  onClick={() => openPreview('final', `${API_BASE}/video/final_output.mp4?t=${Date.now()}`)}
                >
                  🎬 Preview Final Video
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Environment Modal */}
      {showEnvModal && (
        <div className="modal-overlay" onClick={() => setShowEnvModal(false)}>
          <div className="modal-content env-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ API Configuration</h2>
              <button className="modal-close" onClick={() => setShowEnvModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {/* Gemini AI Section */}
              <div className="api-service-section">
                <div className="api-service-section-header">
                  <div className="service-title">
                    <span className="service-icon">🤖</span>
                    <h3>Gemini AI Keys</h3>
                  </div>
                  <button className="btn btn-add-key" onClick={addGeminiKey}>+ Add Key</button>
                </div>
                
                <div className="keys-list">
                  {geminiKeys.length === 0 && (
                    <p className="no-keys-message">No API keys added yet. Click "+ Add Key" to get started.</p>
                  )}
                  {geminiKeys.map((keyObj) => (
                    <div key={keyObj.id} className="api-key-item">
                      <div className="key-item-header">
                        <input
                          type="text"
                          value={keyObj.name}
                          onChange={(e) => updateGeminiKey(keyObj.id, {name: e.target.value})}
                          className="key-name-input"
                          placeholder="Key Name"
                        />
                        <div className="key-controls">
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={keyObj.enabled}
                              onChange={(e) => updateGeminiKey(keyObj.id, {enabled: e.target.checked})}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                          <button className="btn-delete" onClick={() => deleteGeminiKey(keyObj.id)} title="Delete key">🗑️</button>
                        </div>
                      </div>
                      <input
                        value={keyObj.key}
                        onChange={(e) => updateGeminiKey(keyObj.id, {key: e.target.value})}
                        className="api-key-input"
                        placeholder="Enter Gemini API Key"
                        disabled={!keyObj.enabled}
                      />
                      {keyObj.lastUsed && (
                        <div className="key-item-footer">
                          <span className="last-used">Last used: {keyObj.lastUsed.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ElevenLabs Section */}
              <div className="api-service-section">
                <div className="api-service-section-header">
                  <div className="service-title">
                    <span className="service-icon">🎙️</span>
                    <h3>ElevenLabs TTS Keys</h3>
                  </div>
                  <button className="btn btn-add-key" onClick={addElevenLabsKey}>+ Add Key</button>
                </div>
                
                <div className="keys-list">
                  {elevenLabsKeys.length === 0 && (
                    <p className="no-keys-message">No API keys added yet. Click "+ Add Key" to get started.</p>
                  )}
                  {elevenLabsKeys.map((keyObj) => (
                    <div key={keyObj.id} className="api-key-item">
                      <div className="key-item-header">
                        <input
                          type="text"
                          value={keyObj.name}
                          onChange={(e) => updateElevenLabsKey(keyObj.id, {name: e.target.value})}
                          className="key-name-input"
                          placeholder="Key Name"
                        />
                        <div className="key-controls">
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={keyObj.enabled}
                              onChange={(e) => updateElevenLabsKey(keyObj.id, {enabled: e.target.checked})}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                          <button className="btn-delete" onClick={() => deleteElevenLabsKey(keyObj.id)} title="Delete key">🗑️</button>
                        </div>
                      </div>
                      <input
                        value={keyObj.key}
                        onChange={(e) => updateElevenLabsKey(keyObj.id, {key: e.target.value})}
                        className="api-key-input"
                        placeholder="Enter ElevenLabs API Key"
                        disabled={!keyObj.enabled}
                      />
                      {keyObj.lastUsed && (
                        <div className="key-item-footer">
                          <span className="last-used">Last used: {keyObj.lastUsed.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <p className="info-text">
                🔒 API keys are securely stored in your browser's local storage
              </p>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEnvModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cleanup Modal */}
      {showCleanupModal && (
        <div className="modal-overlay">
          <div className="modal-content cleanup-modal">
            <div className="modal-header">
              <h2>🗑️ Cleanup Raw Files?</h2>
            </div>
            
            <div className="modal-body">
              <p>Your final video has been generated successfully!</p>
              <p>Do you want to delete the raw files (downloaded video and generated audio)?</p>
              
              <div className="cleanup-list">
                <div className="cleanup-item">
                  <span>📹</span> {downloadedVideo?.path}
                </div>
                <div className="cleanup-item">
                  <span>🎙️</span> {audioPath}
                </div>
              </div>
              
              <p className="warning-text">⚠️ This action cannot be undone!</p>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => handleCleanup(true)}>
                Yes, Delete Raw Files
              </button>
              <button className="btn btn-secondary" onClick={() => handleCleanup(false)}>
                No, Keep Files
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Modal */}
      {showPreview && (
        <div className="preview-modal-overlay" onClick={closePreview}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close-btn" onClick={closePreview}>✕</button>
            <div className="preview-container">
              {previewType === 'audio' ? (
                <div className="audio-preview-wrapper">
                  <div className="audio-icon">🎙️</div>
                  <h3>Audio Preview</h3>
                  <audio controls autoPlay className="centered-audio-preview" key={previewSrc}>
                    <source src={previewSrc} type="audio/wav" />
                    Your browser does not support audio playback
                  </audio>
                </div>
              ) : (
                <video controls autoPlay className="centered-video-preview" key={previewSrc}>
                  <source src={previewSrc} type="video/mp4" />
                  Your browser does not support video playback
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
