import React from 'react';
import { MediaPicker } from './MediaPicker';
import { X, Upload } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface MediaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    type?: 'image' | 'audio';
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    type = 'image'
}) => {
    const { t } = useI18n();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-hidden">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative bg-background w-full max-w-4xl rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-border flex items-center justify-between z-10 shrink-0 bg-background">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                                <Upload className="w-4 h-4" />
                            </div>
                            {t('wizard.media_picker_title')}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('wizard.media_picker_desc')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    <MediaPicker
                        type={type}
                        onSelect={onSelect}
                        onClose={onClose}
                    />
                </div>
            </div>
        </div>
    );
};
