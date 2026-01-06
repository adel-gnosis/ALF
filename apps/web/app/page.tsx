'use client';

import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60 animate-pulse" />
        <div className="absolute top-[40%] -right-[5%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-[100px] opacity-40" />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
        <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold tracking-widest uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>Platform Online</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-br from-gray-900 via-gray-800 to-blue-900 leading-[1.1]">
            Unlocking <br />
            <span className="text-blue-600">Adaptive</span> Mastery.
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-gray-500 font-medium leading-relaxed italic">
            "The future of language education is directional. <br className="hidden md:block" />
            ALF personalizes your path from your native tongue to French."
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
            <a
              href="/session/demo-session-id"
              className="group relative px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-2xl transition-all hover:scale-105 active:scale-95 hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 rounded-2xl bg-linear-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              Launch Learning Session
            </a>

            <button className="px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold text-lg shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300">
              Explore Courses
            </button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          {[
            { title: "Hybrid I18N", desc: "Native instructions with French target content." },
            { title: "Directional Paths", desc: "Courses tailored to your specific source language." },
            { title: "Audio Dictation", desc: "Immersive 'Dictee' activities for listening mastery." }
          ].map((feature, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 mb-6 flex items-center justify-center text-white font-bold text-xl">
                {idx + 1}
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-6 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400 font-medium tracking-tight">
          ALF PLATFORM • POWERED BY NEXT.JS 15 & DJANGO • 2024
        </p>
      </footer>
    </div>
  );
}
