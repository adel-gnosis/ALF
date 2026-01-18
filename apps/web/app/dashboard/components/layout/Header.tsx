'use client';

import React from 'react';
import { useTheme } from './ThemeContext';
import { Sun, Moon, Bell, Search, Menu, User } from 'lucide-react';
import { useMe, UserRole } from '@alf/shared';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../../../context/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const { t } = useI18n();
    const { data: user } = useMe();
    const pathname = usePathname();

    const getBreadcrumbLabel = (path: string) => {
        const parts = path.split('/').filter(Boolean);
        const lastPart = parts[parts.length - 1];
        if (!lastPart || lastPart === 'dashboard') return t('common.overview');

        // Try to translate segments if they exist in nav.*
        const translated = t(`nav.${lastPart.replace(/-/g, '_')}`);
        if (translated !== `nav.${lastPart.replace(/-/g, '_')}`) return translated;

        return lastPart.replace(/-/g, ' ');
    };

    const breadcrumbLabel = getBreadcrumbLabel(pathname);

    const getRoleLabel = (role?: UserRole) => {
        switch (role) {
            case UserRole.ADMIN: return t('common.administrator');
            case UserRole.TEACHER: return t('common.educator');
            default: return t('common.student');
        }
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/70 px-4 glass sm:px-6 lg:px-8 transition-colors">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted lg:hidden"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground sm:flex">
                    <span className="text-muted-foreground/60">{t('common.dashboard')}</span>
                    <span className="text-border">/</span>
                    <span className="text-foreground capitalize">{breadcrumbLabel}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                {/* Search */}
                <div className="hidden items-center relative sm:flex">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="h-9 w-48 xl:w-64 rounded-full border border-border bg-muted/50 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <LanguageSwitcher />

                    <button className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors">
                        <Bell className="h-5 w-5" />
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors"
                        title={t('common.switch_theme')}
                    >
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </button>
                </div>

                <div className="h-8 w-px bg-border mx-1 hidden lg:block"></div>

                <div className="flex items-center gap-3 pl-1">
                    <div className="hidden flex-col items-end sm:flex text-right">
                        <span className="text-sm font-semibold text-foreground leading-tight">{user?.username || t('common.user')}</span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                            {getRoleLabel(user?.role as UserRole)}
                        </span>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                        <User className="h-6 w-6" />
                    </div>
                </div>
            </div>
        </header>
    );
}
