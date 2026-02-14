'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TeacherActivity, ACTIVITY_TYPE_INFO, ActivityType, API_BASE_URL } from '@alf/shared';
import { X, Eye, EyeOff, ChevronLeft, ChevronRight, Edit2, Volume2, Check, Square, CheckSquare, Play, Pause, Image as ImageIcon } from 'lucide-react';
import { getActivityData } from './ActivityCard';

interface ActivityPreviewModalProps {
    activity: TeacherActivity | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (activity: TeacherActivity) => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    user?: any;
}

// Activity type colors
const ACTIVITY_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
    MCQActivity: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'blue' },
    FillBlankActivity: { bg: 'bg-green-50', border: 'border-green-200', accent: 'green' },
    MatchingActivity: { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'purple' },
    DicteeActivity: { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'orange' },
    DragOrderActivity: { bg: 'bg-teal-50', border: 'border-teal-200', accent: 'teal' },
    ConjugationActivity: { bg: 'bg-pink-50', border: 'border-pink-200', accent: 'pink' },
    MultipleAnswerActivity: { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'indigo' },
    TextInputActivity: { bg: 'bg-gray-50', border: 'border-gray-200', accent: 'gray' },
};

// Get the base URL for media files (without /api)
const getMediaBaseUrl = () => {
    // API_BASE_URL is like http://localhost:8000/api
    // We need http://localhost:8000 for media files
    const baseUrl = API_BASE_URL || 'http://localhost:8000/api';
    return baseUrl.replace(/\/api\/?$/, '');
};

// Convert relative media path to full URL
const getMediaUrl = (path: string | undefined): string => {
    if (!path) return '';
    // If already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // Otherwise, prepend the base URL
    const base = getMediaBaseUrl();
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Helper to render image or text content for matching/choice items
const renderMediaContent = (item: any, className?: string): React.ReactNode => {
    if (!item) return null;

    const isImage = item.type === 'image';
    const value = item.rendered_value || item.value || '';

    if (isImage && value) {
        const imageUrl = getMediaUrl(value);
        return (
            <div className={`flex items-center gap-2 ${className || ''}`}>
                <img
                    src={imageUrl}
                    alt="Content"
                    className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                        // Fallback on error
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                {item.i18n?.fr || item.i18n?.en || ''}
            </div>
        );
    }

    return <span className={className}>{value}</span>;
};

// Helper to render image with label for correct answers
const renderMediaPair = (left: any, right: any): string => {
    const leftText = left?.type === 'image'
        ? (left.i18n?.fr || left.i18n?.en || '[Image]')
        : (left?.rendered_value || left?.value || '');
    const rightText = right?.type === 'image'
        ? (right.i18n?.fr || right.i18n?.en || '[Image]')
        : (right?.rendered_value || right?.value || '');
    return `${leftText} ↔ ${rightText}`;
};

export default function ActivityPreviewModal({
    activity,
    isOpen,
    onClose,
    onEdit,
    onNext,
    onPrev,
    hasNext,
    hasPrev,
    user
}: ActivityPreviewModalProps) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
    const [userInput, setUserInput] = useState('');
    const [orderedWords, setOrderedWords] = useState<string[]>([]);
    const [wordBank, setWordBank] = useState<string[]>([]);
    const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Reset state when activity changes
    useEffect(() => {
        if (activity) {
            setShowAnswer(false);
            setSelectedChoice(null);
            setSelectedChoices([]);
            setUserInput('');
            setPlayingAudioIndex(null);

            // Stop any playing audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            // Initialize DragOrder word bank
            const data = getActivityData(activity);
            const words = data.words || [];
            setWordBank([...words].sort(() => Math.random() - 0.5));
            setOrderedWords([]);
        }
    }, [activity?.id]);

    if (!isOpen || !activity) return null;

    const activityType = activity.activity_type as ActivityType;
    const typeInfo = ACTIVITY_TYPE_INFO[activityType];
    const colors = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.MCQActivity;
    const data = getActivityData(activity);

    // DEBUG: Log data in preview modal
    console.log(`[ActivityPreviewModal] Activity #${activity.id} (${activityType}):`, {
        activity,
        extracted_data: data,
        type_specific_data: activity.type_specific_data
    });

    // Handle word tap for DragOrder
    const handleWordTap = (word: string) => {
        if (showAnswer) return;
        setWordBank(prev => prev.filter(w => w !== word));
        setOrderedWords(prev => [...prev, word]);
    };

    const handleWordRemove = (index: number) => {
        if (showAnswer) return;
        const word = orderedWords[index];
        setOrderedWords(prev => prev.filter((_, i) => i !== index));
        setWordBank(prev => [...prev, word]);
    };

    // Toggle choice for MultipleAnswer
    const toggleMultiChoice = (id: string) => {
        if (showAnswer) return;
        setSelectedChoices(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Play audio for Dictee
    const handlePlayAudio = (url: string, index: number) => {
        // Stop current audio if playing
        if (audioRef.current) {
            audioRef.current.pause();
        }

        // If clicking the same audio that's playing, just stop
        if (playingAudioIndex === index) {
            setPlayingAudioIndex(null);
            audioRef.current = null;
            return;
        }

        // Create and play new audio
        const fullUrl = getMediaUrl(url);
        const audio = new Audio(fullUrl);
        audioRef.current = audio;
        setPlayingAudioIndex(index);

        audio.play().catch(err => {
            console.error('Error playing audio:', err);
            setPlayingAudioIndex(null);
        });

        audio.onended = () => {
            setPlayingAudioIndex(null);
        };
    };

    // Render the full interactive preview based on activity type
    const renderActivityPreview = () => {
        switch (activityType) {
            case 'MCQActivity': {
                const choices = data.choices_v2 || [];
                const correctId = data.correct_choice_id;

                // Helper to render choice content (image or text)
                const renderChoiceContent = (choice: any, index: number) => {
                    const isImage = choice.content?.type === 'image';
                    const value = choice.rendered_value || choice.content?.value || '';

                    if (isImage && value) {
                        const imageUrl = getMediaUrl(value);
                        return (
                            <div className="flex items-center gap-3">
                                <img
                                    src={imageUrl}
                                    alt={`Choice ${index + 1}`}
                                    className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                {(choice.content?.i18n?.fr || choice.content?.i18n?.en) && (
                                    <span>{choice.content?.i18n?.fr || choice.content?.i18n?.en}</span>
                                )}
                            </div>
                        );
                    }

                    return <span>{value || `Option ${index + 1}`}</span>;
                };

                return (
                    <div className="space-y-3">
                        {choices.map((choice: any, i: number) => {
                            const isSelected = selectedChoice === choice.id;
                            const isCorrect = showAnswer && choice.id === correctId;
                            const isWrong = showAnswer && isSelected && choice.id !== correctId;

                            return (
                                <button
                                    key={choice.id || i}
                                    onClick={() => !showAnswer && setSelectedChoice(choice.id)}
                                    disabled={showAnswer}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isCorrect
                                        ? 'border-green-500 bg-green-50'
                                        : isWrong
                                            ? 'border-red-500 bg-red-50'
                                            : isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrect
                                            ? 'border-green-500 bg-green-500'
                                            : isWrong
                                                ? 'border-red-500 bg-red-500'
                                                : isSelected
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300'
                                            }`}>
                                            {(isSelected || isCorrect) && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className={`font-medium flex-1 ${isCorrect ? 'text-green-700' :
                                            isWrong ? 'text-red-700' :
                                                isSelected ? 'text-blue-700' : 'text-gray-800'
                                            }`}>
                                            {renderChoiceContent(choice, i)}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        {choices.length === 0 && (
                            <div className="text-center text-gray-500 py-8">No choices defined for this activity</div>
                        )}
                    </div>
                );
            }

            case 'MultipleAnswerActivity': {
                const choices = data.choices_v2 || [];
                const correctIds = data.correct_choice_ids || [];

                // Helper to render choice content (image or text)
                const renderMultiChoiceContent = (choice: any, index: number) => {
                    const isImage = choice.content?.type === 'image';
                    const value = choice.rendered_value || choice.content?.value || '';

                    if (isImage && value) {
                        const imageUrl = getMediaUrl(value);
                        return (
                            <div className="flex items-center gap-3">
                                <img
                                    src={imageUrl}
                                    alt={`Choice ${index + 1}`}
                                    className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                                {(choice.content?.i18n?.fr || choice.content?.i18n?.en) && (
                                    <span>{choice.content?.i18n?.fr || choice.content?.i18n?.en}</span>
                                )}
                            </div>
                        );
                    }

                    return <span>{value || `Option ${index + 1}`}</span>;
                };

                return (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-2">Select all correct answers:</p>
                        {choices.map((choice: any, i: number) => {
                            const isSelected = selectedChoices.includes(choice.id);
                            const isCorrect = showAnswer && correctIds.includes(choice.id);
                            const isWrongSelected = showAnswer && isSelected && !correctIds.includes(choice.id);
                            const isMissed = showAnswer && !isSelected && correctIds.includes(choice.id);

                            return (
                                <button
                                    key={choice.id || i}
                                    onClick={() => toggleMultiChoice(choice.id)}
                                    disabled={showAnswer}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isCorrect
                                        ? 'border-green-500 bg-green-50'
                                        : isWrongSelected
                                            ? 'border-red-500 bg-red-50'
                                            : isMissed
                                                ? 'border-yellow-500 bg-yellow-50'
                                                : isSelected
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {isSelected || isCorrect || isMissed ? (
                                            <CheckSquare className={`w-5 h-5 flex-shrink-0 ${isCorrect ? 'text-green-500' :
                                                isWrongSelected ? 'text-red-500' :
                                                    isMissed ? 'text-yellow-500' :
                                                        'text-indigo-500'
                                                }`} />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-300 flex-shrink-0" />
                                        )}
                                        <div className={`font-medium flex-1 ${isCorrect ? 'text-green-700' :
                                            isWrongSelected ? 'text-red-700' :
                                                isMissed ? 'text-yellow-700' :
                                                    isSelected ? 'text-indigo-700' : 'text-gray-800'
                                            }`}>
                                            {renderMultiChoiceContent(choice, i)}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                );
            }

            case 'FillBlankActivity': {
                const phrase = data.phrase || '';
                const correctAnswer = data.correct_answer || '';

                if (!phrase.includes('___')) {
                    return <div className="text-center text-gray-500 py-8">No blank defined in phrase</div>;
                }

                const parts = phrase.split('___');

                return (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-1 text-xl font-medium text-gray-800">
                            <span>{parts[0]}</span>
                            <input
                                type="text"
                                value={showAnswer ? correctAnswer : userInput}
                                onChange={(e) => !showAnswer && setUserInput(e.target.value)}
                                disabled={showAnswer}
                                className={`min-w-[120px] px-4 py-2 text-center border-b-2 rounded-lg outline-none transition-all ${showAnswer
                                    ? 'border-green-500 bg-green-50 text-green-700 font-bold'
                                    : 'border-blue-500 bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-200'
                                    }`}
                                placeholder="..."
                            />
                            <span>{parts[1]}</span>
                        </div>
                        {showAnswer && correctAnswer && (
                            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                                <p className="text-sm text-green-700">
                                    <strong>Correct answer:</strong> {correctAnswer}
                                </p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'MatchingActivity': {
                const pairs = data.pairs_v2 || [];

                // Helper to render matching item (image or text)
                const renderMatchItem = (item: any) => {
                    if (!item) return <span className="text-gray-400 italic">Empty</span>;

                    const isImage = item.type === 'image';
                    const value = item.rendered_value || item.value || '';

                    if (isImage && value) {
                        const imageUrl = getMediaUrl(value);
                        return (
                            <div className="flex items-center gap-2">
                                <img
                                    src={imageUrl}
                                    alt="Match item"
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '';
                                        (e.target as HTMLImageElement).alt = 'Image not found';
                                    }}
                                />
                                {(item.i18n?.fr || item.i18n?.en) && (
                                    <span className="text-sm text-gray-600">{item.i18n?.fr || item.i18n?.en}</span>
                                )}
                            </div>
                        );
                    }

                    return <span className="font-medium text-gray-800">{value}</span>;
                };

                // Helper to get display text for correct pairs
                const getDisplayText = (item: any) => {
                    if (!item) return '';
                    if (item.type === 'image') {
                        return item.i18n?.fr || item.i18n?.en || '[Image]';
                    }
                    return item.rendered_value || item.value || '';
                };

                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 mb-2">Match the items on the left with the right:</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Left</p>
                                {pairs.map((pair: any, i: number) => (
                                    <div
                                        key={`left-${pair.id || i}`}
                                        className={`p-3 rounded-xl border-2 min-h-[60px] flex items-center ${showAnswer
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-purple-200 bg-purple-50'
                                            }`}
                                    >
                                        {renderMatchItem(pair.left)}
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Right</p>
                                {pairs.map((pair: any, i: number) => (
                                    <div
                                        key={`right-${pair.id || i}`}
                                        className={`p-3 rounded-xl border-2 min-h-[60px] flex items-center ${showAnswer
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-purple-200 bg-white'
                                            }`}
                                    >
                                        {renderMatchItem(pair.right)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {showAnswer && (
                            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                                <p className="text-sm text-green-700 font-medium mb-2">✓ Correct pairs:</p>
                                <div className="space-y-1">
                                    {pairs.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-green-800">
                                            <span className="font-medium">{getDisplayText(p.left)}</span>
                                            <span className="text-green-600">↔</span>
                                            <span className="font-medium">{getDisplayText(p.right)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            case 'DicteeActivity': {
                const audioUrls = data.audio_urls || [];
                const dicteeText = data.text || data.correct_answer || '';

                return (
                    <div className="space-y-6">
                        {/* Audio Players */}
                        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                            <p className="font-medium text-orange-800 mb-3">
                                🎧 Audio Files ({audioUrls.length})
                            </p>
                            {audioUrls.length > 0 ? (
                                <div className="space-y-2">
                                    {audioUrls.map((url: string, i: number) => {
                                        const isPlaying = playingAudioIndex === i;
                                        const filename = url.split('/').pop() || `Audio ${i + 1}`;
                                        return (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isPlaying
                                                    ? 'bg-orange-100 border-orange-400'
                                                    : 'bg-white border-orange-200 hover:border-orange-300'
                                                    }`}
                                            >
                                                <button
                                                    onClick={() => handlePlayAudio(url, i)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow ${isPlaying
                                                        ? 'bg-orange-600 text-white'
                                                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                                                        }`}
                                                >
                                                    {isPlaying ? (
                                                        <Pause className="w-4 h-4" />
                                                    ) : (
                                                        <Play className="w-4 h-4 ml-0.5" />
                                                    )}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isPlaying ? 'text-orange-700' : 'text-gray-700'}`}>
                                                        Voice {i + 1}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{filename}</p>
                                                </div>
                                                {isPlaying && (
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3].map(j => (
                                                            <div
                                                                key={j}
                                                                className="w-1 bg-orange-500 rounded animate-pulse"
                                                                style={{
                                                                    height: `${12 + j * 4}px`,
                                                                    animationDelay: `${j * 0.1}s`
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-orange-600 italic">No audio files available</p>
                            )}
                        </div>

                        {/* Text Input */}
                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-2 block">Your answer:</label>
                            <textarea
                                value={showAnswer ? dicteeText : userInput}
                                onChange={(e) => !showAnswer && setUserInput(e.target.value)}
                                disabled={showAnswer}
                                placeholder="Type what you hear..."
                                className={`w-full h-32 p-4 rounded-xl border-2 resize-none outline-none transition-all ${showAnswer
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                                    }`}
                            />
                        </div>

                        {/* Correct Answer - always show when showAnswer is true */}
                        {showAnswer && (
                            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                                <p className="text-sm text-green-700">
                                    <strong>Correct text:</strong> {dicteeText || <span className="italic text-gray-500">Not specified</span>}
                                </p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'DragOrderActivity': {
                const words = data.words || [];
                const correctOrder = words; // Original order is correct

                return (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-600">Tap the words in the correct order:</p>

                        {/* Target slots */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 min-h-[80px]">
                            <p className="text-xs font-medium text-gray-500 mb-3">Your answer:</p>
                            <div className="flex flex-wrap gap-2">
                                {orderedWords.map((word, i) => (
                                    <button
                                        key={`ordered-${i}`}
                                        onClick={() => handleWordRemove(i)}
                                        disabled={showAnswer}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${showAnswer
                                            ? word === correctOrder[i]
                                                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                                : 'bg-red-100 text-red-700 border-2 border-red-300'
                                            : 'bg-teal-100 text-teal-700 border-2 border-teal-300 hover:bg-teal-200 cursor-pointer'
                                            }`}
                                    >
                                        {word}
                                    </button>
                                ))}
                                {orderedWords.length === 0 && (
                                    <span className="text-gray-400 italic">Tap words below to add them</span>
                                )}
                            </div>
                        </div>

                        {/* Word bank */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-3">Word bank:</p>
                            <div className="flex flex-wrap gap-2">
                                {wordBank.map((word, i) => (
                                    <button
                                        key={`bank-${i}-${word}`}
                                        onClick={() => handleWordTap(word)}
                                        disabled={showAnswer}
                                        className="px-4 py-2 bg-white text-gray-700 rounded-lg font-medium border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all"
                                    >
                                        {word}
                                    </button>
                                ))}
                                {wordBank.length === 0 && orderedWords.length > 0 && (
                                    <span className="text-gray-400 italic">All words placed</span>
                                )}
                            </div>
                        </div>

                        {showAnswer && (
                            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                                <p className="text-sm text-green-700">
                                    <strong>Correct order:</strong> {correctOrder.join(' → ')}
                                </p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'ConjugationActivity': {
                const verb = data.verb_infinitive || 'parler';
                const tense = data.tense || 'présent';
                const pronoun = data.pronoun || 'je';
                const correctAnswer = data.correct_answer || data.conjugation || '';

                return (
                    <div className="space-y-6">
                        {/* Verb info card */}
                        <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                            <div className="flex items-center gap-4 mb-3">
                                <div>
                                    <span className="text-xs text-gray-500">Verb:</span>
                                    <p className="text-2xl font-bold text-pink-600">{verb}</p>
                                </div>
                                <div className="px-3 py-1 bg-pink-100 rounded-full">
                                    <span className="text-sm font-medium text-pink-700">{tense}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Pronoun:</span>
                                <span className="font-bold text-gray-800">{pronoun}</span>
                            </div>
                        </div>

                        {/* Input */}
                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-2 block">Conjugation:</label>
                            <input
                                type="text"
                                value={showAnswer ? correctAnswer : userInput}
                                onChange={(e) => !showAnswer && setUserInput(e.target.value)}
                                disabled={showAnswer}
                                placeholder="Enter the conjugation..."
                                className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all text-lg ${showAnswer
                                    ? 'border-green-500 bg-green-50 text-green-700 font-bold'
                                    : 'border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200'
                                    }`}
                            />
                        </div>

                        {showAnswer && correctAnswer && (
                            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                                <p className="text-sm text-green-700">
                                    <strong>Correct:</strong> {pronoun} <strong>{correctAnswer}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'TextInputActivity': {
                // Backend sends correct_answers as an array
                const correctAnswers = data.correct_answers || [];
                const correctAnswer = Array.isArray(correctAnswers)
                    ? correctAnswers[0] || ''
                    : correctAnswers || '';

                return (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-2 block">Your answer:</label>
                            <textarea
                                value={showAnswer ? correctAnswer : userInput}
                                onChange={(e) => !showAnswer && setUserInput(e.target.value)}
                                disabled={showAnswer}
                                placeholder="Type your answer..."
                                className={`w-full h-32 p-4 rounded-xl border-2 resize-none outline-none transition-all ${showAnswer
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                    }`}
                            />
                        </div>

                        {/* Correct Answer - always show when showAnswer is true */}
                        {showAnswer && (
                            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                                <p className="text-sm text-green-700">
                                    <strong>Correct answer{correctAnswers.length > 1 ? 's' : ''}:</strong>{' '}
                                    {Array.isArray(correctAnswers) && correctAnswers.length > 0
                                        ? correctAnswers.join(' / ')
                                        : correctAnswer || <span className="italic text-gray-500">Not specified</span>}
                                </p>
                            </div>
                        )}
                    </div>
                );
            }

            default:
                return (
                    <div className="p-8 text-center text-gray-500">
                        <p className="mb-4">Preview not available for this activity type.</p>
                        <details className="text-left">
                            <summary className="cursor-pointer text-sm text-gray-400">View raw data</summary>
                            <pre className="mt-4 text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-64">
                                {JSON.stringify(data, null, 2)}
                            </pre>
                        </details>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className={`${colors.bg} border-b ${colors.border} p-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{typeInfo?.icon || '📝'}</span>
                            <div>
                                <h2 className="font-bold text-gray-900">
                                    {typeInfo?.label || activityType?.replace('Activity', '') || 'Activity'}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {activity.lesson?.level} • {activity.lesson?.subject} • {activity.difficulty} • v{activity.version}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(activity)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/50 text-gray-600 hover:text-gray-900 transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">
                                        {activity.created_by?.id === user?.id ? 'Edit' : 'Suggest Edit'}
                                    </span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/50 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Instruction Text (if available) */}
                    {activity.instruction_text && (
                        <div className={`mb-4 p-3 ${colors.bg} rounded-xl border ${colors.border}`}>
                            <p className="text-sm font-medium text-gray-700">
                                📋 <span className="italic">{activity.instruction_text}</span>
                            </p>
                        </div>
                    )}

                    {/* Question Text */}
                    {activity.question_text && (
                        <div className="mb-6">
                            <p className="text-lg font-semibold text-gray-900">{activity.question_text}</p>
                        </div>
                    )}

                    {/* Activity Preview */}
                    {renderActivityPreview()}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        {hasPrev && (
                            <button
                                onClick={onPrev}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                        )}
                        {hasNext && (
                            <button
                                onClick={onNext}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Show Answer Toggle */}
                    <button
                        onClick={() => setShowAnswer(!showAnswer)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showAnswer
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showAnswer ? 'Hide Answer' : 'Show Answer'}
                    </button>
                </div>
            </div>
        </div >
    );
}
