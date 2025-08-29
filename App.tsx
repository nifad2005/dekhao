import React, { useState } from 'react';
import { generateTextContent, generateImageFromText, editImage } from './services/geminiService';
import type { GeneratedTextContent } from './types';
import { CopyIcon, CheckIcon, LoadingSpinner, DownloadIcon } from './components/icons';

const App: React.FC = () => {
  // State for core content
  const [videoIdea, setVideoIdea] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedTextContent | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  
  // State for Thumbnail Lab
  const [userImage, setUserImage] = useState<{data: string, mimeType: string, name: string} | null>(null);
  const [thumbnailStyle, setThumbnailStyle] = useState<string>('Cinematic');
  const [thumbnailPrompt, setThumbnailPrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');

  // UI/Error State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTextLoading, setIsTextLoading] = useState<boolean>(false);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const THUMBNAIL_STYLES = ['Cinematic', 'Vibrant', 'Minimalist', 'Futuristic', 'Retro', 'Bold & Graphic'];

  const handleGenerateAll = async () => {
    if (!videoIdea.trim()) {
      setError('Please enter a video idea first.');
      return;
    }

    setIsLoading(true);
    setIsTextLoading(true);
    setIsThumbnailLoading(true);
    setError('');
    setGeneratedContent(null);
    setThumbnailUrl('');
    setCopiedStates({});

    try {
      // Step 1: Generate text content first to get the SEO-optimized title
      const textContent = await generateTextContent(videoIdea);
      setGeneratedContent(textContent);
      setIsTextLoading(false); // Text is done

      // Step 2: Use the new title to generate a better thumbnail prompt
      const styleInstruction = `Style: ${thumbnailStyle}, ultra-realistic, professional, high-contrast, eye-catching. IMPORTANT: Do NOT include any text, logos, or watermarks.`;
      const finalThumbnailPrompt = userImage
        ? `Incorporate the subject from the provided image into a new scene for a YouTube thumbnail about "${textContent.seoTitle}". ${styleInstruction}`
        : `Create a YouTube thumbnail for a video titled "${textContent.seoTitle}". ${styleInstruction}`;
      
      setThumbnailPrompt(finalThumbnailPrompt);

      // Step 3: Generate the thumbnail image
      const imageUrl = userImage
        ? await editImage(userImage.data, userImage.mimeType, finalThumbnailPrompt)
        : await generateImageFromText(finalThumbnailPrompt);
      
      setThumbnailUrl(imageUrl);

    } catch (err) {
      handleError(err);
      setIsTextLoading(false); // Stop all loaders on error
    } finally {
      setIsThumbnailLoading(false);
      setIsLoading(false);
    }
  };
  
  const handleRegenerateThumbnail = async () => {
      if (!thumbnailPrompt.trim()) {
          setError('Thumbnail prompt cannot be empty.');
          return;
      }
      setIsThumbnailLoading(true);
      setError('');
      setEditPrompt('');
      
      try {
          const imageUrl = userImage 
            ? await editImage(userImage.data, userImage.mimeType, thumbnailPrompt)
            : await generateImageFromText(thumbnailPrompt);
          setThumbnailUrl(imageUrl);
      } catch (err) {
          handleError(err);
      } finally {
          setIsThumbnailLoading(false);
      }
  };

  const handleEditThumbnail = async () => {
      if (!editPrompt.trim()) {
          setError('Edit prompt cannot be empty.');
          return;
      }
      if (!thumbnailUrl) {
          setError('Generate a thumbnail first before editing.');
          return;
      }
      setIsThumbnailLoading(true);
      setError('');
      
      try {
          const [meta, base64Data] = thumbnailUrl.split(',');
          const mimeType = meta.split(':')[1].split(';')[0];
          const imageUrl = await editImage(base64Data, mimeType, editPrompt);
          setThumbnailUrl(imageUrl);
      } catch (err) {
          handleError(err);
      } finally {
          setIsThumbnailLoading(false);
      }
  };

  const handleDownloadThumbnail = () => {
    if (!thumbnailUrl) return;
    const link = document.createElement('a');
    link.href = thumbnailUrl;
    const mimeType = thumbnailUrl.split(':')[1]?.split(';')[0];
    const extension = mimeType?.split('/')[1] || 'jpeg';
    link.download = `dekhao-thumbnail-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleError = (err: unknown) => {
    console.error(err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
  };

  const handleCopyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const [_, base64Data] = result.split(',');
        setUserImage({ data: base64Data, mimeType: file.type, name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const ResultCard = ({ title, content, contentKey, isLoading }: { title: string; content?: string; contentKey: string; isLoading: boolean; }) => {
    return (
      <div className="bg-slate-800 rounded-lg shadow-lg p-6 min-h-[180px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-cyan-400">{title}</h2>
          {content && (
            <button
              onClick={() => handleCopyToClipboard(content, contentKey)}
              className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors duration-200"
              aria-label={`Copy ${title}`}
            >
              {copiedStates[contentKey] ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-slate-300" />}
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          </div>
        ) : (
          <p className="text-slate-300 whitespace-pre-wrap">{content || 'AI generated content will appear here.'}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          Dekhao Lab
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Your AI-Powered YouTube Content Workspace</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- COLUMN 1: CONTROLS --- */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 sticky top-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-200">Controls</h2>
            <div>
              <label htmlFor="video-idea" className="block text-sm font-medium text-slate-300 mb-2">1. Your Video Idea</label>
              <textarea
                id="video-idea"
                rows={3}
                value={videoIdea}
                onChange={(e) => setVideoIdea(e.target.value)}
                placeholder="e.g., Unboxing the new AI-powered camera..."
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                aria-label="Video title idea"
              />
            </div>

            <div>
              <label htmlFor="user-image-upload" className="block text-sm font-medium text-slate-300 mb-2">2. Upload Image (Optional)</label>
              <div className="text-center p-4 border-2 border-slate-600 border-dashed rounded-md">
                 <label htmlFor="user-image-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-cyan-400 hover:text-cyan-300"><span className="px-1">Choose a file</span><input id="user-image-upload" name="user-image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" /></label>
                 {userImage ? <p className="text-xs text-slate-400 mt-2">{userImage.name} <button onClick={() => setUserImage(null)} className="text-red-400 hover:underline ml-2">(Remove)</button></p> : <p className="text-xs text-slate-500 mt-1">PNG or JPG</p>}
              </div>
            </div>

            <div>
              <label htmlFor="style-select" className="block text-sm font-medium text-slate-300 mb-2">3. Thumbnail Style</label>
              <select id="style-select" value={thumbnailStyle} onChange={(e) => setThumbnailStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition">
                  {THUMBNAIL_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
              </select>
            </div>
            
            <button
              onClick={handleGenerateAll}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 px-4 rounded-md hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
            >
              {isLoading ? <LoadingSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" /> : null}
              {isLoading ? 'Generating...' : 'Generate All'}
            </button>
             {error && <p className="text-red-400 text-center">{error}</p>}
          </div>
        </div>

        {/* --- COLUMN 2: TEXT CONTENT --- */}
        <div className="lg:col-span-1 space-y-6">
          <ResultCard title="SEO Friendly Title" content={generatedContent?.seoTitle} contentKey="title" isLoading={isTextLoading} />
          <ResultCard title="Video Description" content={generatedContent?.description} contentKey="description" isLoading={isTextLoading} />
        </div>

        {/* --- COLUMN 3: THUMBNAIL LAB --- */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <div className="aspect-video bg-slate-800 rounded-lg shadow-lg flex items-center justify-center border border-slate-700 overflow-hidden">
                {isThumbnailLoading && <LoadingSpinner className="w-10 h-10 text-slate-400 animate-spin" />}
                {!isThumbnailLoading && thumbnailUrl && <img src={thumbnailUrl} alt="AI generated thumbnail" className="w-full h-full object-cover" />}
                {!isThumbnailLoading && !thumbnailUrl && <span className="text-slate-500 text-center p-4">Your thumbnail will appear here</span>}
            </div>

            {thumbnailUrl && !isThumbnailLoading && (
              <div className="pt-4 border-t border-slate-700 space-y-4 bg-slate-800/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-200">Refine Thumbnail</h3>
                  <div>
                      <label htmlFor="thumbnail-prompt" className="block text-sm font-medium text-slate-300 mb-2">Generation Prompt</label>
                      <div className="flex gap-2">
                        <textarea id="thumbnail-prompt" rows={3} value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} className="flex-grow w-full bg-slate-800 border border-slate-600 text-slate-100 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"></textarea>
                        <button onClick={handleRegenerateThumbnail} disabled={isThumbnailLoading} className="bg-green-600 text-white font-bold py-2 px-3 rounded-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center">
                            {isThumbnailLoading ? <LoadingSpinner className="animate-spin h-5 w-5" /> : 'Go'}
                        </button>
                      </div>
                  </div>
                  <div>
                      <label htmlFor="edit-prompt" className="block text-sm font-medium text-slate-300 mb-1">Make a quick change</label>
                      <div className="flex gap-2">
                          <input type="text" id="edit-prompt" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g., add a lightning bolt..." className="flex-grow bg-slate-800 border border-slate-600 text-slate-100 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition" />
                          <button onClick={handleEditThumbnail} disabled={isThumbnailLoading} className="bg-purple-600 text-white font-bold py-2 px-3 rounded-md hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center">
                               {isThumbnailLoading ? <LoadingSpinner className="animate-spin h-5 w-5" /> : 'Edit'}
                          </button>
                      </div>
                  </div>
                  <button onClick={handleDownloadThumbnail} className="w-full bg-slate-700 text-white font-bold py-3 px-4 rounded-md hover:bg-slate-600 transition-colors duration-200 flex items-center justify-center gap-2">
                      <DownloadIcon className="w-5 h-5" />
                      Download Thumbnail
                  </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
