// Message catalogs (en / ar). Shell, navigation, hub and common action labels are translated so the
// RTL layout can be reviewed; most mock data stays in English.
window.I18N = {
  en: {
    product: 'Agents Platform', workspace: 'Acme Gov', tenant: 'Tenant',
    command: 'Command center', studio: 'Studio', liveops: 'Live ops', insights: 'Insights', assurance: 'Assurance', oversight: 'Oversight', tenantAdmin: 'Tenant admin',
    workers: 'Digital workers', flows: 'Flows', squads: 'Squads', playbooks: 'Playbooks', library: 'Library', connectors: 'Connectors',
    conversations: 'Conversations', touchpoints: 'Touchpoints', people: 'People', automations: 'Automations', checkpoints: 'Checkpoints queue', executions: 'Executions', safety: 'Safety rules',
    health: 'Health monitor', cx: 'Customer experience', exports: 'Exports', consumption: 'Consumption',
    testSuites: 'Test suites', reviewers: 'Reviewers', learned: 'Learned changes', recall: 'Recall', value: 'Value tracker',
    oversightSummary: 'Summary', credentials: 'Worker credentials', spend: 'Spend controls', assuranceReport: 'Assurance report', trail: 'Activity trail',
    orgStructure: 'Org structure', templates: 'Template gallery', subscription: 'Subscription', configuration: 'Configuration',
    studioMode: 'Studio mode', workMode: 'Work mode', nova: 'Ask Nova', search: 'Search', notifications: 'Notifications',
    profile: 'Profile', myMfa: 'Sign-in security', language: 'Language', signOut: 'Sign out', collapse: 'Collapse',
    newAgent: 'New worker', newWorkflow: 'New flow', create: 'Create', cancel: 'Cancel', save: 'Save', saveDraft: 'Save working copy',
    release: 'Release', discard: 'Discard', edit: 'Edit', delete: 'Delete', open: 'Open', test: 'Test', add: 'Add', close: 'Close',
    showing: 'Showing', of: 'of', all: 'All', status: 'Status', actions: 'Actions', name: 'Name', next: 'Next', back: 'Back', done: 'Done',
    parked: 'Later phase', parkedNote: 'This area is scheduled for a later phase. The preview shows its purpose and main data; screens will be designed when it is picked up.',
    goodEvening: 'Good evening', goodMorning: 'Good morning', goodAfternoon: 'Good afternoon',
    activeAgents: 'Workers live', pendingApprovals: 'Waiting at checkpoints', tokens: 'Tokens', runs: 'Executions', last7: 'last 7 days',
    yourAgents: 'Your workers', needsAttention: 'Needs you',
    signIn: 'Sign in', signInSso: 'Continue with company SSO', noAccount: 'New to Acme Gov?', createOne: 'Request access', email: 'Work email', password: 'Password',
    loginV1: 'Design digital workers from reusable blueprints and playbooks.',
    loginV2: 'Put a human checkpoint wherever a decision matters.',
    loginV3: 'Every action is traceable, and your data never leaves your tenant.',
    paletteHint: 'Jump to a page, worker, flow or setting…', quickActions: 'Quick actions', pages: 'Pages', prototype: 'Prototype',
    openHub: 'Open', sectionHome: 'Overview'
  },
  ar: {
    product: 'منصة الوكلاء', workspace: 'أكمي الحكومية', tenant: 'المستأجر',
    command: 'مركز القيادة', studio: 'الاستوديو', liveops: 'العمليات الحية', insights: 'الرؤى', assurance: 'الضمان', oversight: 'الرقابة', tenantAdmin: 'إدارة المستأجر',
    workers: 'العاملون الرقميون', flows: 'التدفقات', squads: 'الفرق', playbooks: 'أدلة العمل', library: 'المكتبة', connectors: 'الموصلات',
    conversations: 'المحادثات', touchpoints: 'نقاط التواصل', people: 'الأشخاص', automations: 'الأتمتة', checkpoints: 'قائمة نقاط التحقق', executions: 'التنفيذات', safety: 'قواعد السلامة',
    health: 'مراقبة الصحة', cx: 'تجربة المتعاملين', exports: 'التصدير', consumption: 'الاستهلاك',
    testSuites: 'حزم الاختبار', reviewers: 'المراجعون', learned: 'التغييرات المكتسبة', recall: 'الاستدعاء', value: 'متتبع القيمة',
    oversightSummary: 'الملخص', credentials: 'بيانات اعتماد العاملين', spend: 'ضوابط الإنفاق', assuranceReport: 'تقرير الضمان', trail: 'سجل النشاط',
    orgStructure: 'الهيكل التنظيمي', templates: 'معرض القوالب', subscription: 'الاشتراك', configuration: 'الإعدادات',
    studioMode: 'وضع الاستوديو', workMode: 'وضع العمل', nova: 'اسأل نوفا', search: 'بحث', notifications: 'الإشعارات',
    profile: 'الملف الشخصي', myMfa: 'أمان الدخول', language: 'اللغة', signOut: 'تسجيل الخروج', collapse: 'طي',
    newAgent: 'عامل جديد', newWorkflow: 'تدفق جديد', create: 'إنشاء', cancel: 'إلغاء', save: 'حفظ', saveDraft: 'حفظ نسخة العمل',
    release: 'إصدار', discard: 'تجاهل', edit: 'تعديل', delete: 'حذف', open: 'فتح', test: 'اختبار', add: 'إضافة', close: 'إغلاق',
    showing: 'عرض', of: 'من', all: 'الكل', status: 'الحالة', actions: 'الإجراءات', name: 'الاسم', next: 'التالي', back: 'السابق', done: 'تم',
    parked: 'مرحلة لاحقة', parkedNote: 'هذا القسم مجدول لمرحلة لاحقة. تعرض المعاينة الغرض والبيانات الرئيسية، وسيتم تصميم الشاشات عند العمل عليه.',
    goodEvening: 'مساء الخير', goodMorning: 'صباح الخير', goodAfternoon: 'مساء الخير',
    activeAgents: 'العاملون النشطون', pendingApprovals: 'بانتظار نقاط التحقق', tokens: 'الرموز', runs: 'التنفيذات', last7: 'آخر 7 أيام',
    yourAgents: 'عاملوك', needsAttention: 'بحاجة إليك',
    signIn: 'تسجيل الدخول', signInSso: 'المتابعة عبر الدخول الموحد', noAccount: 'جديد في أكمي؟', createOne: 'اطلب الوصول', email: 'البريد الإلكتروني للعمل', password: 'كلمة المرور',
    loginV1: 'صمّم عاملين رقميين من مخططات وأدلة عمل قابلة لإعادة الاستخدام.',
    loginV2: 'ضع نقطة تحقق بشرية حيثما يكون القرار مهماً.',
    loginV3: 'كل إجراء قابل للتتبع، وبياناتك لا تغادر مستأجرك.',
    paletteHint: 'انتقل إلى صفحة أو عامل أو تدفق أو إعداد…', quickActions: 'إجراءات سريعة', pages: 'الصفحات', prototype: 'نموذج أولي',
    openHub: 'فتح', sectionHome: 'نظرة عامة'
  }
};

window.t = function (key) {
  const lang = (window.APP && APP.lang) || 'en';
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
};
