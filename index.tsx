
import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<{
    casual?: string;
    business?: string;
    nightOut?: string;
    custom?: string;
  }>({});
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setOutfits({}); // Reset previous results
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async (prompt: string, sourceImage: string): Promise<string | null> => {
    try {
      // Strip the data:image/xyz;base64, prefix
      const base64Data = sourceImage.split(',')[1];
      const mimeType = sourceImage.substring(sourceImage.indexOf(':') + 1, sourceImage.indexOf(';'));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (err) {
      console.error("Generation error:", err);
      return null;
    }
  };

  const handleAutoStyle = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    try {
      // Parallel generation for the 3 styles
      const [casualImg, businessImg, nightOutImg] = await Promise.all([
        generateImage("Create a clean flat-lay fashion photography image of a complete CASUAL outfit featuring this specific item. The item must be the centerpiece. Arrange it neatly on a neutral background.", image),
        generateImage("Create a clean flat-lay fashion photography image of a complete BUSINESS PROFESSIONAL outfit featuring this specific item. The item must be the centerpiece. Arrange it neatly on a neutral background.", image),
        generateImage("Create a clean flat-lay fashion photography image of a complete NIGHT OUT / PARTY outfit featuring this specific item. The item must be the centerpiece. Arrange it neatly on a neutral background.", image)
      ]);

      if (!casualImg && !businessImg && !nightOutImg) {
        setError("Failed to generate images. Please try again.");
      } else {
        setOutfits({
          casual: casualImg || undefined,
          business: businessImg || undefined,
          nightOut: nightOutImg || undefined
        });
      }
    } catch (e) {
      setError("An error occurred during generation. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomEdit = async () => {
    if (!image || !customPrompt) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateImage(customPrompt, image);
      if (result) {
        setOutfits(prev => ({ ...prev, custom: result }));
      } else {
        setError("Could not generate image based on prompt.");
      }
    } catch (e) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      maxWidth: '1000px', 
      margin: '0 auto', 
      padding: '20px',
      color: '#333',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#4f46e5', marginBottom: '10px' }}>Virtual Stylist AI</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Upload a clothing item and let Gemini curate your look.</p>
      </header>

      <main>
        {/* Upload Section */}
        <div style={{ 
          background: 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '40px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#f8fafc'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#4f46e5';
                e.currentTarget.style.backgroundColor = '#eef2ff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📸</div>
              <p style={{ fontWeight: '600', color: '#4b5563' }}>Click to upload your item</p>
              <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Supports JPG, PNG</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img 
                src={image} 
                alt="Uploaded item" 
                style={{ maxHeight: '300px', maxWidth: '100%', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
              />
              <button 
                onClick={() => { setImage(null); setOutfits({}); }}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Remove & Upload Different Item
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        {image && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '20px',
              marginBottom: '20px'
            }}>
              {/* Auto Stylist Card */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, color: '#111827' }}>✨ Auto Stylist</h3>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '15px' }}>
                  Generate 3 distinct looks (Casual, Business, Night Out) based on your item.
                </p>
                <button
                  onClick={handleAutoStyle}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: loading ? '#a5b4fc' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {loading ? 'Styling...' : 'Generate 3 Outfits'}
                </button>
              </div>

              {/* Custom Edit Card */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, color: '#111827' }}>🎨 Custom Edit</h3>
                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '15px' }}>
                  Ask for specific changes (e.g., "Add a retro filter", "Make it snowy").
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe your edit..."
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      outline: 'none'
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && customPrompt.trim() && handleCustomEdit()}
                  />
                  <button
                    onClick={handleCustomEdit}
                    disabled={loading || !customPrompt.trim()}
                    style={{
                      padding: '10px 20px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: (loading || !customPrompt.trim()) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '15px', 
            background: '#fee2e2', 
            color: '#b91c1c', 
            borderRadius: '8px', 
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {(outfits.casual || outfits.business || outfits.nightOut || outfits.custom) && (
          <div>
            <h2 style={{ color: '#111827', marginBottom: '20px' }}>Your Looks</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '25px' 
            }}>
              {outfits.casual && <OutfitCard title="Casual" img={outfits.casual} />}
              {outfits.business && <OutfitCard title="Business" img={outfits.business} />}
              {outfits.nightOut && <OutfitCard title="Night Out" img={outfits.nightOut} />}
              {outfits.custom && <OutfitCard title="Custom Edit" img={outfits.custom} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const OutfitCard = ({ title, img }: { title: string, img: string }) => (
  <div style={{ 
    background: 'white', 
    borderRadius: '12px', 
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
  }}>
    <div style={{ 
      padding: '15px', 
      borderBottom: '1px solid #f3f4f6',
      fontWeight: 'bold',
      color: '#374151'
    }}>
      {title}
    </div>
    <div style={{ width: '100%', height: '350px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
    <div style={{ padding: '15px' }}>
      <a 
        href={img} 
        download={`stylist-${title.toLowerCase()}.png`}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '8px',
          background: '#f3f4f6',
          color: '#4b5563',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '0.9rem',
          fontWeight: '500',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
        onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
      >
        Download Image
      </a>
    </div>
  </div>
);

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
