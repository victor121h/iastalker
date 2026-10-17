// Server-only prompt moderation (EN + PT). A fast keyword/pattern filter that runs before any
// credits are debited. It enforces the hard limits of the content policy:
//   - sexual content involving minors (zero tolerance: explicit CSAM terms, minor + sexual terms,
//     explicit ages under 18 + sexual terms)
//   - sexualization / "undressing" of an uploaded photo (possibly a real person, no consent)
//   - deepfake / face-swap + sexual content, sexual content naming real people
//   - illegal sexual content (bestiality, necrophilia, non-consensual acts)
//
// Matching runs on several normalized variants of the prompt (accents stripped, homoglyphs and
// leetspeak decoded, separators collapsed, spaced-out letters joined, stretched letters squeezed)
// and always on whole words, so innocent words that merely contain a term ("Essex", "kidney",
// "Scunthorpe", "analysis") never match.

export type ModerationReason =
  | 'csam'
  | 'minor_sexual'
  | 'illegal'
  | 'deepfake_sexual'
  | 'reference_sexual'
  | 'real_person_sexual';

export type ModerationResult = { ok: true } | { ok: false; reason: ModerationReason };

// ── Term lists ───────────────────────────────────────────────────────────────────────────────
// Words are matched as whole words (an optional plural "s" is allowed). A trailing "*" means
// "any word starting with". Multi-word phrases are separated by single spaces.

/** Always blocked: unambiguous child-sexual-abuse terms. */
const CSAM_TERMS = [
  'loli', 'lolicon', 'shota', 'shotacon', 'toddlercon', 'preteen', 'pre teen',
  'pedo', 'pedophile', 'pedophilia', 'pedophilic', 'paedo', 'paedophile', 'paedophilia',
  'pedofilia', 'pedofilo', 'pedofila', 'hebephile', 'hebephilia', 'jailbait', 'pthc', 'ptsc', 'csam',
  'child porn*', 'children porn*', 'kiddie porn*', 'kiddy porn*', 'kid porn*', 'underage porn*', 'minor porn*',
  'child sex*', 'kiddie sex*', 'kiddy sex*', 'underage sex*', 'underage nude', 'underage naked',
  'pornografia infantil', 'porno infantil', 'sexo infantil', 'sexo com crianca', 'abuso sexual infantil',
  'nudez infantil', 'putaria infantil', 'exploracao sexual infantil',
];

/** Words that indicate a minor. Blocked when they co-occur with a sexual term. */
const MINOR_TERMS = [
  // EN
  'child', 'children', 'childlike', 'child like', 'kid', 'kiddie', 'kiddy', 'kiddo', 'minor',
  'underage', 'underaged', 'under age', 'under aged', 'teen', 'teenage', 'teenager', 'tween',
  'juvenile', 'pubescent', 'prepubescent', 'pre pubescent', 'schoolgirl', 'schoolboy', 'school girl',
  'school boy', 'school uniform', 'young girl', 'young boy', 'little girl', 'little boy', 'baby', 'babies',
  'toddler', 'infant', 'newborn', 'lolita', 'high school', 'highschool', 'middle school', 'elementary school',
  'grade school', 'junior high', 'kindergarten', 'preschool', 'preschooler',
  // PT
  'crianca', 'criancinha', 'infantil', 'infancia', 'menor', 'menores', 'menor de idade', 'menores de idade',
  'de menor', 'menina', 'menininha', 'menino', 'menininho', 'garotinha', 'garotinho', 'novinha', 'novinho',
  'adolescente', 'pre adolescente', 'colegial', 'colegiais', 'ninfeta', 'bebezinha', 'bebezinho', 'nenem',
  'recem nascido', 'recem nascida', 'pirralha', 'pirralho', 'moleca', 'moleque', 'ensino fundamental',
  'ensino medio', 'uniforme escolar', 'jardim de infancia',
];

/** Sexual terms, broad (includes suggestive words) — used together with minor indicators. */
const SEXUAL_TERMS = [
  // EN
  'nude', 'naked', 'nudity', 'nudist', 'nsfw', 'sex', 'sexy', 'sexual', 'sexually', 'sexualized', 'sexualised',
  'sexting', 'porn*', 'erotic*', 'explicit', 'topless', 'bottomless', 'lingerie', 'sensual', 'sensuality',
  'seductive', 'seduce', 'seducing', 'seduction', 'provocative', 'suggestive', 'undress*', 'unclothed',
  'disrobe*', 'strip naked', 'strip down', 'stripping down', 'strip tease', 'striptease', 'stripper', 'strip club',
  'strip show', 'strip poker', 'bikini', 'thong', 'underwear', 'panties', 'panty',
  'bra', 'breasts', 'boob*', 'tits', 'titties', 'nipple*', 'genital*', 'penis', 'vagina', 'pussy', 'cock',
  'orgasm*', 'masturb*', 'fuck*', 'blowjob*', 'cum', 'cumshot', 'horny', 'aroused', 'arousal', 'arousing',
  'intercourse', 'fetish*', 'bdsm', 'bondage', 'xxx', 'hentai', 'ecchi', 'lewd', 'kinky', 'onlyfans', 'anal',
  'spread legs', 'legs spread', 'lap dance', 'boudoir', 'pinup', 'pin up girl', 'pin up style', 'pin up model',
  'playboy', 'slut*', 'whore*', 'pervert*', 'grope*', 'groping', 'making out', 'erection', 'skinny dipping',
  'wet t shirt', 'see through clothes', 'see through dress', 'see through shirt', 'see through top',
  'see through lingerie', 'sheer lingerie', 'transparent clothes', 'transparent dress',
  // PT / ES
  'pelad*', 'nu', 'nua', 'nuas', 'nudez', 'nudista', 'despida', 'despido', 'despir*', 'seminua', 'seminu',
  'sem roupa', 'sem roupas', 'tirar a roupa', 'tira a roupa', 'tirando a roupa', 'tire a roupa', 'sexo',
  'sensualiz*', 'explicito', 'explicita', 'transando', 'transar', 'transa', 'safad*', 'gostosa', 'gostosinha',
  'gostoso', 'tesuda', 'tesudo', 'tesao', 'excitada', 'excitado', 'provocante', 'sedutora', 'sedutor',
  'calcinha', 'sutia', 'biquini', 'fio dental', 'peitos', 'seios', 'mamilo*', 'bunda', 'bundinha', 'buceta',
  'xoxota', 'xereca', 'punheta', 'gozada', 'putaria', 'puta', 'putinha', 'vadia', 'safadeza', 'pernas abertas',
  'abrindo as pernas', 'boquete', 'cuzinho', 'pau duro', 'desnuda', 'desnudo',
];

/** Non-consensual / violent sexual terms. */
const NONCONSENSUAL_TERMS = [
  'rape', 'raped', 'raping', 'rapist', 'molest*', 'non consensual', 'nonconsensual', 'forced sex', 'sexual assault',
  'sexually assaulted', 'drugged', 'passed out', 'estupr*', 'abuso sexual', 'sem consentimento', 'drogada',
  'dopada', 'desacordada',
];

/** Always blocked: illegal sexual content. */
const ILLEGAL_TERMS = [
  'bestiality', 'zoophilia', 'zoophile', 'zoofilia', 'zoofilo', 'zoofila', 'necrophilia', 'necrophile',
  'necrofilia', 'necrofilo',
];

/** Always blocked: tools / requests whose only purpose is to undress real people. */
const UNDRESS_TOOL_TERMS = ['nudify', 'nudifier', 'nudifying', 'deepnude', 'deep nude', 'undress app', 'undress ai'];

/**
 * Explicit sexualization / undressing terms (narrower than SEXUAL_TERMS: no "sexy"/"sensual").
 * Blocked when the request edits a reference photo, mentions a deepfake, or names a real person.
 */
const EXPLICIT_TERMS = [
  // EN
  'nude', 'naked', 'nudity', 'nsfw', 'sex', 'sexual', 'sexually', 'porn*', 'erotic*', 'explicit', 'topless',
  'bottomless', 'lingerie', 'undress*', 'unclothed', 'disrobe*', 'strip naked', 'strip down', 'stripping down',
  'strip tease', 'striptease', 'stripper', 'xxx', 'hentai', 'breasts', 'boobs', 'tits', 'titties', 'nipple*', 'genital*', 'penis', 'vagina', 'pussy',
  'cock', 'orgasm*', 'masturb*', 'fuck*', 'blowjob*', 'cum', 'cumshot', 'intercourse', 'onlyfans', 'panties',
  'underwear', 'thong', 'bra', 'see through clothes', 'see through dress', 'see through shirt', 'see through top',
  'see through lingerie', 'sheer lingerie', 'transparent clothes', 'transparent dress', 'wet t shirt',
  'skinny dipping', 'clothes removal',
  'clothing removal', 'bikini removal', 'x ray clothes', 'xray clothes',
  // PT / ES
  'pelad*', 'nu', 'nua', 'nuas', 'nudez', 'despida', 'despido', 'despir*', 'seminua', 'seminu', 'sem roupa',
  'sem roupas', 'sem a roupa', 'sem calcinha', 'sem sutia', 'sem biquini', 'sexo', 'explicito', 'explicita',
  'transando', 'transar', 'calcinha', 'sutia', 'peitos', 'seios', 'mamilo*', 'buceta', 'xoxota', 'xereca',
  'punheta', 'putaria', 'roupa transparente', 'roupa molhada', 'desnuda', 'desnudo',
];

/** Undressing requests phrased as "verb (+ up to 3 words) + garment". */
const UNDRESS_PATTERNS: RegExp[] = [
  /\b(?:remove|removes|removed|removing|take off|takes off|taking off|took off|strip off|strip|stripping|get rid of|lose|losing|peel off|rip off|tear off)\b(?: [a-z0-9]+){0,3} (?:clothes|clothing|bra|bras|bikini|bikinis|panties|underwear|lingerie|swimsuit)\b/,
  /\b(?:clothes|clothing|bra|bikini|panties|underwear|lingerie|swimsuit) (?:off|removed|gone)\b/,
  /\b(?:without|no|zero|minus) (?:any |her |his |their |the )?(?:clothes|clothing|bra|bikini|panties|underwear)\b/,
  /\b(?:tirar|tira|tire|tirando|tirou|remover|remove|removendo|remova|arrancar|arranca|arrancando|despir|despe|despindo|sumir com)\b(?: [a-z0-9]+){0,3} (?:roupa|roupas|calcinha|sutia|biquini|cueca|lingerie|maio)\b/,
];

const DEEPFAKE_TERMS = [
  'deepfake*', 'deep fake*', 'face swap*', 'faceswap*', 'swap face*', 'swap her face', 'swap his face',
  'troca de rosto', 'trocar o rosto', 'trocar rosto', 'troca de face', 'trocar a face',
];

/** Real, identifiable people (sexual content about them without consent is prohibited). */
const REAL_PERSON_TERMS = [
  'celebrity', 'celebrities', 'celeb', 'actress', 'actresses', 'singer', 'influencer', 'youtuber', 'tiktoker',
  'streamer', 'politician', 'my ex', 'ex girlfriend', 'ex boyfriend', 'ex wife', 'ex husband', 'my coworker',
  'my co worker', 'my colleague', 'my classmate', 'my neighbor', 'my neighbour', 'my boss', 'my teacher',
  'my sister', 'my cousin', 'my stepsister', 'my stepmom',
  'celebridade', 'celebridades', 'famosa', 'famosas', 'atriz', 'atrizes', 'cantora', 'influenciadora',
  'blogueira', 'apresentadora', 'minha ex', 'ex namorada', 'ex namorado', 'ex mulher', 'ex esposa', 'ex marido',
  'minha colega', 'meu colega', 'minha vizinha', 'minha chefe', 'minha professora', 'minha prima', 'minha irma',
];

/** Innocent phrases removed before matching so they cannot trigger a co-occurrence rule. */
const BENIGN_PATTERNS: RegExp[] = [
  /\bnaked eyes?\b/g,
  /\bnude (?:colou?rs?|tones?|shades?|palette|lipsticks?|lips?|makeup|heels|nails|pumps|beige)\b/g,
  /\bbaby (?:blue|pink|doll|oil|bump|hairs?|s breath|shower|steps?|face cream)\b/g,
  /\bkid (?:gloves|leather)\b/g,
  /\bthongs? (?:sandals?|flip flops?)\b/g,
  /\bsumma cum laude\b|\bmagna cum laude\b|\bcum laude\b/g,
  /\b(?:comic|strip mall|landing|led|light|film|gaza|las vegas|vegas) strips?\b|\bstrips? (?:mall|of)\b/g,
  /\bbreasts? (?:cancer|stroke|feeding)\b|\bchicken breasts?\b|\bbreastfeed\w*\b/g,
  /\bpeitos? de (?:frango|peru)\b/g,
  /\bsex pistols\b|\bessex\b|\bmiddlesex\b|\bsussex\b/g,
  /\bmenina dos olhos\b/g,
  /\bminor (?:change|detail|edit|adjustment|tweak|imperfection|flaw|scratch|key|chord|scale|role|issue|injury|blemish|variation|improvement|correction|touch|touchup|retouch|retouching|wrinkle|difference|character|league|planet|arcana|update|fix|bug|error|mistake|problem|damage|crack|tear|stain|mark|spot|enhancement|modification|alteration|refinement|cut|crop)(?:e?s)?\b/g,
  /\b(?:cintura|tamanho|seios|peitos|bunda|quadril|quadris|nariz|boca|labios|olhos|rosto|corpo|altura|estatura|pes|maos|imagem|foto|fonte|letra|versao|parte|detalhe|escala|proporcao|distancia|angulo|zoom|preco|valor|numero|grau|intensidade|brilho|contraste|sombra|luz|resolucao|qualidade)(?: um pouco| bem| muito| ainda| mais| levemente| ligeiramente)? menor(?:es)?\b/g,
  /\bmenor(?:es)? (?:que|do que|tamanho|detalhe|detalhes|escala|proporcao|parte|ideia|chance|problema|preco|quantidade|valor|numero|grau|intensidade|brilho|contraste|resolucao|qualidade|zoom|distancia)\b/g,
  /\b(?:um pouco|bem|muito|ainda|mais|levemente|ligeiramente|tamanho) menor(?:es)?\b/g,
  /\b(?:jogando|jogar|joga|jogam|jogamos|jogo de|partida de|bater uma|batendo uma|time de|campo de) peladas?\b|\bpeladas? de (?:futebol|bola|domingo|rua|fim de semana)\b/g,
  /\b(?:comida|bolo|bolos|sobremesa|refeicao|lanche|sorvete|pizza|torta|receita|cafe|chocolate|frutas?|sopa|almoco|jantar|janta|doces?|pao|paes|biscoitos?|bolacha|suco|cheiro|cheirinho|sabor|prato|massa|carne|feijoada|coxinha|brigadeiro|pipoca|risada|gargalhada|brincadeira|tarde|manha|sensacao|musica|praia|vida)(?: [a-z]+)? gostos[ao]s?\b|\bgostos[ao]s? (?:de comer|demais)\b/g,
];

// ── Explicit ages ────────────────────────────────────────────────────────────────────────────

const EN_NUMBERS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
];
const PT_NUMBERS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16,
  dezessete: 17, dezassete: 17,
};
const EN_NUM_ALT = EN_NUMBERS.join('|');
const PT_NUM_ALT = Object.keys(PT_NUMBERS).join('|');

const AGE_PATTERNS_EN: RegExp[] = [
  new RegExp(`\\b(\\d{1,3}|${EN_NUM_ALT}) ?(?:(?:years?|yrs?) olds?|yo|y o)\\b`, 'g'),
  new RegExp(`\\b(?:aged?|age of) (\\d{1,3}|${EN_NUM_ALT})\\b`, 'g'),
  /\b(\d{1,2})(?:st|nd|rd|th) grader?s?\b/g,
];
const AGE_PATTERNS_PT: RegExp[] = [
  new RegExp(`\\b(?:com|de|tem|tinha|tenho|ter|aos|apenas|so|idade de) (\\d{1,3}|${PT_NUM_ALT}) (?:anos|ano|aninhos|aninho)\\b`, 'g'),
  new RegExp(`\\b(\\d{1,3}|${PT_NUM_ALT}) (?:anos|ano|aninhos|aninho) de idade\\b`, 'g'),
  new RegExp(`\\b(\\d{1,3}|${PT_NUM_ALT}) (?:aninhos|aninho)\\b`, 'g'),
];
/** Phrases that state an age under 18 without a number to compare. */
const UNDER_18_RE =
  /\b(?:under|below|younger than|less than|not yet|not) (?:18|eighteen)\b|\b(?:menos de|abaixo de|menor de|menores de) (?:18|dezoito)\b|\b\d{1,2}o (?:ano|serie)\b/;

function ageValue(token: string): number {
  if (/^\d+$/.test(token)) return Number.parseInt(token, 10);
  const en = EN_NUMBERS.indexOf(token);
  if (en >= 0) return en;
  return Object.prototype.hasOwnProperty.call(PT_NUMBERS, token) ? PT_NUMBERS[token] : 99;
}

function mentionsMinorAge(text: string): boolean {
  if (UNDER_18_RE.test(text)) return true;
  const patterns = AGE_PATTERNS_EN.concat(AGE_PATTERNS_PT);
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (ageValue(m[1]) < 18) return true;
    }
  }
  return false;
}

// ── Normalization ────────────────────────────────────────────────────────────────────────────

const COMBINING_MARKS = /[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]/g;
const INVISIBLE_CHARS = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁯﻿]/g;

/** Look-alike letters (Cyrillic / Greek / Latin extended) mapped to ASCII. */
const HOMOGLYPHS: Record<string, string> = {
  'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h',
  'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'і': 'i',
  'ї': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'α': 'a', 'ε': 'e', 'ι': 'i',
  'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
  'ß': 'ss', 'æ': 'ae', 'ø': 'o', 'œ': 'oe', 'ı': 'i', 'ł': 'l', 'đ': 'd',
};
const HOMOGLYPH_RE = new RegExp(`[${Object.keys(HOMOGLYPHS).join('')}]`, 'g');

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
const LEET_RE = /[013457@$]/g;

function baseNormalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .toLowerCase()
    .replace(COMBINING_MARKS, '')
    .replace(INVISIBLE_CHARS, '')
    .replace(HOMOGLYPH_RE, (ch) => HOMOGLYPHS[ch] || ch);
}

/** Every non-alphanumeric run becomes a single space. */
function collapse(text: string): string {
  return text.replace(/[^a-z0-9]+/g, ' ').trim();
}

/** "s e x" → "sex" (3+ single letters in a row). */
function joinSpacedLetters(text: string): string {
  return text.replace(/\b[a-z](?: [a-z]){2,}\b/g, (m) => m.replace(/ /g, ''));
}

function addVariant(list: string[], value: string) {
  if (value && list.indexOf(value) === -1) list.push(value);
}

export function normalizationVariants(prompt: string): { plain: string[]; all: string[] } {
  const base = baseNormalize(prompt);
  const plainBase = collapse(base);
  const leetBase = collapse(base.replace(LEET_RE, (ch) => LEET[ch] || ch));

  const plain: string[] = [];
  const all: string[] = [];
  const expand = (text: string, target: string[]) => {
    addVariant(target, text);
    addVariant(target, joinSpacedLetters(text));
    addVariant(target, text.replace(/([a-z])\1{2,}/g, '$1')); // "nuuuude" → "nude"
    addVariant(target, text.replace(/([a-z])\1{2,}/g, '$1$1')); // "teeeen" → "teen"
  };
  expand(plainBase, plain);
  plain.forEach((v) => addVariant(all, v));
  expand(leetBase, all);
  return { plain, all };
}

function stripBenign(text: string): string {
  let out = text;
  for (const re of BENIGN_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, ' ');
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

// ── Matching ─────────────────────────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileTerms(terms: string[]): RegExp {
  const parts = terms.map((term) => {
    const prefix = term.endsWith('*');
    const words = (prefix ? term.slice(0, -1) : term).trim().split(/\s+/).map(escapeRegExp);
    return words.join(' ') + (prefix ? '[a-z0-9]*' : 's?');
  });
  return new RegExp(`\\b(?:${parts.join('|')})\\b`);
}

const RE = {
  csam: compileTerms(CSAM_TERMS),
  minor: compileTerms(MINOR_TERMS),
  sexual: compileTerms(SEXUAL_TERMS),
  nonconsensual: compileTerms(NONCONSENSUAL_TERMS),
  illegal: compileTerms(ILLEGAL_TERMS),
  undressTool: compileTerms(UNDRESS_TOOL_TERMS),
  explicit: compileTerms(EXPLICIT_TERMS),
  deepfake: compileTerms(DEEPFAKE_TERMS),
  realPerson: compileTerms(REAL_PERSON_TERMS),
  cp: /\bcps?\b/,
};

/**
 * Checks a generation prompt against the content policy.
 * `hasReference` = the request edits/animates an image that may show a real person.
 */
export function checkPrompt(prompt: string, opts: { hasReference?: boolean } = {}): ModerationResult {
  const { plain, all } = normalizationVariants(prompt || '');
  const texts = all.map(stripBenign).filter(Boolean);
  const plainTexts = plain.map(stripBenign).filter(Boolean);
  if (texts.length === 0) return { ok: true };

  const has = (re: RegExp) => texts.some((t) => re.test(t));
  const hasAny = (list: RegExp[]) => texts.some((t) => list.some((re) => re.test(t)));

  const sexual = has(RE.sexual);
  const nonconsensual = has(RE.nonconsensual);
  const explicit = has(RE.explicit) || hasAny(UNDRESS_PATTERNS);

  // 1. Child sexual abuse material — zero tolerance.
  if (has(RE.csam)) return { ok: false, reason: 'csam' };
  if ((sexual || nonconsensual) && has(RE.cp)) return { ok: false, reason: 'csam' };
  if (sexual || nonconsensual) {
    if (has(RE.minor) || plainTexts.some(mentionsMinorAge)) return { ok: false, reason: 'minor_sexual' };
  }

  // 2. Illegal / non-consensual sexual content.
  if (has(RE.illegal)) return { ok: false, reason: 'illegal' };
  if (nonconsensual && (sexual || explicit)) return { ok: false, reason: 'illegal' };

  // 3. Deepfakes & undressing tools.
  if (has(RE.undressTool)) return { ok: false, reason: 'deepfake_sexual' };
  if (explicit && has(RE.deepfake)) return { ok: false, reason: 'deepfake_sexual' };

  // 4. Sexualizing an uploaded photo (possibly a real person who did not consent).
  if (opts.hasReference && explicit) return { ok: false, reason: 'reference_sexual' };

  // 5. Explicit content about identifiable real people.
  if (explicit && has(RE.realPerson)) return { ok: false, reason: 'real_person_sexual' };

  return { ok: true };
}
