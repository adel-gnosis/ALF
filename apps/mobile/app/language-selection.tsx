import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelectLanguage } from '@alf/shared';

type Language = 'fr' | 'en' | 'ar';

interface LanguageOption {
    code: Language;
    name: string;
    nativeName: string;
    flag: string;
    description: string;
}

const languages: LanguageOption[] = [
    {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        description: 'Apprendre avec des instructions en français',
    },
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇬🇧',
        description: 'Learn with English instructions',
    },
    {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        flag: '🇸🇦',
        description: 'تعلم مع تعليمات باللغة العربية',
    },
];

export default function LanguageSelectionScreen() {
    const router = useRouter();
    const [selectedLanguage, setSelectedLanguage] = useState<Language>('fr');
    const selectLanguageMutation = useSelectLanguage();

    const handleContinue = async () => {
        try {
            await selectLanguageMutation.mutateAsync(selectedLanguage);
            router.replace('/(tabs)/levels');
        } catch (error) {
            console.error('Failed to set language:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Choose Your Learning Language</Text>
                <Text style={styles.subtitle}>
                    You're learning French! Select your preferred language for instructions and interface.
                </Text>

                <View style={styles.languageGrid}>
                    {languages.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[
                                styles.languageCard,
                                selectedLanguage === lang.code && styles.languageCardSelected,
                            ]}
                            onPress={() => setSelectedLanguage(lang.code)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardContent}>
                                <Text style={styles.flag}>{lang.flag}</Text>
                                <Text style={styles.languageName}>{lang.nativeName}</Text>
                                <Text style={styles.languageNameEn}>{lang.name}</Text>
                                <Text style={styles.description}>{lang.description}</Text>
                            </View>
                            {selectedLanguage === lang.code && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.continueButton, selectLanguageMutation.isPending && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={selectLanguageMutation.isPending}
                >
                    {selectLanguageMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.continueButtonText}>Continue</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    languageGrid: {
        gap: 16,
        marginBottom: 32,
    },
    languageCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    languageCardSelected: {
        borderColor: '#3b82f6',
        backgroundColor: '#1e3a5f',
    },
    cardContent: {
        alignItems: 'center',
    },
    flag: {
        fontSize: 48,
        marginBottom: 12,
    },
    languageName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    languageNameEn: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#cbd5e1',
        textAlign: 'center',
        lineHeight: 20,
    },
    checkmark: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    continueButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
    },
    continueButtonDisabled: {
        opacity: 0.6,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
