'use client';

import { useState } from 'react';
import { useLogin, initAuthCallback } from '@alf/shared';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/context/I18nContext';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';

// Initialize auth helper (sets token provider)
initAuthCallback();

const loginTranslations = {
    en: {
        title: 'Welcome back',
        subtitle: 'Sign in to your ALF console',
        username: 'Username',
        password: 'Password',
        sign_in: 'Sign In',
        signing_in: 'Signing in…',
        invalid_credentials: 'Invalid username or password.',
        back_home: '← Back to home',
    },
    fr: {
        title: 'Bon retour',
        subtitle: 'Connectez-vous à votre console ALF',
        username: 'Nom d\'utilisateur',
        password: 'Mot de passe',
        sign_in: 'Se connecter',
        signing_in: 'Connexion en cours…',
        invalid_credentials: 'Nom d\'utilisateur ou mot de passe invalide.',
        back_home: '← Retour à l\'accueil',
    },
    ar: {
        title: 'مرحباً بعودتك',
        subtitle: 'سجّل الدخول إلى لوحة تحكم ALF',
        username: 'اسم المستخدم',
        password: 'كلمة المرور',
        sign_in: 'تسجيل الدخول',
        signing_in: 'جارٍ تسجيل الدخول…',
        invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        back_home: '→ العودة إلى الرئيسية',
    },
};

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const login = useLogin();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { locale } = useI18n();

    const tr = loginTranslations[locale as keyof typeof loginTranslations] ?? loginTranslations.fr;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login.mutateAsync({ username, password });
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(tr.invalid_credentials);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-white text-gray-900 transition-colors duration-300 dark:bg-[#070B18] dark:text-gray-100">

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg font-black shadow-sm bg-[#1e3a5f] text-white dark:bg-amber-400 dark:text-[#070B18]">
                        <span className="font-serif text-base">A</span>
                    </div>
                    <span className="text-sm font-bold text-[#1e3a5f] dark:text-white">ALF</span>
                </Link>

                <button
                    onClick={toggleTheme}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>
            </div>

            {/* Center card */}
            <div className="flex flex-1 items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">

                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="font-serif text-3xl font-bold text-[#1e3a5f] dark:text-white">
                            {tr.title}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
                            {tr.subtitle}
                        </p>
                    </div>

                    {/* Card */}
                    <div className="rounded-2xl border p-8 shadow-sm transition-colors border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">

                        {error && (
                            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Username */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">
                                    {tr.username}
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-amber-400/60 dark:focus:bg-white/8 dark:focus:ring-amber-400/10"
                                    required
                                    autoComplete="username"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">
                                    {tr.password}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-xl border bg-gray-50 px-4 py-2.5 pr-10 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-amber-400/60 dark:focus:bg-white/8 dark:focus:ring-amber-400/10"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={login.isPending}
                                className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all disabled:opacity-60 bg-[#1e3a5f] text-white shadow-[#1e3a5f]/20 hover:bg-[#152843] hover:shadow-[#1e3a5f]/30 dark:bg-amber-400 dark:text-[#070B18] dark:shadow-amber-400/20 dark:hover:brightness-110"
                            >
                                {login.isPending ? tr.signing_in : tr.sign_in}
                            </button>
                        </form>
                    </div>

                    {/* Back link */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="text-xs text-gray-400 transition-colors hover:text-[#1e3a5f] dark:text-white/35 dark:hover:text-white/70"
                        >
                            {tr.back_home}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}