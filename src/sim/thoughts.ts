/** Arabic thoughtlets for citizens. */

const COLD = [
  'بَرْد… بَرْد يخترق العظام.',
  'النار بعيدة جدًا.',
  'أصابعي لا تشعر بشيء.',
  'لو اقتربت من المولّد…',
  'هذا الصقيع لا يرحم.',
];

const HUNGRY = [
  'معدتي تصرخ…',
  'متى آخر وجبة؟',
  'رائحة الطعام من المطبخ… بعيد.',
  'أحتاج طعامًا الآن.',
  'الجوع أهون من البرد… ربما.',
];

const WORKING = [
  'العمل يدفئ قليلًا.',
  'لأجل المستوطنة.',
  'فحم… خشب… نجاة.',
  'كل ضربة فأس تقربنا من الفجر.',
  'لا وقت للشكوى.',
];

const HOPEFUL = [
  'المولّد يشتعل… هناك أمل.',
  'سننجو.',
  'الفجر قريب.',
  'دفء صغير يكفي.',
  'معًا نصمد.',
];

const DISCONTENT = [
  'لماذا أنا؟',
  'القوانين قاسية.',
  'هل يستحق هذا العناء؟',
  'الزعيم يقرر ونحن نرتجف.',
  'ملل… برد… ظلم.',
];

const IDLE = [
  'أين أذهب؟',
  'أنتظر أمرًا.',
  'الثلج يتساقط بلا نهاية.',
  'همست الريح باسمي.',
  'أنظر إلى المولّد.',
];

const WARM = [
  'دفء المولّد… نعمة.',
  'أخيرًا أشعر بأصابعي.',
  'الخيمة أفضل من العراء.',
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function thoughtFor(opts: {
  cold: number;
  hunger: number;
  hope: number;
  discontent: number;
  state: string;
  heatHere: number;
}): string {
  if (opts.cold > 70) return pick(COLD);
  if (opts.hunger > 70) return pick(HUNGRY);
  if (opts.heatHere > 0.55 && opts.cold < 30) return pick(WARM);
  if (opts.discontent > 55) return pick(DISCONTENT);
  if (opts.hope > 60 && Math.random() < 0.4) return pick(HOPEFUL);
  if (opts.state === 'working') return pick(WORKING);
  if (opts.state === 'idle') return pick(IDLE);
  if (opts.cold > 40) return pick(COLD);
  if (opts.hunger > 40) return pick(HUNGRY);
  return pick(IDLE);
}

export const NAMES_AR = [
  'آدم', 'نورة', 'سعيد', 'ليلى', 'فهد', 'مريم', 'ياسر', 'هند',
  'كريم', 'سلمى', 'راشد', 'دينا', 'ماجد', 'جنى', 'طارق', 'رغد',
  'وليد', 'أسمى', 'بدر', 'لينا', 'زياد', 'شهد', 'عمر', 'غادة',
  'حسن', 'بيان', 'ناصر', 'رنا', 'إياد', 'ميساء',
];
