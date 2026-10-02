// database/seed.js
// Centralized questionnaire + social style content.
// Edit the arrays below to change questionnaire wording or style descriptions —
// nothing else in the app needs to change.

// Lazily required to avoid a circular require with database.js at module load time.
function getRunInTransaction() {
  return require('./database').runInTransaction;
}

const bcrypt = require('bcryptjs');

// Default admin account, created once on first run if no admin exists yet.
// Override via environment variables in production.
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

const ASSERTIVENESS_QUESTIONS = [
  { left: 'Quiet', right: 'Talkative',
    leftHi: 'शांत', rightHi: 'बातूनी',
    leftHint: 'You speak only when necessary and let others lead the conversation.',
    rightHint: 'You speak often, share opinions openly, and enjoy leading conversations.',
    leftHintHi: 'आप जरूरत पड़ने पर ही बोलते हैं और बातचीत में दूसरों को आगे रहने देते हैं।',
    rightHintHi: 'आप अक्सर बोलते हैं, खुलकर राय रखते हैं और बातचीत में आगे रहना पसंद करते हैं।' },
  { left: 'Slow to Decide', right: 'Fast to Decide',
    leftHi: 'निर्णय लेने में धीमा', rightHi: 'निर्णय लेने में तेज़',
    leftHint: 'You take your time and weigh options carefully before deciding.',
    rightHint: 'You decide quickly, often on the spot, without much deliberation.',
    leftHintHi: 'आप समय लेकर, सोच-समझकर फैसला करते हैं।',
    rightHintHi: 'आप जल्दी और तुरंत फैसला ले लेते हैं।' },
  { left: 'Going Along', right: 'Taking Charge',
    leftHi: 'साथ चलने वाला', rightHi: 'कमान संभालने वाला',
    leftHint: "You're comfortable following someone else's lead in a group.",
    rightHint: 'You naturally step up to lead and direct a group.',
    leftHintHi: 'आप समूह में किसी और के नेतृत्व में चलना पसंद करते हैं।',
    rightHintHi: 'आप स्वाभाविक रूप से समूह की कमान संभाल लेते हैं।' },
  { left: 'Supportive', right: 'Challenging',
    leftHi: 'सहयोगी', rightHi: 'चुनौती देने वाला',
    leftHint: 'You encourage and back others up rather than push back.',
    rightHint: 'You question ideas and push back to test how strong they are.',
    leftHintHi: 'आप दूसरों को प्रोत्साहित और समर्थन देते हैं।',
    rightHintHi: 'आप विचारों पर सवाल उठाते हैं और उन्हें परखते हैं।' },
  { left: 'Compliant', right: 'Dominant',
    leftHi: 'आज्ञाकारी', rightHi: 'हावी/प्रभावशाली',
    leftHint: "You go along with rules and other people's wishes easily.",
    rightHint: 'You take control and expect things to go your way.',
    leftHintHi: 'आप नियमों और दूसरों की इच्छाओं का आसानी से पालन करते हैं।',
    rightHintHi: 'आप नियंत्रण अपने हाथ में रखना और अपने तरीके से काम होना पसंद करते हैं।' },
  { left: 'Deliberate', right: 'Fast to Decide',
    leftHi: 'सोच-समझकर काम करने वाला', rightHi: 'निर्णय लेने में तेज़',
    leftHint: 'You think things through carefully before acting.',
    rightHint: 'You act quickly once you have a general sense of the situation.',
    leftHintHi: 'आप काम करने से पहले अच्छी तरह सोचते हैं।',
    rightHintHi: 'स्थिति समझते ही आप जल्दी काम कर देते हैं।' },
  { left: 'Asking Questions', right: 'Making Statements',
    leftHi: 'सवाल पूछने वाला', rightHi: 'सीधे बयान देने वाला',
    leftHint: 'You prefer to ask and understand before giving your view.',
    rightHint: 'You state your view directly and confidently.',
    leftHintHi: 'आप अपनी राय देने से पहले समझने के लिए सवाल पूछना पसंद करते हैं।',
    rightHintHi: 'आप सीधे और आत्मविश्वास से अपनी बात रखते हैं।' },
  { left: 'Cooperative', right: 'Competitive',
    leftHi: 'सहयोगात्मक', rightHi: 'प्रतिस्पर्धी',
    leftHint: 'You focus on working together and finding common ground.',
    rightHint: 'You focus on winning and being better than the alternative.',
    leftHintHi: 'आप मिलकर काम करने और सहमति बनाने पर ध्यान देते हैं।',
    rightHintHi: 'आप जीतने और बेहतर साबित होने पर ध्यान देते हैं।' },
  { left: 'Avoiding Risks', right: 'Taking Risks',
    leftHi: 'जोखिम से बचने वाला', rightHi: 'जोखिम उठाने वाला',
    leftHint: 'You prefer safe, proven choices over uncertain ones.',
    rightHint: "You're comfortable trying something uncertain for a bigger payoff.",
    leftHintHi: 'आप अनिश्चित विकल्पों की बजाय सुरक्षित और आजमाए हुए रास्ते चुनते हैं।',
    rightHintHi: 'आप बड़े फायदे के लिए अनिश्चित रास्ता अपनाने में सहज हैं।' },
  { left: 'Slow, Studied', right: 'Fast-paced',
    leftHi: 'धीमा, सोच-समझकर', rightHi: 'तेज़ गति वाला',
    leftHint: 'You move at a careful, measured pace.',
    rightHint: 'You move quickly and keep things moving fast.',
    leftHintHi: 'आप सोच-समझकर, धीमी लेकिन सधी हुई गति से काम करते हैं।',
    rightHintHi: 'आप तेज़ी से काम करते हैं और गति बनाए रखते हैं।' },
  { left: 'Cautious', right: 'Carefree',
    leftHi: 'सतर्क', rightHi: 'बेफिक्र',
    leftHint: 'You think about consequences before acting.',
    rightHint: 'You act freely without worrying much about consequences.',
    leftHintHi: 'आप काम करने से पहले परिणामों के बारे में सोचते हैं।',
    rightHintHi: 'आप बिना ज्यादा चिंता किए खुलकर काम करते हैं।' },
  { left: 'Indulgent', right: 'Firm',
    leftHi: 'नरमी बरतने वाला', rightHi: 'दृढ़',
    leftHint: 'You go easy on people and give them the benefit of the doubt.',
    rightHint: 'You hold a firm line and stick to your standards.',
    leftHintHi: 'आप दूसरों के प्रति नरम रुख रखते हैं।',
    rightHintHi: 'आप अपने रुख पर दृढ़ रहते हैं।' },
  { left: 'Nonassertive', right: 'Assertive',
    leftHi: 'कम मुखर', rightHi: 'मुखर',
    leftHint: 'You hold back your opinion rather than push it forward.',
    rightHint: 'You state your opinion clearly and stand by it.',
    leftHintHi: 'आप अपनी राय खुलकर सामने नहीं रखते।',
    rightHintHi: 'आप अपनी राय स्पष्ट रूप से रखते हैं और उस पर कायम रहते हैं।' },
  { left: 'Mellow', right: 'Matter-of-fact',
    leftHi: 'नरम स्वभाव का', rightHi: 'सीधी बात करने वाला',
    leftHint: 'You have an easygoing, gentle manner.',
    rightHint: 'You speak plainly and get straight to the point.',
    leftHintHi: 'आपका स्वभाव सहज और नरम है।',
    rightHintHi: 'आप सीधी और स्पष्ट बात करते हैं।' },
  { left: 'Reserved', right: 'Outgoing',
    leftHi: 'संकोची', rightHi: 'मिलनसार',
    leftHint: 'You keep to yourself in new or social settings.',
    rightHint: 'You reach out and engage easily with new people.',
    leftHintHi: 'नए या सामाजिक माहौल में आप खुद को संयमित रखते हैं।',
    rightHintHi: 'आप नए लोगों से आसानी से घुल-मिल जाते हैं।' }
];

// IMPORTANT — matches the reference form exactly:
// On the paper form, Assertiveness rows are numbered 1→4 left-to-right
// (left trait = 1, right trait = 4). Responsiveness rows are numbered
// 4→3→2→1 left-to-right instead (left trait = 4, right trait = 1) so that,
// after summing, a HIGH total always means "high on that dimension" for
// both scales (e.g. "Open" scores 4 because it's a high-responsiveness
// trait, even though it's the left-hand word). The frontend renders the
// answer buttons in the matching order per category — see
// public/js/assessment.js — so this file only needs to store left/right text.
const RESPONSIVENESS_QUESTIONS = [
  { left: 'Open', right: 'Closed',
    leftHi: 'खुले विचारों वाला', rightHi: 'बंद/गोपनीय स्वभाव का',
    leftHint: 'You share your feelings and thoughts freely with others.',
    rightHint: 'You keep your feelings and thoughts to yourself.',
    leftHintHi: 'आप अपने विचार और भावनाएं खुलकर साझा करते हैं।',
    rightHintHi: 'आप अपने विचार और भावनाएं अपने तक ही रखते हैं।' },
  { left: 'Impulsive', right: 'Deliberate',
    leftHi: 'आवेगी', rightHi: 'सोच-समझकर',
    leftHint: 'You react in the moment, based on how you feel.',
    rightHint: 'You pause and think before reacting.',
    leftHintHi: 'आप उस पल जैसा महसूस करते हैं, वैसी प्रतिक्रिया देते हैं।',
    rightHintHi: 'आप प्रतिक्रिया देने से पहले रुककर सोचते हैं।' },
  { left: 'Using Opinions', right: 'Using Facts',
    leftHi: 'राय पर आधारित', rightHi: 'तथ्यों पर आधारित',
    leftHint: 'You lean on personal views and gut feeling to make a point.',
    rightHint: 'You lean on data and facts to make a point.',
    leftHintHi: 'आप अपनी बात रखने के लिए व्यक्तिगत राय और अंतर्ज्ञान पर भरोसा करते हैं।',
    rightHintHi: 'आप अपनी बात रखने के लिए आंकड़ों और तथ्यों पर भरोसा करते हैं।' },
  { left: 'Informal', right: 'Formal',
    leftHi: 'अनौपचारिक', rightHi: 'औपचारिक',
    leftHint: 'You keep interactions relaxed and casual.',
    rightHint: 'You keep interactions structured and proper.',
    leftHintHi: 'आप बातचीत को सहज और आराम से रखते हैं।',
    rightHintHi: 'आप बातचीत को व्यवस्थित और औपचारिक रखते हैं।' },
  { left: 'Emotional', right: 'Unemotional',
    leftHi: 'भावुक', rightHi: 'भावों को कम दिखाने वाला',
    leftHint: 'Your feelings show clearly on your face and in your voice.',
    rightHint: 'You keep your feelings under control and hard to read.',
    leftHintHi: 'आपकी भावनाएं आपके चेहरे और आवाज़ में साफ झलकती हैं।',
    rightHintHi: 'आप अपनी भावनाओं को नियंत्रण में रखते हैं और आसानी से नहीं दिखाते।' },
  { left: 'Easy to Know', right: 'Hard to Know',
    leftHi: 'आसानी से समझ आने वाला', rightHi: 'समझने में मुश्किल',
    leftHint: 'People quickly get a sense of who you really are.',
    rightHint: 'People take time to figure out who you really are.',
    leftHintHi: 'लोग जल्दी समझ जाते हैं कि आप कैसे इंसान हैं।',
    rightHintHi: 'लोगों को आपको समझने में समय लगता है।' },
  { left: 'Warm', right: 'Cool',
    leftHi: 'गर्मजोशी भरा', rightHi: 'ठंडा/संयमित',
    leftHint: 'You come across as friendly and approachable.',
    rightHint: 'You come across as reserved and businesslike.',
    leftHintHi: 'आप मिलनसार और सहज स्वभाव के दिखते हैं।',
    rightHintHi: 'आप संयमित और व्यावसायिक अंदाज़ में दिखते हैं।' },
  { left: 'Excitable', right: 'Calm',
    leftHi: 'जल्दी उत्तेजित होने वाला', rightHi: 'शांत स्वभाव का',
    leftHint: 'Your energy and emotions rise quickly with the moment.',
    rightHint: 'You stay even and composed, no matter the situation.',
    leftHintHi: 'स्थिति के साथ आपकी ऊर्जा और भावनाएं जल्दी बढ़ जाती हैं।',
    rightHintHi: 'किसी भी स्थिति में आप शांत और संयमित रहते हैं।' },
  { left: 'Animated', right: 'Poker-faced',
    leftHi: 'जीवंत और अभिव्यक्तिपूर्ण', rightHi: 'भावहीन चेहरे वाला',
    leftHint: 'You use expressions, tone, and gestures a lot when talking.',
    rightHint: "Your expression stays neutral no matter what you're feeling.",
    leftHintHi: 'बात करते समय आप हाव-भाव और आवाज़ के उतार-चढ़ाव का खूब इस्तेमाल करते हैं।',
    rightHintHi: 'आप जो भी महसूस करें, आपका चेहरा सामान्य ही रहता है।' },
  { left: 'People-oriented', right: 'Task-oriented',
    leftHi: 'लोगों पर केंद्रित', rightHi: 'काम पर केंद्रित',
    leftHint: 'You focus first on the people involved in a situation.',
    rightHint: 'You focus first on getting the task done.',
    leftHintHi: 'आप सबसे पहले उस स्थिति में शामिल लोगों पर ध्यान देते हैं।',
    rightHintHi: 'आप सबसे पहले काम को पूरा करने पर ध्यान देते हैं।' },
  { left: 'Spontaneous', right: 'Cautious',
    leftHi: 'सहज/तत्क्षण प्रतिक्रिया देने वाला', rightHi: 'सतर्क',
    leftHint: 'You act on the moment without much planning.',
    rightHint: 'You plan ahead and proceed carefully.',
    leftHintHi: 'आप बिना ज्यादा योजना बनाए, पल में काम कर देते हैं।',
    rightHintHi: 'आप पहले से योजना बनाकर सावधानी से आगे बढ़ते हैं।' },
  { left: 'Responsive', right: 'Nonresponsive',
    leftHi: 'प्रतिक्रियाशील', rightHi: 'कम प्रतिक्रियाशील',
    leftHint: "You react and engage quickly with what's happening around you.",
    rightHint: "You stay steady and don't react much to what's around you.",
    leftHintHi: 'आप आसपास हो रही चीज़ों पर जल्दी प्रतिक्रिया देते हैं।',
    rightHintHi: 'आप स्थिर रहते हैं और आसपास की चीज़ों पर ज्यादा प्रतिक्रिया नहीं देते।' },
  { left: 'Humorous', right: 'Serious',
    leftHi: 'हास्यप्रिय', rightHi: 'गंभीर',
    leftHint: 'You bring lightness and humor into conversations.',
    rightHint: 'You keep conversations focused and to the point.',
    leftHintHi: 'आप बातचीत में हल्कापन और हास्य लाते हैं।',
    rightHintHi: 'आप बातचीत को केंद्रित और गंभीर रखते हैं।' },
  { left: 'Impulsive', right: 'Methodical',
    leftHi: 'आवेगी', rightHi: 'व्यवस्थित/क्रमबद्ध',
    leftHint: 'You jump in and adjust as you go.',
    rightHint: 'You follow a clear, step-by-step process.',
    leftHintHi: 'आप काम शुरू कर देते हैं और चलते-चलते समायोजित करते हैं।',
    rightHintHi: 'आप एक स्पष्ट, क्रमबद्ध तरीके से काम करते हैं।' },
  { left: 'Lighthearted', right: 'Intense',
    leftHi: 'हल्के-फुल्के स्वभाव का', rightHi: 'गंभीर/तीव्र',
    leftHint: "You keep things relaxed and don't take situations too seriously.",
    rightHint: 'You bring focus and intensity to what you do.',
    leftHintHi: 'आप चीज़ों को हल्के में लेते हैं और ज्यादा गंभीरता से नहीं लेते।',
    rightHintHi: 'आप जो भी करते हैं उसमें पूरी गंभीरता और तीव्रता लाते हैं।' }
];

const SOCIAL_STYLES = [
  {
    name: 'Analytical',
    description:
      'Analyticals are logical, data-oriented, and detail-focused. They prefer to gather facts, weigh options carefully, and make decisions based on evidence rather than emotion. They are organized, thoughtful, and cautious about risk.',
    strengths: JSON.stringify([
      'Logical thinking',
      'Accuracy',
      'Planning',
      'Attention to detail',
      'Research',
      'Data-based decision making'
    ]),
    challenges: JSON.stringify([
      'Over-analysis',
      'Slow decision making',
      'May appear reserved',
      'Can focus too much on details'
    ]),
    communication_style:
      'Analyticals communicate in a measured, fact-based way. They prefer written detail over spontaneous conversation and ask precise, probing questions before committing to a view.',
    decision_style:
      'Decisions are made methodically, after gathering sufficient data. Analyticals avoid snap judgments and prefer to weigh evidence and minimize risk before committing.',
    teamwork_style:
      'They contribute rigor, structure, and quality control to a team. They work best with clear processes and enough time to verify details, and they value competence over charisma.',
    improvement_suggestions: JSON.stringify([
      'Set decision deadlines to avoid analysis paralysis',
      'Practice sharing opinions before all data is available',
      'Work on expressing enthusiasm and warmth more openly',
      'Balance detail with the bigger picture'
    ]),
    backup_style: 'Avoider — withdraws and shuts down rather than engaging under pressure.',
    measures_success_by: 'Accuracy — being right, thorough, and error-free.',
    growth_need: 'To Decide — practice committing to a choice once "enough" data is in hand.',
    present_benefit: 'HOW — explain how the mechanism or process actually works.',
    decision_input: 'Evidence & Service — data, documentation, and reliable after-the-fact support.',
    specialty: 'Technical — depth, precision, and systematic problem-solving.',
    climate_needed: 'A logical, well-reasoned, and structured environment with time to verify details before deciding.',
    core_question: 'HOW does this mechanism work?',
    example_scenario:
      'Pitching to an Analytical (the detail-oriented CFO) — focus on data, logic, and accuracy: ' +
      '"Good afternoon. Here is the 5-year quantitative audit report and downside-capture ratios showing HOW ' +
      'this fund hedges against volatility. Please review the data sheets at your convenience." ' +
      'Give them evidence first, pressure never — analyticals need time and proof, not urgency.',
    description_hi:
      'एनालिटिकल तार्किक, डेटा-उन्मुख और बारीकियों पर ध्यान देने वाले होते हैं। वे तथ्य इकट्ठा करना, विकल्पों को ' +
      'ध्यान से तौलना और भावना की बजाय प्रमाण के आधार पर निर्णय लेना पसंद करते हैं। वे व्यवस्थित, विचारशील और ' +
      'जोखिम को लेकर सतर्क होते हैं।',
    example_scenario_hi:
      'एनालिटिकल को पिच करना (डिटेल-ओरिएंटेड CFO) — डेटा, तर्क और सटीकता पर ध्यान दें: "शुभ दोपहर। यह रहा 5-साल ' +
      'का ऑडिट रिपोर्ट और डाउनसाइड-कैप्चर रेशियो, जो दिखाता है कि यह फंड अस्थिरता से कैसे (HOW) बचाव करता है। ' +
      'कृपया अपनी सुविधा अनुसार डेटा शीट्स देख लें।" उन्हें दबाव नहीं, सबूत दें — एनालिटिकल को समय और प्रमाण ' +
      'चाहिए, जल्दबाज़ी नहीं।',
    strengths_hi: JSON.stringify([
      'तार्किक सोच',
      'सटीकता',
      'योजना बनाना',
      'बारीकियों पर ध्यान',
      'शोध करना',
      'डेटा के आधार पर फैसले लेना'
    ]),
    improvement_suggestions_hi: JSON.stringify([
      'फैसला लेने की एक समय-सीमा तय करें, ताकि जरूरत से ज्यादा सोचना न पड़े',
      'पूरा डेटा आने से पहले भी अपनी राय साझा करने का अभ्यास करें',
      'अपना उत्साह और गर्मजोशी खुलकर दिखाने पर काम करें',
      'बारीकियों के साथ-साथ बड़ी तस्वीर पर भी ध्यान दें'
    ])
  },
  {
    name: 'Driver',
    description:
      'Drivers are direct, decisive, and results-oriented. They move fast, focus on goals, and are comfortable taking charge and taking risks to get things done.',
    strengths: JSON.stringify([
      'Leadership',
      'Decision making',
      'Confidence',
      'Goal orientation',
      'Productivity'
    ]),
    challenges: JSON.stringify([
      'Can appear impatient',
      'May become overly direct',
      'May overlook emotions',
      'Can take excessive risks'
    ]),
    communication_style:
      'Drivers communicate directly and efficiently. They prefer brief, to-the-point exchanges focused on outcomes rather than small talk or lengthy background.',
    decision_style:
      'Decisions are made quickly and confidently, prioritizing speed and results. Drivers are comfortable taking calculated risks to keep momentum.',
    teamwork_style:
      'They naturally take charge, set direction, and push teams toward results. They work best when given autonomy and clear objectives rather than close supervision.',
    improvement_suggestions: JSON.stringify([
      'Pause to consider the emotional impact of decisions on others',
      'Practice active listening before responding',
      'Delegate more and allow others room to contribute',
      'Slow down for decisions with long-term consequences'
    ]),
    backup_style: 'Autocratic — takes over and dictates rather than collaborating under pressure.',
    measures_success_by: 'Results — tangible outcomes, wins, and the bottom line.',
    growth_need: 'To Listen — practice pausing to hear others out before deciding.',
    present_benefit: 'WHAT — lead with the bottom line and the concrete outcome.',
    decision_input: 'Options & Probabilities — a short list of choices with clear odds of success.',
    specialty: 'Controlling — driving execution and owning outcomes.',
    climate_needed: 'An environment that lets them build their own structure and move at their own pace.',
    core_question: 'WHAT is the bottom line?',
    example_scenario:
      'Pitching to a Driver (the busy Managing Director) — focus on results, speed, and control: ' +
      '"Good afternoon, Sir. This strategy delivered a 22% CAGR last year. Here are two execution options ' +
      'with a 90% probability of hitting your yield target. WHAT option would you like to lock in today?" ' +
      'Keep it short, lead with the number, and let them choose.',
    description_hi:
      'ड्राइवर सीधे, निर्णायक और परिणाम-उन्मुख होते हैं। वे तेज़ी से आगे बढ़ते हैं, लक्ष्यों पर ध्यान केंद्रित ' +
      'करते हैं, और काम पूरा करने के लिए कमान संभालने व जोखिम उठाने में सहज रहते हैं।',
    example_scenario_hi:
      'ड्राइवर को पिच करना (व्यस्त मैनेजिंग डायरेक्टर) — परिणाम, गति और नियंत्रण पर ध्यान दें: "शुभ दोपहर, सर। ' +
      'इस रणनीति ने पिछले साल 22% CAGR दिया। यहां दो विकल्प हैं जिनमें आपके यील्ड टारगेट को हासिल करने की 90% ' +
      'संभावना है। आप कौन सा (WHAT) विकल्प आज ही तय करना चाहेंगे?" बात छोटी रखें, नंबर से शुरू करें, और उन्हें ' +
      'चुनने दें।',
    strengths_hi: JSON.stringify([
      'नेतृत्व क्षमता',
      'फैसले लेने की क्षमता',
      'आत्मविश्वास',
      'लक्ष्य पर ध्यान',
      'उत्पादकता'
    ]),
    improvement_suggestions_hi: JSON.stringify([
      'फैसला लेने से पहले दूसरों पर उसके भावनात्मक असर के बारे में सोचें',
      'जवाब देने से पहले ध्यान से सुनने का अभ्यास करें',
      'ज्यादा काम सौंपें और दूसरों को भी योगदान करने का मौका दें',
      'लंबे समय तक असर करने वाले फैसलों में थोड़ा धीमे चलें'
    ])
  },
  {
    name: 'Amiable',
    description:
      'Amiables are friendly, supportive, and relationship-oriented. They value cooperation and harmony, and they are attentive, empathetic listeners who prioritize people over process.',
    strengths: JSON.stringify([
      'Teamwork',
      'Cooperation',
      'Listening',
      'Relationship building',
      'Support'
    ]),
    challenges: JSON.stringify([
      'Difficulty saying no',
      'Avoiding conflict',
      'Slow decisions',
      'May prioritize others too much'
    ]),
    communication_style:
      'Amiables communicate warmly and diplomatically. They favor a personal, relaxed tone and are careful to consider how their words affect others.',
    decision_style:
      'Decisions are made carefully and collaboratively, often seeking consensus and input from others before committing, which can slow the process down.',
    teamwork_style:
      'They are natural team players who build trust and smooth over friction. They work best in a supportive, low-conflict environment with stable relationships.',
    improvement_suggestions: JSON.stringify([
      'Practice setting boundaries and saying no when needed',
      'Get comfortable with healthy, constructive conflict',
      'Set firmer deadlines for personal decisions',
      'Advocate more directly for your own priorities'
    ]),
    backup_style: 'Acquiescer — gives in and goes along just to avoid conflict under pressure.',
    measures_success_by: 'Security — stability, safety, and steady relationships.',
    growth_need: 'To Initiate — practice speaking up and starting things instead of waiting.',
    present_benefit: 'WHY — explain why this is safe, necessary, and the right thing to do.',
    decision_input: 'Guarantees & Assurances — reassurance, protection, and a step-by-step process.',
    specialty: 'Supporting — building trust and keeping the group steady.',
    climate_needed: 'Clear, supportive details, stability, and no pressure to decide instantly.',
    core_question: 'WHY is this safe and necessary?',
    example_scenario:
      'Pitching to an Amiable (the cautious investor) — focus on security, trust, and risk aversion: ' +
      '"Hello, take your time. I understand how important family security is. WHY this fund is a good fit is ' +
      'because it offers capital-protection guarantees and stable, steady growth. We will go through it ' +
      'step-by-step together." Slow the pace down and reassure before asking for a decision.',
    description_hi:
      'एमिएबल मिलनसार, सहयोगी और रिश्तों को महत्व देने वाले होते हैं। वे सहयोग और सद्भाव को महत्व देते हैं, और ' +
      'ध्यान से सुनने वाले, सहानुभूतिपूर्ण श्रोता होते हैं जो प्रक्रिया से ज्यादा लोगों को प्राथमिकता देते हैं।',
    example_scenario_hi:
      'एमिएबल को पिच करना (सतर्क निवेशक) — सुरक्षा, भरोसे और जोखिम से बचाव पर ध्यान दें: "नमस्ते, आराम से ' +
      'सोचिए। मैं समझता हूं कि परिवार की सुरक्षा कितनी ज़रूरी है। यह फंड क्यों (WHY) सही है, क्योंकि यह ' +
      'पूंजी-सुरक्षा गारंटी और स्थिर वृद्धि देता है। हम इसे कदम-दर-कदम साथ मिलकर समझेंगे।" गति धीमी रखें और ' +
      'फैसला मांगने से पहले भरोसा दिलाएं।',
    strengths_hi: JSON.stringify([
      'टीमवर्क',
      'सहयोग',
      'सुनने की क्षमता',
      'रिश्ते बनाना',
      'सहारा देना'
    ]),
    improvement_suggestions_hi: JSON.stringify([
      'जरूरत पड़ने पर सीमाएं तय करना और मना करना सीखें',
      'स्वस्थ और ज़रूरी मतभेद में सहज होने का अभ्यास करें',
      'अपने व्यक्तिगत फैसलों के लिए पक्की समय-सीमा तय करें',
      'अपनी प्राथमिकताओं के लिए खुलकर आवाज़ उठाएं'
    ])
  },
  {
    name: 'Expressive',
    description:
      'Expressives are energetic, enthusiastic, and imaginative. They are outgoing and persuasive, thrive on interaction with people, and bring spontaneity and big-picture thinking to a room.',
    strengths: JSON.stringify([
      'Communication',
      'Creativity',
      'Motivation',
      'Networking',
      'Persuasion'
    ]),
    challenges: JSON.stringify([
      'Can become impulsive',
      'May overlook details',
      'Can lose focus',
      'May make quick decisions'
    ]),
    communication_style:
      'Expressives communicate animatedly and persuasively, using stories and enthusiasm to engage others. They enjoy open discussion and thinking out loud.',
    decision_style:
      'Decisions are made spontaneously, driven by enthusiasm and intuition rather than exhaustive analysis, which can lead to acting before all details are considered.',
    teamwork_style:
      'They energize teams, generate ideas, and build relationships quickly. They work best in dynamic, people-facing environments with room for creativity.',
    improvement_suggestions: JSON.stringify([
      'Slow down to verify details before committing',
      'Follow through on ideas with concrete plans',
      'Practice focused listening without interrupting',
      'Use checklists or structure to stay on track'
    ]),
    backup_style: 'Attacker — reacts loudly and personally when challenged under pressure.',
    measures_success_by: 'Applause — recognition, visibility, and enthusiasm from others.',
    growth_need: 'To Check — practice verifying facts and following through before moving on.',
    present_benefit: 'WHO — show who else is involved, backing this, or already on board.',
    decision_input: 'Testimonials & Incentives — social proof, success stories, and excitement.',
    specialty: 'Socializing — energizing people and building momentum quickly.',
    climate_needed: 'An environment that inspires them to reach big, exciting goals with room for people and ideas.',
    core_question: 'WHO is involved or backing this?',
    example_scenario:
      'Pitching to an Expressive (the visionary business owner) — focus on vision, status, and social proof: ' +
      '"Hello! We are launching an exclusive wealth-building circle for visionary leaders. Industry names are ' +
      'already on board (WHO), and the success stories so far have been incredible — this is going to be quite ' +
      'a journey!" Match their energy and lead with excitement, then anchor the details afterward.',
    description_hi:
      'एक्सप्रेसिव ऊर्जावान, उत्साही और कल्पनाशील होते हैं। वे बहिर्मुखी और प्रभावशाली होते हैं, लोगों के साथ ' +
      'जुड़ना पसंद करते हैं, और माहौल में सहजता व बड़े विचार लेकर आते हैं।',
    example_scenario_hi:
      'एक्सप्रेसिव को पिच करना (विज़नरी बिज़नेस ओनर) — विज़न, स्टेटस और सोशल प्रूफ पर ध्यान दें: "नमस्ते! हम ' +
      'विज़नरी लीडर्स के लिए एक एक्सक्लूसिव वेल्थ-बिल्डिंग सर्कल लॉन्च कर रहे हैं। इंडस्ट्री के बड़े नाम पहले ' +
      'से जुड़े हुए हैं (WHO), और अब तक की सफलता की कहानियां शानदार रही हैं — यह एक बेहतरीन सफर होने वाला है!" ' +
      'उनकी ऊर्जा से मेल खाएं और उत्साह से शुरुआत करें, फिर बाद में डिटेल्स पर आएं।',
    strengths_hi: JSON.stringify([
      'संवाद कौशल',
      'रचनात्मकता',
      'प्रेरणा देना',
      'नेटवर्किंग',
      'मनाने की कला'
    ]),
    improvement_suggestions_hi: JSON.stringify([
      'किसी भी काम को अंतिम रूप देने से पहले बारीकियां जांच लें',
      'अपने विचारों को ठोस योजना के साथ पूरा करें',
      'बीच में टोके बिना ध्यान से सुनने का अभ्यास करें',
      'ट्रैक पर बने रहने के लिए चेकलिस्ट या स्ट्रक्चर का इस्तेमाल करें'
    ])
  }
];

function seedQuestions(db) {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM questions').get();

  const rows = [
    ...ASSERTIVENESS_QUESTIONS.map((q, i) => ({
      category: 'assertiveness',
      question_number: i + 1,
      left_option: q.left,
      right_option: q.right,
      left_option_hi: q.leftHi,
      right_option_hi: q.rightHi,
      left_hint: q.leftHint,
      right_hint: q.rightHint,
      left_hint_hi: q.leftHintHi,
      right_hint_hi: q.rightHintHi
    })),
    ...RESPONSIVENESS_QUESTIONS.map((q, i) => ({
      category: 'responsiveness',
      question_number: i + 1,
      left_option: q.left,
      right_option: q.right,
      left_option_hi: q.leftHi,
      right_option_hi: q.rightHi,
      left_hint: q.leftHint,
      right_hint: q.rightHint,
      left_hint_hi: q.leftHintHi,
      right_hint_hi: q.rightHintHi
    }))
  ];

  if (countRow.count === 0) {
    const insert = db.prepare(`
      INSERT INTO questions
        (category, question_number, left_option, right_option, left_option_hi, right_option_hi,
         left_hint, right_hint, left_hint_hi, right_hint_hi, active)
      VALUES
        (@category, @question_number, @left_option, @right_option, @left_option_hi, @right_option_hi,
         @left_hint, @right_hint, @left_hint_hi, @right_hint_hi, 1)
    `);
    getRunInTransaction()(db, () => {
      for (const row of rows) insert.run(row);
    });
    console.log(`Seeded ${rows.length} questionnaire items.`);
    return;
  }

  // Questions already exist (e.g. an older DB from before Hindi translations
  // / examples were added) — backfill the new text on the existing rows
  // instead of inserting duplicates, matched by category + question_number.
  const update = db.prepare(`
    UPDATE questions
    SET left_option_hi = @left_option_hi, right_option_hi = @right_option_hi,
        left_hint = @left_hint, right_hint = @right_hint,
        left_hint_hi = @left_hint_hi, right_hint_hi = @right_hint_hi
    WHERE category = @category AND question_number = @question_number
  `);
  getRunInTransaction()(db, () => {
    for (const row of rows) {
      update.run({
        left_option_hi: row.left_option_hi,
        right_option_hi: row.right_option_hi,
        left_hint: row.left_hint,
        right_hint: row.right_hint,
        left_hint_hi: row.left_hint_hi,
        right_hint_hi: row.right_hint_hi,
        category: row.category,
        question_number: row.question_number
      });
    }
  });
}

function seedSocialStyles(db) {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM social_styles').get();

  const insertOrUpdate = db.prepare(`
    INSERT INTO social_styles
      (name, description, strengths, challenges, communication_style, decision_style, teamwork_style,
       improvement_suggestions, backup_style, measures_success_by, growth_need, present_benefit,
       decision_input, specialty, climate_needed, core_question, example_scenario,
       description_hi, example_scenario_hi, strengths_hi, improvement_suggestions_hi)
    VALUES
      (@name, @description, @strengths, @challenges, @communication_style, @decision_style, @teamwork_style,
       @improvement_suggestions, @backup_style, @measures_success_by, @growth_need, @present_benefit,
       @decision_input, @specialty, @climate_needed, @core_question, @example_scenario,
       @description_hi, @example_scenario_hi, @strengths_hi, @improvement_suggestions_hi)
    ON CONFLICT(name) DO UPDATE SET
      description = excluded.description,
      strengths = excluded.strengths,
      challenges = excluded.challenges,
      communication_style = excluded.communication_style,
      decision_style = excluded.decision_style,
      teamwork_style = excluded.teamwork_style,
      improvement_suggestions = excluded.improvement_suggestions,
      backup_style = excluded.backup_style,
      measures_success_by = excluded.measures_success_by,
      growth_need = excluded.growth_need,
      present_benefit = excluded.present_benefit,
      decision_input = excluded.decision_input,
      specialty = excluded.specialty,
      climate_needed = excluded.climate_needed,
      core_question = excluded.core_question,
      example_scenario = excluded.example_scenario,
      description_hi = excluded.description_hi,
      example_scenario_hi = excluded.example_scenario_hi,
      strengths_hi = excluded.strengths_hi,
      improvement_suggestions_hi = excluded.improvement_suggestions_hi
  `);

  // Upsert (not insert-only) so that an existing DB from before the richer
  // comparative-matrix content was added gets backfilled automatically,
  // instead of silently keeping the old, thinner rows forever.
  getRunInTransaction()(db, () => {
    for (const row of SOCIAL_STYLES) insertOrUpdate.run(row);
  });

  if (countRow.count === 0) {
    console.log(`Seeded ${SOCIAL_STYLES.length} social style definitions.`);
  }
}

function seedAdmin(db) {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (existingAdmin) return;

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

  db.prepare(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`
  ).run(ADMIN_NAME, ADMIN_EMAIL, passwordHash);

  console.log('----------------------------------------------------------');
  console.log('Default admin account created:');
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log('Set ADMIN_EMAIL / ADMIN_PASSWORD env vars to customize this,');
  console.log('and please change the password after first login.');
  console.log('----------------------------------------------------------');
}

function seedAll(db) {
  seedQuestions(db);
  seedSocialStyles(db);
  seedAdmin(db);
}

module.exports = { seedAll, seedQuestions, seedSocialStyles, seedAdmin };
