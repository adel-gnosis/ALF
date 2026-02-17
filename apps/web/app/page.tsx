'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useI18n } from '@/context/I18nContext';

// Try to import auth hook, fallback if not available
let useMe: any;
try {
  const shared = require('@alf/shared');
  useMe = shared.useMe;
} catch (e) {
  useMe = () => ({ data: null, isLoading: false, isError: false });
}

// ─── Inline translations ───────────────────────────────────────────────────────

type Locale = 'en' | 'fr' | 'ar';

const pageTranslations: Record<Locale, Record<string, any>> = {
  en: {
    nav: {
      features: 'Features',
      why: 'Why ALF',
      architecture: 'Architecture',
      login: 'Log in',
      demo: 'Request Demo',
    },
    hero: {
      badge: 'Platform Online · 50+ schools across Morocco',
      headline_1: 'One system to create, govern, and deliver',
      headline_2: 'learning—at scale.',
      subtitle: 'Teachers build content on web. Admins control quality with review & versioning. Students learn on mobile with engagement. Everything stays connected—data, roles, and results.',
      cta_login: 'Log In to Dashboard',
      cta_demo: 'Request a Demo',
      stat_1_label: 'Governed lifecycle',
      stat_1_value: 'Create → Review → Approve',
      stat_2_label: 'Mobile learning',
      stat_2_value: 'XP · Combos · Calendar',
      stat_3_label: 'Unified model',
      stat_3_value: 'Assignments · Enrollments',
      stat_4_label: 'Multilingual',
      stat_4_value: 'FR · AR · EN',
    },
    flow: {
      title: 'ALF Flow',
      subtitle: 'Web → Governance → Mobile → Insights',
      teacher_title: 'Teacher (Web)',
      teacher_sub: 'Create activities & content',
      teacher_pill: 'Builder',
      admin_title: 'Admin Review',
      admin_sub: 'Approve, reject, version control',
      admin_pill: 'Governance',
      student_title: 'Student (Mobile)',
      student_sub: 'Learn with XP, combos, streaks',
      student_pill: 'Engagement',
      insights_title: 'Insights (Dashboard)',
      insights_sub: 'Health, trends, actionable signals',
      insights_pill: 'Analytics',
      why_title: 'Why it matters',
      why_desc: 'Quality content + operational clarity + student engagement — in one connected system.',
    },
    features: {
      kicker: 'Designed for real workflows',
      title: 'Three pillars. One ecosystem.',
      subtitle: 'A single framework connecting creation, operations, and learning—across roles and devices.',
      teacher_title: 'For Teachers',
      teacher_bullets: [
        'Activity builder (MCQ, dictée, drag-order, …)',
        'Versioning + fast edits',
        'Publishing workflow (trusted vs reviewed)',
        'Content library and reuse',
      ],
      school_title: 'For Schools',
      school_bullets: [
        'Students, teachers, guardians',
        'Timetables + attendance',
        'Messaging + notifications',
        'Role-based access control',
      ],
      student_title: 'For Students & Guardians',
      student_bullets: [
        'Mobile-first learning experience',
        'Gamification (XP, combos, streaks)',
        'Calendar + upcoming exams & homework',
        'Progress visibility for guardians',
      ],
    },
    why: {
      kicker: 'Your moat',
      title: 'Not another ERP. Not another LMS.',
      subtitle: 'ALF is built around governed educational content and a mobile learning engine—then extended into school operations.',
      card1_title: 'Governed content lifecycle',
      card1_desc: 'Creation → review → approval → versioning. A quality system, not a file dump. Like GitHub for learning content—with full audit trails.',
      card1_tags: ['Review queue', 'Version diff', 'Status flow'],
      card2_title: 'Mobile-first engagement',
      card2_desc: "Students don't just 'access content'—they experience it with XP progression, combo streaks, and offline support.",
      card2_tags: ['XP & combos', 'Calendar', 'Offline mode'],
      card3_title: 'Unified academic data model',
      card3_desc: 'Assignments, enrollments, academic year—everything connects cleanly for reliable queries and dashboards. No spreadsheet chaos.',
      card3_tags: ['TeachingAssignment', 'StudentEnrollment', 'AcademicYear'],
      card4_title: 'Multilingual by design',
      card4_desc: 'FR/AR/EN across UI and documents. Hybrid i18n architecture with proper RTL handling and audio support—built native, not translated.',
      card4_tags: ['RTL/LTR', 'Audio support', 'FR · AR · EN'],
    },
    arch: {
      kicker: 'Technical transparency',
      title: 'Architecture that scales cleanly',
      subtitle: 'A modern web + mobile stack with a solid backend foundation for governance and data integrity.',
      web_desc: 'Admin + Teacher dashboards, governance UI, content workflows',
      mobile_desc: 'Student & guardian learning experience with engagement',
      api_desc: 'Auth, permissions, workflows, business logic layer',
      pg_desc: 'Source of truth for schools, content, attendance',
      redis_desc: 'Async tasks: media processing, imports, background jobs',
      obs_desc: 'Audit trails, logs, review history, full traceability',
      coherence_title: 'Built to stay coherent',
      coherence_desc: 'Clean models + governed workflows means fewer edge cases, better reporting, and safer scale.',
    },
    cta: {
      title: 'Ready to modernize your school?',
      subtitle: "Start with the dashboard, content workflows, and mobile learning engine. We'll help you onboard smoothly.",
      login: 'Log In to Dashboard',
      sales: 'Talk to Sales',
      get_title: "What you'll get",
      get_items: [
        'Role-based dashboard + quick actions',
        'Review workflow + versioning for activities',
        'Mobile learning engine for students',
        'Multilingual experience (FR/AR/EN)',
      ],
      tags: ['Security-first', 'Governed workflows', 'Mobile-first learning', 'Built for scale'],
    },
    footer: {
      tagline: 'Adaptive Learning Framework for modern schools.',
      product: 'Product',
      company: 'Company',
      resources: 'Resources',
      features: 'Features',
      why: 'Why Different',
      architecture: 'Architecture',
      about: 'About',
      blog: 'Blog',
      contact: 'Contact',
      docs: 'Documentation',
      dashboard: 'Dashboard',
      support: 'Support',
      terms: 'Terms',
      privacy: 'Privacy',
      security: 'Security',
      built_with: 'Built with Next.js 15 & Django',
    },
    pillar_learn_more: 'Learn more →',
    loading: 'Loading…',
  },
  fr: {
    nav: {
      features: 'Fonctionnalités',
      why: 'Pourquoi ALF',
      architecture: 'Architecture',
      login: 'Se connecter',
      demo: 'Demander une démo',
    },
    hero: {
      badge: 'Plateforme en ligne · 50+ écoles au Maroc',
      headline_1: 'Un système pour créer, gouverner et délivrer',
      headline_2: 'l\'apprentissage à grande échelle.',
      subtitle: 'Les enseignants créent du contenu sur le web. Les admins contrôlent la qualité avec révision & versioning. Les élèves apprennent sur mobile. Tout reste connecté — données, rôles et résultats.',
      cta_login: 'Accéder au tableau de bord',
      cta_demo: 'Demander une démo',
      stat_1_label: 'Cycle gouverné',
      stat_1_value: 'Créer → Réviser → Approuver',
      stat_2_label: 'Apprentissage mobile',
      stat_2_value: 'XP · Combos · Calendrier',
      stat_3_label: 'Modèle unifié',
      stat_3_value: 'Affectations · Inscriptions',
      stat_4_label: 'Multilingue',
      stat_4_value: 'FR · AR · EN',
    },
    flow: {
      title: 'Flux ALF',
      subtitle: 'Web → Gouvernance → Mobile → Insights',
      teacher_title: 'Enseignant (Web)',
      teacher_sub: 'Créer des activités & du contenu',
      teacher_pill: 'Créateur',
      admin_title: 'Révision Admin',
      admin_sub: 'Approuver, rejeter, contrôle de version',
      admin_pill: 'Gouvernance',
      student_title: 'Élève (Mobile)',
      student_sub: 'Apprendre avec XP, combos, séries',
      student_pill: 'Engagement',
      insights_title: 'Insights (Dashboard)',
      insights_sub: 'Santé, tendances, signaux actionnables',
      insights_pill: 'Analytique',
      why_title: 'Pourquoi c\'est important',
      why_desc: 'Contenu de qualité + clarté opérationnelle + engagement élève — dans un système connecté.',
    },
    features: {
      kicker: 'Conçu pour des workflows réels',
      title: 'Trois piliers. Un écosystème.',
      subtitle: 'Un cadre unique reliant création, opérations et apprentissage — entre rôles et appareils.',
      teacher_title: 'Pour les enseignants',
      teacher_bullets: [
        'Créateur d\'activités (QCM, dictée, glisser-ordonner, …)',
        'Versioning + modifications rapides',
        'Workflow de publication (approuvé vs en révision)',
        'Bibliothèque de contenu et réutilisation',
      ],
      school_title: 'Pour les établissements',
      school_bullets: [
        'Élèves, enseignants, tuteurs',
        'Emplois du temps + présence',
        'Messagerie + notifications',
        'Contrôle d\'accès basé sur les rôles',
      ],
      student_title: 'Pour les élèves & tuteurs',
      student_bullets: [
        'Expérience d\'apprentissage mobile-first',
        'Gamification (XP, combos, séries)',
        'Calendrier + examens & devoirs à venir',
        'Visibilité des progrès pour les tuteurs',
      ],
    },
    why: {
      kicker: 'Votre avantage concurrentiel',
      title: 'Ni un ERP. Ni un LMS classique.',
      subtitle: 'ALF est construit autour d\'un contenu éducatif gouverné et d\'un moteur d\'apprentissage mobile — étendu aux opérations scolaires.',
      card1_title: 'Cycle de vie du contenu gouverné',
      card1_desc: 'Création → révision → approbation → versioning. Un système de qualité, pas un dépôt de fichiers. Comme GitHub pour le contenu pédagogique.',
      card1_tags: ['File de révision', 'Diff de version', 'Flux de statut'],
      card2_title: 'Engagement mobile-first',
      card2_desc: 'Les élèves ne se contentent pas d\'accéder au contenu — ils le vivent avec progression XP, séries de combos et support hors ligne.',
      card2_tags: ['XP & combos', 'Calendrier', 'Mode hors ligne'],
      card3_title: 'Modèle académique unifié',
      card3_desc: 'Affectations, inscriptions, année académique — tout se connecte proprement pour des requêtes fiables et des tableaux de bord clairs.',
      card3_tags: ['AffectationEnseignement', 'InscriptionÉlève', 'AnnéeAcadémique'],
      card4_title: 'Multilingue par conception',
      card4_desc: 'FR/AR/EN sur l\'UI et les documents. Architecture i18n hybride avec gestion RTL et support audio — construit nativement.',
      card4_tags: ['RTL/LTR', 'Support audio', 'FR · AR · EN'],
    },
    arch: {
      kicker: 'Transparence technique',
      title: 'Une architecture qui scale proprement',
      subtitle: 'Un stack web + mobile moderne avec une base backend solide pour la gouvernance et l\'intégrité des données.',
      web_desc: 'Tableaux de bord Admin & Enseignant, UI de gouvernance, workflows de contenu',
      mobile_desc: 'Expérience d\'apprentissage élève & tuteur avec engagement',
      api_desc: 'Auth, permissions, workflows, couche logique métier',
      pg_desc: 'Source de vérité pour écoles, contenu, présence',
      redis_desc: 'Tâches async : traitement média, imports, jobs en arrière-plan',
      obs_desc: 'Pistes d\'audit, logs, historique de révision, traçabilité complète',
      coherence_title: 'Conçu pour rester cohérent',
      coherence_desc: 'Modèles propres + workflows gouvernés = moins de cas limites, meilleurs rapports, mise à l\'échelle plus sûre.',
    },
    cta: {
      title: 'Prêt à moderniser votre établissement ?',
      subtitle: 'Commencez avec le tableau de bord, les workflows de contenu et le moteur d\'apprentissage mobile. Nous vous accompagnons.',
      login: 'Accéder au tableau de bord',
      sales: 'Parler à l\'équipe',
      get_title: 'Ce que vous obtenez',
      get_items: [
        'Tableau de bord basé sur les rôles + actions rapides',
        'Workflow de révision + versioning pour les activités',
        'Moteur d\'apprentissage mobile pour les élèves',
        'Expérience multilingue (FR/AR/EN)',
      ],
      tags: ['Sécurité d\'abord', 'Workflows gouvernés', 'Mobile-first', 'Conçu pour l\'échelle'],
    },
    footer: {
      tagline: 'Cadre d\'apprentissage adaptatif pour les écoles modernes.',
      product: 'Produit',
      company: 'Entreprise',
      resources: 'Ressources',
      features: 'Fonctionnalités',
      why: 'Pourquoi différent',
      architecture: 'Architecture',
      about: 'À propos',
      blog: 'Blog',
      contact: 'Contact',
      docs: 'Documentation',
      dashboard: 'Tableau de bord',
      support: 'Support',
      terms: 'CGU',
      privacy: 'Confidentialité',
      security: 'Sécurité',
      built_with: 'Construit avec Next.js 15 & Django',
    },
    pillar_learn_more: 'En savoir plus →',
    loading: 'Chargement…',
  },
  ar: {
    nav: {
      features: 'المميزات',
      why: 'لماذا ALF',
      architecture: 'البنية التقنية',
      login: 'تسجيل الدخول',
      demo: 'طلب عرض توضيحي',
    },
    hero: {
      badge: 'المنصة متاحة · أكثر من 50 مدرسة في المغرب',
      headline_1: 'نظام واحد لإنشاء المحتوى وحوكمته وتقديمه',
      headline_2: 'التعلم على نطاق واسع.',
      subtitle: 'يبني المعلمون المحتوى على الويب. يتحكم المشرفون في الجودة بالمراجعة والإصدار. يتعلم الطلاب على الجوال. كل شيء مترابط — البيانات والأدوار والنتائج.',
      cta_login: 'الدخول إلى لوحة التحكم',
      cta_demo: 'طلب عرض توضيحي',
      stat_1_label: 'دورة حياة محكومة',
      stat_1_value: 'إنشاء ← مراجعة ← موافقة',
      stat_2_label: 'التعلم عبر الجوال',
      stat_2_value: 'XP · تسلسلات · تقويم',
      stat_3_label: 'نموذج موحد',
      stat_3_value: 'التكليفات · التسجيلات',
      stat_4_label: 'متعدد اللغات',
      stat_4_value: 'FR · AR · EN',
    },
    flow: {
      title: 'مسار ALF',
      subtitle: 'ويب ← حوكمة ← جوال ← رؤى',
      teacher_title: 'المعلم (ويب)',
      teacher_sub: 'إنشاء الأنشطة والمحتوى',
      teacher_pill: 'منشئ',
      admin_title: 'مراجعة المشرف',
      admin_sub: 'الموافقة والرفض والتحكم بالإصدار',
      admin_pill: 'حوكمة',
      student_title: 'الطالب (جوال)',
      student_sub: 'التعلم مع XP والتسلسلات',
      student_pill: 'تفاعل',
      insights_title: 'الرؤى (لوحة التحكم)',
      insights_sub: 'الصحة والاتجاهات والإشارات القابلة للتنفيذ',
      insights_pill: 'تحليلات',
      why_title: 'لماذا يهم هذا',
      why_desc: 'محتوى جيد + وضوح تشغيلي + مشاركة الطلاب — في نظام متصل واحد.',
    },
    features: {
      kicker: 'مصمم لسير العمل الحقيقي',
      title: 'ثلاثة ركائز. نظام بيئي واحد.',
      subtitle: 'إطار عمل واحد يربط الإنشاء والعمليات والتعلم — عبر الأدوار والأجهزة.',
      teacher_title: 'للمعلمين',
      teacher_bullets: [
        'منشئ الأنشطة (اختيار متعدد، إملاء، ترتيب، …)',
        'إصدار + تعديلات سريعة',
        'سير عمل النشر (موثوق أو قيد المراجعة)',
        'مكتبة المحتوى وإعادة الاستخدام',
      ],
      school_title: 'للمؤسسات التعليمية',
      school_bullets: [
        'الطلاب والمعلمون وأولياء الأمور',
        'الجداول الزمنية + الحضور',
        'المراسلات + الإشعارات',
        'التحكم في الوصول القائم على الأدوار',
      ],
      student_title: 'للطلاب وأولياء الأمور',
      student_bullets: [
        'تجربة تعلم مخصصة للجوال',
        'التلعيب (XP، تسلسلات، سلاسل)',
        'تقويم + الامتحانات والواجبات القادمة',
        'رؤية التقدم لأولياء الأمور',
      ],
    },
    why: {
      kicker: 'ميزتك التنافسية',
      title: 'لا ERP آخر. لا LMS آخر.',
      subtitle: 'تم بناء ALF حول محتوى تعليمي محكوم ومحرك تعلم للجوال — ثم تم توسيعه لعمليات المدارس.',
      card1_title: 'دورة حياة المحتوى المحكومة',
      card1_desc: 'إنشاء ← مراجعة ← موافقة ← إصدار. نظام جودة وليس مستودع ملفات. مثل GitHub للمحتوى التعليمي.',
      card1_tags: ['قائمة المراجعة', 'فروق الإصدار', 'تدفق الحالة'],
      card2_title: 'تفاعل مخصص للجوال',
      card2_desc: 'الطلاب لا يكتفون بـ"الوصول إلى المحتوى" — بل يعيشونه مع تقدم XP وتسلسلات ودعم دون اتصال.',
      card2_tags: ['XP وتسلسلات', 'تقويم', 'وضع دون اتصال'],
      card3_title: 'نموذج بيانات أكاديمي موحد',
      card3_desc: 'التكليفات والتسجيلات والسنة الدراسية — كل شيء يتصل بشكل نظيف لاستعلامات موثوقة ولوحات معلومات واضحة.',
      card3_tags: ['تكليف التدريس', 'تسجيل الطالب', 'السنة الدراسية'],
      card4_title: 'متعدد اللغات بالتصميم',
      card4_desc: 'FR/AR/EN عبر واجهة المستخدم والوثائق. بنية i18n هجينة مع دعم RTL الصحيح ودعم صوتي — مبني أصلاً.',
      card4_tags: ['RTL/LTR', 'دعم صوتي', 'FR · AR · EN'],
    },
    arch: {
      kicker: 'الشفافية التقنية',
      title: 'بنية تتوسع بشكل نظيف',
      subtitle: 'مجموعة ويب + جوال حديثة مع أساس backend قوي للحوكمة وسلامة البيانات.',
      web_desc: 'لوحات تحكم المشرف والمعلم، واجهة الحوكمة، سير عمل المحتوى',
      mobile_desc: 'تجربة تعلم الطالب وولي الأمر مع التفاعل',
      api_desc: 'المصادقة والصلاحيات وسير العمل وطبقة المنطق التجاري',
      pg_desc: 'مصدر الحقيقة للمدارس والمحتوى والحضور',
      redis_desc: 'المهام غير المتزامنة: معالجة الوسائط، الاستيرادات، المهام الخلفية',
      obs_desc: 'مسارات التدقيق، السجلات، تاريخ المراجعة، قابلية التتبع الكاملة',
      coherence_title: 'مبني للتماسك',
      coherence_desc: 'نماذج نظيفة + سير عمل محكوم = حالات حافة أقل، تقارير أفضل، توسع أكثر أماناً.',
    },
    cta: {
      title: 'هل أنت مستعد لتحديث مؤسستك؟',
      subtitle: 'ابدأ بلوحة التحكم وسير عمل المحتوى ومحرك التعلم على الجوال. سنساعدك على الانطلاق بسلاسة.',
      login: 'الدخول إلى لوحة التحكم',
      sales: 'التحدث مع الفريق',
      get_title: 'ما ستحصل عليه',
      get_items: [
        'لوحة تحكم قائمة على الأدوار + إجراءات سريعة',
        'سير عمل المراجعة + الإصدار للأنشطة',
        'محرك التعلم على الجوال للطلاب',
        'تجربة متعددة اللغات (FR/AR/EN)',
      ],
      tags: ['الأمان أولاً', 'سير عمل محكوم', 'جوال أولاً', 'مبني للتوسع'],
    },
    footer: {
      tagline: 'إطار التعلم التكيفي للمدارس الحديثة.',
      product: 'المنتج',
      company: 'الشركة',
      resources: 'الموارد',
      features: 'المميزات',
      why: 'لماذا مختلف',
      architecture: 'البنية التقنية',
      about: 'حول',
      blog: 'مدونة',
      contact: 'اتصل بنا',
      docs: 'التوثيق',
      dashboard: 'لوحة التحكم',
      support: 'الدعم',
      terms: 'الشروط',
      privacy: 'الخصوصية',
      security: 'الأمان',
      built_with: 'مبني بـ Next.js 15 & Django',
    },
    pillar_learn_more: 'اعرف أكثر →',
    loading: 'جارٍ التحميل…',
  },
};

// ─── Public language switcher (lightweight, nav-style) ─────────────────────────

const langOptions = [
  { code: 'en' as Locale, label: 'EN', fullLabel: 'English', flag: '🇺🇸' },
  { code: 'fr' as Locale, label: 'FR', fullLabel: 'Français', flag: '🇫🇷' },
  { code: 'ar' as Locale, label: 'AR', fullLabel: 'العربية', flag: '🇸🇦' },
];

function PublicLanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = langOptions.find(l => l.code === locale) ?? langOptions[1];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/12 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
        aria-label="Switch language"
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-xl border shadow-xl border-gray-200 bg-white dark:border-white/10 dark:bg-[#0f172a]">
          {langOptions.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors
                ${locale === lang.code
                  ? 'bg-[#1e3a5f]/8 font-semibold text-[#1e3a5f] dark:bg-amber-400/10 dark:text-amber-300'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/5'
                }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.fullLabel}</span>
              {locale === lang.code && (
                <svg className="ml-auto h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border px-4 py-3 transition-colors border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <div className="text-[11px] text-gray-500 dark:text-white/55">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">{value}</div>
    </div>
  );
}

function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs font-semibold tracking-widest text-amber-600 dark:text-amber-300/90">
        {kicker.toUpperCase()}
      </div>
      <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#1e3a5f] dark:text-white md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-white/70">{subtitle}</p>
    </div>
  );
}

function PillarCard({ icon, title, bullets, learnMore }: { icon: string; title: string; bullets: string[]; learnMore: string }) {
  return (
    <div className="group rounded-3xl border p-6 transition-all duration-200 border-gray-200 bg-white hover:border-[#1e3a5f] hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl text-xl bg-gray-100 dark:bg-white/5">
          {icon}
        </div>
        <div className="text-lg font-semibold text-[#1e3a5f] dark:text-white">{title}</div>
      </div>
      <ul className="mt-5 space-y-2 text-sm text-gray-600 dark:text-white/70">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 text-xs font-semibold text-gray-400 transition-colors group-hover:text-[#1e3a5f] dark:text-white/45 dark:group-hover:text-white/80">
        {learnMore}
      </div>
    </div>
  );
}

function MoatCard({ title, desc, tags }: { title: string; desc: string; tags: string[] }) {
  return (
    <div className="rounded-3xl border p-6 transition-all duration-200 border-gray-200 bg-white hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-lg font-semibold text-[#1e3a5f] dark:text-white">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/70">{desc}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="rounded-full border px-3 py-1 text-xs font-semibold border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function FlowStep({ title, subtitle, pill, accent }: { title: string; subtitle: string; pill: string; accent: 'amber' | 'emerald' }) {
  const lightCls = accent === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const darkCls = accent === 'amber' ? 'dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/20' : 'dark:bg-emerald-400/15 dark:text-emerald-200 dark:border-emerald-400/20';
  return (
    <div className="rounded-2xl border p-4 transition-colors border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[#1e3a5f] dark:text-white">{title}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-white/65">{subtitle}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${lightCls} ${darkCls}`}>
          {pill}
        </span>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="mx-auto h-7 w-[2px] rounded-full bg-gradient-to-b from-gray-300 via-gray-100 to-gray-300 dark:from-white/15 dark:via-white/5 dark:to-white/15" />
  );
}

function FlowDiagram({ tr }: { tr: typeof pageTranslations['en'] }) {
  return (
    <div className="rounded-3xl border p-6 shadow-xl transition-colors border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[#1e3a5f] dark:text-white/90">{tr.flow.title}</div>
        <div className="rounded-full border px-3 py-1 text-xs border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
          {tr.flow.subtitle}
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        <FlowStep title={tr.flow.teacher_title} subtitle={tr.flow.teacher_sub} pill={tr.flow.teacher_pill} accent="amber" />
        <FlowArrow />
        <FlowStep title={tr.flow.admin_title} subtitle={tr.flow.admin_sub} pill={tr.flow.admin_pill} accent="emerald" />
        <FlowArrow />
        <FlowStep title={tr.flow.student_title} subtitle={tr.flow.student_sub} pill={tr.flow.student_pill} accent="amber" />
        <FlowArrow />
        <FlowStep title={tr.flow.insights_title} subtitle={tr.flow.insights_sub} pill={tr.flow.insights_pill} accent="emerald" />
      </div>
      <div className="mt-6 rounded-2xl border p-4 border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-[#0A1026]">
        <div className="text-xs font-semibold text-[#1e3a5f] dark:text-white/80">{tr.flow.why_title}</div>
        <p className="mt-1 text-sm text-gray-600 dark:text-white/70">{tr.flow.why_desc}</p>
      </div>
    </div>
  );
}

function ArchNode({ title, desc, tag }: { title: string; desc: string; tag: string }) {
  return (
    <div className="rounded-2xl border p-5 transition-colors border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#1e3a5f] dark:text-white">{title}</div>
        <span className="rounded-full border px-3 py-1 text-xs font-semibold border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          {tag}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-white/70">{desc}</p>
    </div>
  );
}

function ArchitectureDiagram({ tr }: { tr: typeof pageTranslations['en'] }) {
  const a = tr.arch;
  return (
    <div className="rounded-3xl border p-6 transition-colors md:p-8 border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid gap-6 md:grid-cols-3">
        <ArchNode title="Web (Next.js)" desc={a.web_desc} tag="Frontend" />
        <ArchNode title="Mobile (React Native)" desc={a.mobile_desc} tag="Frontend" />
        <ArchNode title="API (Django)" desc={a.api_desc} tag="Backend" />
      </div>
      <div className="my-6 h-px bg-gray-100 dark:bg-white/10" />
      <div className="grid gap-6 md:grid-cols-3">
        <ArchNode title="PostgreSQL" desc={a.pg_desc} tag="Data" />
        <ArchNode title="Redis + Celery" desc={a.redis_desc} tag="Async" />
        <ArchNode title="Observability" desc={a.obs_desc} tag="Trust" />
      </div>
      <div className="mt-6 rounded-2xl border p-4 border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-[#0A1026]">
        <div className="text-xs font-semibold text-[#1e3a5f] dark:text-white/80">{a.coherence_title}</div>
        <p className="mt-1 text-sm text-gray-600 dark:text-white/70">{a.coherence_desc}</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();
  const { locale } = useI18n();

  // Pick translations for the current locale
  const tr = pageTranslations[locale as Locale] ?? pageTranslations['fr'];

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#070B18]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1e3a5f] border-t-transparent dark:border-amber-400" />
          <span className="text-sm font-medium text-gray-500 dark:text-white/60">{tr.loading}</span>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 transition-colors duration-300 dark:bg-[#070B18] dark:text-gray-100">

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        :root { color-scheme: light; }
        html.dark { color-scheme: dark; }
        body { font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        h1, h2, h3, h4, h5, h6, .font-serif { font-family: 'DM Serif Display', serif; }
      `}</style>

      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-[#1e3a5f]/5 blur-[120px] transition-opacity duration-500 dark:opacity-0" />
        <div className="absolute top-[30%] -right-[10%] h-[40%] w-[40%] rounded-full bg-[#f59e0b]/5 blur-[100px] transition-opacity duration-500 dark:opacity-0" />
        <div className="absolute bottom-[10%] left-[20%] h-[30%] w-[30%] rounded-full bg-[#059669]/5 blur-[90px] transition-opacity duration-500 dark:opacity-0" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-0 blur-2xl transition-opacity duration-500 dark:opacity-100 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),rgba(245,158,11,0)_60%)]" />
        <div className="absolute -bottom-56 right-[-120px] h-[620px] w-[620px] rounded-full opacity-0 blur-2xl transition-opacity duration-500 dark:opacity-100 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),rgba(16,185,129,0)_60%)]" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-lg transition-colors border-gray-200 bg-white/80 dark:border-white/10 dark:bg-[#070B18]/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl font-black shadow-md bg-[#1e3a5f] text-white dark:bg-amber-400 dark:text-[#070B18]">
              <span className="font-serif text-lg">A</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide text-[#1e3a5f] dark:text-white">ALF</div>
              <div className="text-[11px] text-gray-400 dark:text-white/50">Adaptive Learning Framework</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm md:flex">
            <a href="#features" className="font-medium text-gray-500 transition-colors hover:text-[#1e3a5f] dark:text-white/65 dark:hover:text-white">{tr.nav.features}</a>
            <a href="#why-alf" className="font-medium text-gray-500 transition-colors hover:text-[#1e3a5f] dark:text-white/65 dark:hover:text-white">{tr.nav.why}</a>
            <a href="#architecture" className="font-medium text-gray-500 transition-colors hover:text-[#1e3a5f] dark:text-white/65 dark:hover:text-white">{tr.nav.architecture}</a>
          </nav>

          <div className="flex items-center gap-2">
            <PublicLanguageSwitcher />
            <ThemeToggle />
            <Link href="/auth/login" className="rounded-xl border px-4 py-2 text-sm font-semibold transition-all border-gray-200 bg-white text-[#1e3a5f] hover:border-[#1e3a5f] hover:bg-gray-50 dark:border-white/12 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
              {tr.nav.login}
            </Link>
            <a href="mailto:contact@alf-platform.com" className="hidden rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-all sm:inline-flex bg-amber-400 text-[#1e3a5f] shadow-amber-400/20 hover:bg-amber-500 dark:text-[#070B18] dark:hover:brightness-110">
              {tr.nav.demo}
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {tr.hero.badge}
              </div>

              <h1 className="mt-6 font-serif text-4xl leading-[1.07] tracking-tight text-[#1e3a5f] dark:text-white md:text-5xl lg:text-6xl">
                {tr.hero.headline_1}{' '}
                <span className="bg-gradient-to-r from-amber-500 to-amber-400 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-300">
                  {tr.hero.headline_2}
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 dark:text-white/75 md:text-lg">
                {tr.hero.subtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/auth/login" className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold shadow-xl transition-all hover:-translate-y-0.5 bg-[#1e3a5f] text-white shadow-[#1e3a5f]/20 hover:shadow-[#1e3a5f]/30 dark:bg-amber-400 dark:text-[#070B18] dark:shadow-amber-400/25 dark:hover:brightness-110">
                  {tr.hero.cta_login}
                </Link>
                <a href="mailto:contact@alf-platform.com" className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold transition-all border-[#1e3a5f] bg-white text-[#1e3a5f] hover:bg-[#f0f4f8] dark:border-white/12 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
                  {tr.hero.cta_demo}
                </a>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 md:max-w-lg">
                <StatPill label={tr.hero.stat_1_label} value={tr.hero.stat_1_value} />
                <StatPill label={tr.hero.stat_2_label} value={tr.hero.stat_2_value} />
                <StatPill label={tr.hero.stat_3_label} value={tr.hero.stat_3_value} />
                <StatPill label={tr.hero.stat_4_label} value={tr.hero.stat_4_value} />
              </div>
            </div>

            <div className="md:justify-self-end">
              <FlowDiagram tr={tr} />
            </div>
          </div>
        </section>

        {/* 3 Pillars */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <SectionHeader
            kicker={tr.features.kicker}
            title={tr.features.title}
            subtitle={tr.features.subtitle}
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <PillarCard icon="🧑‍🏫" title={tr.features.teacher_title} bullets={tr.features.teacher_bullets} learnMore={tr.pillar_learn_more} />
            <PillarCard icon="🏫" title={tr.features.school_title} bullets={tr.features.school_bullets} learnMore={tr.pillar_learn_more} />
            <PillarCard icon="📱" title={tr.features.student_title} bullets={tr.features.student_bullets} learnMore={tr.pillar_learn_more} />
          </div>
        </section>

        {/* Why Different */}
        <section id="why-alf" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <SectionHeader
            kicker={tr.why.kicker}
            title={tr.why.title}
            subtitle={tr.why.subtitle}
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <MoatCard title={tr.why.card1_title} desc={tr.why.card1_desc} tags={tr.why.card1_tags} />
            <MoatCard title={tr.why.card2_title} desc={tr.why.card2_desc} tags={tr.why.card2_tags} />
            <MoatCard title={tr.why.card3_title} desc={tr.why.card3_desc} tags={tr.why.card3_tags} />
            <MoatCard title={tr.why.card4_title} desc={tr.why.card4_desc} tags={tr.why.card4_tags} />
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <SectionHeader
            kicker={tr.arch.kicker}
            title={tr.arch.title}
            subtitle={tr.arch.subtitle}
          />
          <div className="mt-10">
            <ArchitectureDiagram tr={tr} />
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:pb-24">
          <div className="rounded-3xl border p-8 transition-colors md:p-10 border-gray-200 bg-[#f0f4f8] dark:border-white/10 dark:bg-[#0d1424]">
            <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#1e3a5f] dark:text-white md:text-3xl">
                  {tr.cta.title}
                </h3>
                <p className="mt-3 leading-relaxed text-gray-600 dark:text-white/75">
                  {tr.cta.subtitle}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/auth/login" className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold shadow-xl transition-all bg-[#1e3a5f] text-white hover:bg-[#152843] dark:bg-amber-400 dark:text-[#070B18] dark:hover:brightness-110">
                    {tr.cta.login}
                  </Link>
                  <a href="mailto:contact@alf-platform.com" className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold transition-all border-gray-300 bg-white text-[#1e3a5f] hover:bg-gray-50 dark:border-white/12 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
                    {tr.cta.sales}
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border p-6 transition-colors border-gray-200 bg-white dark:border-white/10 dark:bg-[#111827]">
                <div className="text-sm font-semibold text-[#1e3a5f] dark:text-white/90">{tr.cta.get_title}</div>
                <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-white/75">
                  {tr.cta.get_items.map((item: string) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {tr.cta.tags.map((tag: string) => (
                <span key={tag} className="rounded-full border px-3 py-1 text-xs font-medium border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t transition-colors border-gray-200 bg-white dark:border-white/10 dark:bg-[#070B18]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg font-black bg-[#1e3a5f] text-white dark:bg-amber-400 dark:text-[#070B18]">
                  <span className="font-serif">A</span>
                </div>
                <span className="font-serif text-lg font-bold text-[#1e3a5f] dark:text-white">ALF</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-white/50">{tr.footer.tagline}</p>
            </div>

            {[
              {
                title: tr.footer.product,
                links: [
                  { label: tr.footer.features, href: '#features' },
                  { label: tr.footer.why, href: '#why-alf' },
                  { label: tr.footer.architecture, href: '#architecture' },
                ],
              },
              {
                title: tr.footer.company,
                links: [
                  { label: tr.footer.about, href: '#' },
                  { label: tr.footer.blog, href: '#' },
                  { label: tr.footer.contact, href: 'mailto:contact@alf-platform.com' },
                ],
              },
              {
                title: tr.footer.resources,
                links: [
                  { label: tr.footer.docs, href: '#' },
                  { label: tr.footer.dashboard, href: '/dashboard' },
                  { label: tr.footer.support, href: 'mailto:contact@alf-platform.com' },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-3 text-sm font-semibold text-[#1e3a5f] dark:text-white/80">{col.title}</h4>
                <ul className="space-y-2 text-sm">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-gray-500 transition-colors hover:text-[#1e3a5f] dark:text-white/50 dark:hover:text-white">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs text-gray-400 dark:border-white/10 dark:text-white/40 md:flex-row">
            <p>© {new Date().getFullYear()} ALF Platform · {tr.footer.built_with}</p>
            <div className="flex gap-6">
              {[tr.footer.terms, tr.footer.privacy, tr.footer.security].map((l) => (
                <a key={l} href="#" className="transition-colors hover:text-[#1e3a5f] dark:hover:text-white">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}