/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Brand
                primary: {
                    DEFAULT: "#4F46E5", // Indigo-600
                    light: "#818CF8",   // Indigo-400
                    dark: "#3730A3",    // Indigo-800
                },
                accent: {
                    DEFAULT: "#0D9488", // Teal-600
                    light: "#14B8A6",   // Teal-500
                    dark: "#0F766E",    // Teal-700
                },
                // Semantic
                success: "#059669",     // Emerald-600
                danger: "#DC2626",      // Red-600
                warning: "#D97706",     // Amber-600

                // Surface / Background
                background: {
                    DEFAULT: "#F8FAFC", // Slate-50 - Light BG
                    dark: "#0F172A",    // Slate-900 - Dark BG
                },
                surface: {
                    DEFAULT: "#FFFFFF", // White
                    dark: "#1E293B",    // Slate-800 - Dark Card
                },
                muted: {
                    DEFAULT: "#F1F5F9", // Slate-100
                    dark: "#334155",    // Slate-700
                }
            },
        },
    },
    plugins: [],
}
