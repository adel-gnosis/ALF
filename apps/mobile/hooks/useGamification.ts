import { useState, useCallback } from 'react';

// Assuming we don't want to install extra deps, simple ID gen
const genId = () => Math.random().toString(36).substr(2, 9);

export type XpAward = {
    id: string;
    amount: number;
    position: { x: number; y: number };
    label?: string; // e.g. "Combo x2"
};

export const useGamification = () => {
    const [correctStreak, setCorrectStreak] = useState(0);
    const [activitiesAnsweredCount, setActivitiesAnsweredCount] = useState(0);
    const [sessionBonusAwarded, setSessionBonusAwarded] = useState(false);
    const [showBonusOverlay, setShowBonusOverlay] = useState(false);

    // Pooling for FloatingXP
    const [xpAwards, setXpAwards] = useState<XpAward[]>([]);

    const resetSession = useCallback(() => {
        setCorrectStreak(0);
        setActivitiesAnsweredCount(0);
        setSessionBonusAwarded(false);
        setShowBonusOverlay(false);
        setXpAwards([]);
    }, []);

    const removeXpAward = useCallback((id: string) => {
        setXpAwards(prev => prev.filter(a => a.id !== id));
    }, []);

    const registerAnswer = useCallback((isCorrect: boolean, serverXp: number = 0, tapPosition?: { x: number; y: number }) => {
        setActivitiesAnsweredCount(prev => prev + 1);

        if (isCorrect) {
            setCorrectStreak(prev => {
                const newStreak = prev + 1;

                // Calculate XP to show
                // Base: 10 (or serverXp if > 0)
                // Streak Bonus: +5 per extra streak above 1
                const base = serverXp > 0 ? serverXp : 10;

                const totalToShow = base + (newStreak >= 2 ? 5 : 0);

                if (tapPosition) {
                    const newAward: XpAward = {
                        id: genId(),
                        amount: totalToShow,
                        position: tapPosition
                    };

                    // Add to pool, limiting to 4 max
                    setXpAwards(prev => [...prev.slice(-3), newAward]);
                }

                return newStreak;
            });
        } else {
            setCorrectStreak(0);
        }
    }, []);

    // Bonus Logic: trigger AFTER 3rd activity answered
    const shouldTriggerBonus = activitiesAnsweredCount === 3 && !sessionBonusAwarded;

    // Check if it was a "perfect start" (3/3 correct)
    const isPerfectStart = activitiesAnsweredCount === 3 && correctStreak === 3;

    const awardSessionBonus = useCallback(() => {
        setSessionBonusAwarded(true);
        setShowBonusOverlay(true);
    }, []);

    const dismissBonusOverlay = useCallback(() => {
        setShowBonusOverlay(false);
    }, []);

    return {
        correctStreak,
        activitiesAnsweredCount,
        sessionBonusAwarded,
        showBonusOverlay,
        xpAwards,
        removeXpAward,
        shouldTriggerBonus,
        isPerfectStart,
        resetSession,
        registerAnswer,
        awardSessionBonus,
        dismissBonusOverlay,
    };
};
