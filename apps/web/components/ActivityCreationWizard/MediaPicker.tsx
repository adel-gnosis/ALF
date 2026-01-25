import React, { useState, useRef } from 'react';
import { useUploadMedia } from '@alf/shared';
import { Upload, X, Image as ImageIcon, Music, Loader2, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface MediaPickerProps {
    type?: 'image' | 'audio';
    onSelect: (url: string) => void;
    onClose?: () => void;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({ type = 'image', onSelect, onClose }) => {
    const { t } = useI18n();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { mutateAsync: upload, isPending, error } = useUploadMedia();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        try {
            const result = await upload({ file, type });
            onSelect(result.url);
            onClose?.();
        } catch (err) {
            console.error("Upload failed:", err);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex flex-col h-[400px] bg-background text-foreground">
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {!file ? (
                    <div
                        className="w-full h-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-secondary/30 transition-all cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold">{t('wizard.upload_click_to_select') || 'Click to select a file'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {type === 'image' ? 'JPG, PNG, WebP up to 5MB' : 'MP3, WAV, M4A up to 10MB'}
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={type === 'image' ? "image/*" : "audio/*"}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-200">
                        <div className="relative group">
                            <div className="w-48 h-48 rounded-2xl border border-border overflow-hidden bg-secondary/30 shadow-inner flex items-center justify-center">
                                {type === 'image' ? (
                                    <img src={previewUrl!} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Music className="w-16 h-16 text-primary" />
                                        <span className="text-xs font-medium px-4 text-center truncate w-48">{file.name}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={clearFile}
                                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {type === 'audio' && (
                            <audio src={previewUrl!} controls className="w-64 h-8" />
                        )}

                        <div className="text-center space-y-1">
                            <p className="text-sm font-bold truncate max-w-xs">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="px-6 py-2 bg-destructive/10 text-destructive text-xs flex items-center gap-2 border-t border-destructive/20 animate-in slide-in-from-bottom-2">
                    <AlertCircle className="w-3 h-3" />
                    <span>{t('wizard.upload_error') || 'Upload failed. Please try again.'}</span>
                </div>
            )}

            <div className="p-4 border-t border-border flex items-center justify-end bg-secondary/10 gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors"
                >
                    {t('common.cancel') || 'Cancel'}
                </button>
                <button
                    onClick={handleUpload}
                    disabled={!file || isPending}
                    className="px-8 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('wizard.uploading') || 'Uploading...'}
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            {t('wizard.upload_and_use') || 'Upload & Use'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
