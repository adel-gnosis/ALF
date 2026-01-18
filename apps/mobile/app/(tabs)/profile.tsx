import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCurrentUser, useSelectLanguage } from '@alf/shared';
import { changeLanguage } from '../../i18n';

type Language = 'fr' | 'en' | 'ar';

interface LanguageOption {
    code: Language;
    name: string;
    nativeName: string;
    flag: string;
}

const languages: LanguageOption[] = [
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export default function ProfileScreen() {
    const { t, i18n } = useTranslation();
    const { signOut } = useAuth();
    const { data: user, isLoading } = useCurrentUser();
    const selectLanguageMutation = useSelectLanguage();

    const handleLearningLanguageChange = async (language: Language) => {
        try {
            await selectLanguageMutation.mutateAsync(language);
            Alert.alert(t('common.success'), t('profile.languageUpdated'));
        } catch (error) {
            Alert.alert(t('common.error'), t('profile.languageUpdateError'));
        }
    };

    const handleUILanguageChange = async (language: Language) => {
        try {
            await changeLanguage(language);
            Alert.alert(t('common.success'), t('profile.languageUpdated'));
        } catch (error) {
            Alert.alert(t('common.error'), t('profile.languageUpdateError'));
        }
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>{t('profile.loading')}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('profile.title')}</Text>
                <Text style={styles.username}>{user?.username || 'User'}</Text>
            </View>

            {/* Learning Language Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.learningLanguage')}</Text>
                <Text style={styles.sectionSubtitle}>
                    {t('profile.learningLanguageDesc')}
                </Text>

                <View style={styles.languageOptions}>
                    {languages.map((lang) => (
                        <TouchableOpacity
                            key={`learning-${lang.code}`}
                            style={[
                                styles.languageOption,
                                user?.native_language === lang.code && styles.languageOptionSelected,
                            ]}
                            onPress={() => handleLearningLanguageChange(lang.code)}
                            disabled={selectLanguageMutation.isPending}
                        >
                            <Text style={styles.languageFlag}>{lang.flag}</Text>
                            <View style={styles.languageInfo}>
                                <Text style={styles.languageName}>{lang.nativeName}</Text>
                                <Text style={styles.languageNameEn}>{lang.name}</Text>
                            </View>
                            {user?.native_language === lang.code && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* UI Language Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.uiLanguage')}</Text>
                <Text style={styles.sectionSubtitle}>
                    {t('profile.uiLanguageDesc')}
                </Text>

                <View style={styles.languageOptions}>
                    {languages.map((lang) => (
                        <TouchableOpacity
                            key={`ui-${lang.code}`}
                            style={[
                                styles.languageOption,
                                i18n.language === lang.code && styles.languageOptionSelected,
                            ]}
                            onPress={() => handleUILanguageChange(lang.code)}
                        >
                            <Text style={styles.languageFlag}>{lang.flag}</Text>
                            <View style={styles.languageInfo}>
                                <Text style={styles.languageName}>{lang.nativeName}</Text>
                                <Text style={styles.languageNameEn}>{lang.name}</Text>
                            </View>
                            {i18n.language === lang.code && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('profile.email')}</Text>
                    <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('profile.role')}</Text>
                    <Text style={styles.infoValue}>{user?.role || 'student'}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                <Text style={styles.logoutButtonText}>{t('profile.signOut')}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    loadingText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 40,
    },
    header: {
        padding: 24,
        paddingTop: 60,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    username: {
        fontSize: 16,
        color: '#94a3b8',
    },
    section: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 16,
    },
    languageOptions: {
        gap: 12,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    languageOptionSelected: {
        borderColor: '#3b82f6',
        backgroundColor: '#1e3a5f',
    },
    languageFlag: {
        fontSize: 32,
        marginRight: 16,
    },
    languageInfo: {
        flex: 1,
    },
    languageName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    languageNameEn: {
        fontSize: 14,
        color: '#94a3b8',
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    infoLabel: {
        fontSize: 16,
        color: '#94a3b8',
    },
    infoValue: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    logoutButton: {
        margin: 24,
        backgroundColor: '#dc2626',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
