const E = [
  'CANOPUS · THE GUIDING STAR','YOUR LEARNING UNIVERSE','Home','Learn','Focus','Progress','Your journey','Get started','SELECT LANGUAGE',
  'Your potential is','infinite.','A calmer, smarter way to learn. Turn your goals into progress and every study session into a step toward your future.',
  'WHAT DO YOU WANT TO DO TODAY?','Ask a question','AI explains any concept','Start focus session','25 min, no distractions','Upload a PDF',
  'Summaries and quizzes','See my progress','Goals and streaks','Built for curious minds.','YOUR PROGRESS','Weekly goal','3 day streak',
  'Keep your momentum','At your own pace','One session at a time','Progress that adds up','YOUR PERSONAL TOOLKIT','Everything you need to',
  'level up.','Less overwhelm. More clarity. A study experience that works for you.','01 / LEARN','AI Study Companion',
  'Break down difficult concepts into simple explanations and learn with greater confidence.','Explore learning','02 / FOCUS','Deep Focus',
  'Distraction-free study sessions with intentional breaks, so deep work becomes a habit.','Find your focus','02 / GROW','Progress Tracker',
  'See your progress, celebrate small wins, and build study habits that last.','Track your growth','Grow','YOUR FUTURE, ONE STEP AT A TIME',
  'Small steps.','Extraordinary growth.','You don’t need to have everything figured out. Just start with one goal, one session, and one step forward.',
  'Begin your journey','Made for curious minds. Built for brighter futures.','Tap to start deep focus','Paused · tap to resume',
  'Deep focus in progress','Session done. Nice work!','Opening AI Study Companion…','Starting a 25 min focus session…',
  'Ready for your PDF upload…','Loading your progress…','(preview)'
];

const L = {
  hi: [
    'कैनोपस · मार्गदर्शक तारा','आपका सीखने का ब्रह्मांड','होम','सीखें','फ़ोकस','प्रगति','आपकी यात्रा','शुरू करें','भाषा चुनें',
    'आपकी क्षमता','अनंत है।','सीखने का एक शांत, स्मार्ट तरीका। अपने लक्ष्यों को प्रगति में और हर अध्ययन सत्र को अपने भविष्य की ओर एक कदम में बदलें।',
    'आज आप क्या करना चाहते हैं?','प्रश्न पूछें','AI हर अवधारणा समझाता है','फ़ोकस सत्र शुरू करें','25 मिनट, बिना व्यवधान','PDF अपलोड करें',
    'सारांश और क्विज़','मेरी प्रगति देखें','लक्ष्य और स्ट्रीक','जिज्ञासु मनों के लिए बना।','आपकी प्रगति','साप्ताहिक लक्ष्य','3 दिन की स्ट्रीक',
    'अपनी गति बनाए रखें','अपनी रफ़्तार से','एक बार में एक सत्र','जुड़ती हुई प्रगति','आपका निजी टूलकिट','आगे बढ़ने के लिए आपको जो चाहिए,',
    'सब कुछ यहाँ।','कम उलझन। ज़्यादा स्पष्टता। एक ऐसा अध्ययन अनुभव जो आपके लिए काम करे।','01 / सीखें','AI स्टडी साथी',
    'कठिन अवधारणाओं को सरल व्याख्याओं में बाँटें और अधिक आत्मविश्वास से सीखें।','सीखना खोजें','02 / फ़ोकस','डीप फ़ोकस',
    'सोच-समझकर लिए गए ब्रेक के साथ बिना व्यवधान वाले अध्ययन सत्र, ताकि गहरा काम आदत बन जाए।','अपना फ़ोकस खोजें','03 / विकास','प्रगति ट्रैकर',
    'अपनी प्रगति देखें, छोटी जीत का जश्न मनाएँ और टिकाऊ अध्ययन आदतें बनाएँ।','अपना विकास ट्रैक करें','बढ़ें','आपका भविष्य, एक-एक कदम में',
    'छोटे कदम।','असाधारण विकास।','आपको सब कुछ पहले से तय करने की ज़रूरत नहीं है। बस एक लक्ष्य, एक सत्र और एक कदम से शुरुआत करें।',
    'अपनी यात्रा शुरू करें','जिज्ञासु मनों के लिए बना। उज्ज्वल भविष्य के लिए तैयार।','डीप फ़ोकस शुरू करने के लिए टैप करें','रुका हुआ · जारी रखने के लिए टैप करें',
    'डीप फ़ोकस जारी है','सत्र पूरा हुआ। शाबाश!','AI स्टडी साथी खुल रहा है…','25 मिनट का फ़ोकस सत्र शुरू हो रहा है…',
    'आपके PDF अपलोड के लिए तैयार…','आपकी प्रगति लोड हो रही है…','(पूर्वावलोकन)'
  ],
  es: [
    'CANOPUS · LA ESTRELLA GUÍA','TU UNIVERSO DE APRENDIZAJE','Inicio','Aprender','Enfoque','Progreso','Tu camino','Empezar','SELECCIONAR IDIOMA',
    'Tu potencial es','infinito.','Una forma más serena e inteligente de aprender. Convierte tus metas en progreso y cada sesión de estudio en un paso hacia tu futuro.',
    '¿QUÉ QUIERES HACER HOY?','Hacer una pregunta','La IA explica cualquier concepto','Iniciar sesión de enfoque','25 min, sin distracciones','Subir un PDF',
    'Resúmenes y cuestionarios','Ver mi progreso','Metas y rachas','Creado para mentes curiosas.','TU PROGRESO','Meta semanal','Racha de 3 días',
    'Mantén el impulso','A tu propio ritmo','Una sesión a la vez','Un progreso que suma','TU CAJA DE HERRAMIENTAS','Todo lo que necesitas para',
    'subir de nivel.','Menos agobio. Más claridad. Una experiencia de estudio que funciona para ti.','01 / APRENDER','Compañero de estudio con IA',
    'Desglosa conceptos difíciles en explicaciones simples y aprende con más confianza.','Explorar el aprendizaje','02 / ENFOQUE','Enfoque profundo',
    'Sesiones de estudio sin distracciones con descansos intencionados, para que el trabajo profundo sea un hábito.','Encuentra tu enfoque','03 / CRECER','Seguimiento del progreso',
    'Sigue tu crecimiento','Crecer','TU FUTURO, UN PASO A LA VEZ',
    'Pequeños pasos.','Crecimiento extraordinario.','No necesitas tenerlo todo resuelto. Empieza con una meta, una sesión y un paso adelante.',
    'Comienza tu camino','Hecho para mentes curiosas. Creado para futuros más brillantes.','Toca para iniciar el enfoque profundo','En pausa · toca para reanudar',
    'Enfoque profundo en curso','Sesión terminada. ¡Buen trabajo!','Abriendo el compañero de estudio con IA…','Iniciando sesión de enfoque de 25 min…',
    'Listo para subir tu PDF…','Cargando tu progreso…','(vista previa)'
  ],
  fr: [
    'CANOPUS · L’ÉTOILE GUIDE','VOTRE UNIVERS D’APPRENTISSAGE','Accueil','Apprendre','Concentration','Progrès','Votre parcours','Commencer','CHOISIR LA LANGUE',
    'Votre potentiel est','infini.','Une façon plus sereine et plus intelligente d’apprendre. Transformez vos objectifs en progrès et chaque séance d’étude en un pas vers votre avenir.',
    'QUE VOULEZ-VOUS FAIRE AUJOURD’HUI ?','Poser une question','L’IA explique tous les concepts','Lancer une séance de concentration','25 min, sans distraction','Importer un PDF',
    'Résumés et quiz','Voir ma progression','Objectifs et séries','Conçu pour les esprits curieux.','VOTRE PROGRESSION','Objectif hebdomadaire','Série de 3 jours',
    'Gardez votre élan','À votre rythme','Une séance à la fois','Des progrès qui s’accumulent','VOTRE BOÎTE À OUTILS','Tout ce qu’il faut pour',
    'passer au niveau supérieur.','Moins de stress. Plus de clarté. Une expérience d’étude qui vous convient.','01 / APPRENDRE','Compagnon d’étude IA',
    'Décomposez les concepts difficiles en explications simples et apprenez avec plus de confiance.','Explorer l’apprentissage','02 / CONCENTRATION','Concentration profonde',
    'Des séances d’étude sans distraction avec des pauses réfléchies, pour que le travail profond devienne une habitude.','Trouvez votre concentration','03 / PROGRESSER','Suivi des progrès',
    'Suivez votre évolution','Progresser','VOTRE AVENIR, UN PAS À LA FOIS',
    'Petits pas.','Progrès extraordinaires.','Pas besoin d’avoir tout planifié. Commencez avec un objectif, une séance et un pas en avant.',
    'Commencez votre parcours','Conçu pour les esprits curieux. Bâti pour un avenir meilleur.','Touchez pour démarrer la concentration','En pause · touchez pour reprendre',
    'Concentration en cours','Séance terminée. Bravo !','Ouverture du compagnon d’étude IA…','Lancement d’une séance de 25 min…',
    'Prêt pour l’import de votre PDF…','Chargement de votre progression…','(aperçu)'
  ]
};

const X = {
  'Agastya': { hi: 'अगस्त्य', es: 'Agastya', fr: 'Agastya' },
  'CANOPUS': { hi: 'कैनोपस', es: 'CANOPUS', fr: 'CANOPUS' },
  'Agastya — Your Learning Universe': { hi: 'अगस्त्य — आपका सीखने का ब्रह्मांड', es: 'Agastya — Tu universo de aprendizaje', fr: 'Agastya — Votre univers d’apprentissage' },
  'Agastya home': { hi: 'अगस्त्य होम', es: 'Inicio de Agastya', fr: 'Accueil Agastya' },
  'Main': { hi: 'मुख्य मेनू', es: 'Principal', fr: 'Principal' },
  'Select language': { hi: 'भाषा चुनें', es: 'Seleccionar idioma', fr: 'Choisir la langue' },
  'Study progress preview': { hi: 'अध्ययन प्रगति का पूर्वावलोकन', es: 'Vista previa del progreso de estudio', fr: 'Aperçu de la progression des études' },
  'Start or pause focus timer': { hi: 'फ़ोकस टाइमर शुरू या रोकें', es: 'Iniciar o pausar el temporizador de enfoque', fr: 'Démarrer ou mettre en pause le minuteur de concentration' },
  'Study philosophy': { hi: 'अध्ययन का दर्शन', es: 'Filosofía de estudio', fr: 'Philosophie d’étude' }
};

export const studioTranslations = [
  ['YOUR STUDY STUDIO','आपका स्टडी स्टूडियो','TU ESPACIO DE ESTUDIO','VOTRE ESPACE D’ÉTUDE'],
  ['Learn from your own material.','अपनी ही सामग्री से सीखें।','Aprende con tu propio material.','Apprenez avec votre propre contenu.'],
  ['Upload a PDF or paste your notes. Every answer comes only from what you provide.','PDF अपलोड करें या अपने नोट्स पेस्ट करें। हर उत्तर केवल आपकी दी हुई सामग्री से आता है।','Sube un PDF o pega tus apuntes. Cada respuesta sale solo de lo que aportas.','Importez un PDF ou collez vos notes. Chaque réponse provient uniquement de votre contenu.'],
  ['Material','सामग्री','Material','Contenu'],['Ask','पूछें','Preguntar','Demander'],['Quiz','क्विज़','Cuestionario','Quiz'],['Plan','योजना','Plan','Plan'],
  ['Choose a PDF','PDF चुनें','Elegir un PDF','Choisir un PDF'],
  ['or paste study material','या अध्ययन सामग्री पेस्ट करें','o pega material de estudio','ou collez votre contenu d’étude'],
  ['Use this material','इस सामग्री का उपयोग करें','Usar este material','Utiliser ce contenu'],
  ['Paste your notes or textbook text here…','अपने नोट्स या पाठ्यपुस्तक का पाठ यहाँ पेस्ट करें…','Pega aquí tus apuntes o texto del libro…','Collez ici vos notes ou le texte du manuel…'],
  ['Reading your PDF…','आपका PDF पढ़ा जा रहा है…','Leyendo tu PDF…','Lecture de votre PDF…'],
  ['Couldn’t read text from this PDF. If it is a scanned image, paste the text instead.','इस PDF से टेक्स्ट नहीं पढ़ा जा सका। यदि यह स्कैन की हुई छवि है, तो टेक्स्ट पेस्ट करें।','No se pudo leer texto de este PDF. Si es una imagen escaneada, pega el texto.','Impossible de lire le texte de ce PDF. S’il s’agit d’une image scannée, collez le texte.'],
  ['Add more material: at least a few full sentences are needed.','और सामग्री जोड़ें: कम से कम कुछ पूरे वाक्य चाहिए।','Añade más material: se necesitan al menos unas frases completas.','Ajoutez du contenu : il faut au moins quelques phrases complètes.'],
  ['Material loaded.','सामग्री लोड हो गई।','Material cargado.','Contenu chargé.'],
  ['sentences','वाक्य','frases','phrases'],['key topics','मुख्य विषय','temas clave','thèmes clés'],
  ['Add your material first.','पहले अपनी सामग्री जोड़ें।','Primero añade tu material.','Ajoutez d’abord votre contenu.'],
  ['Ask something about your material…','अपनी सामग्री के बारे में कुछ पूछें…','Pregunta algo sobre tu material…','Posez une question sur votre contenu…'],
  ['Explain','समझाएँ','Explicar','Expliquer'],['In simple words','सरल शब्दों में','En palabras simples','En termes simples'],
  ['Original passage','मूल अंश','Pasaje original','Passage d’origine'],
  ['Not in your material. This question can’t be answered from what you uploaded, so I won’t guess. Try different words or add the relevant pages.','आपकी सामग्री में नहीं है। यह प्रश्न आपकी अपलोड की गई सामग्री से हल नहीं हो सकता, इसलिए मैं अनुमान नहीं लगाऊँगा। अलग शब्द आज़माएँ या संबंधित पृष्ठ जोड़ें।','No está en tu material. Esta pregunta no se puede responder con lo que subiste, así que no voy a adivinar. Prueba con otras palabras o añade las páginas relevantes.','Absent de votre contenu. Cette question n’a pas de réponse dans ce que vous avez importé, donc je ne devine pas. Essayez d’autres mots ou ajoutez les pages utiles.'],
  ['Page','पृष्ठ','Página','Page'],['Passage','अंश','Pasaje','Passage'],
  ['Start diagnostic quiz','डायग्नोस्टिक क्विज़ शुरू करें','Iniciar cuestionario de diagnóstico','Lancer le quiz de diagnostic'],
  ['Choose the word that completes each passage.','हर अंश को पूरा करने वाला शब्द चुनें।','Elige la palabra que completa cada pasaje.','Choisissez le mot qui complète chaque passage.'],
  ['Submit answers','उत्तर जमा करें','Enviar respuestas','Envoyer les réponses'],['Score','स्कोर','Puntuación','Score'],
  ['Weak topics','कमज़ोर विषय','Temas débiles','Points faibles'],
  ['No weak topics. Great work!','कोई कमज़ोर विषय नहीं। बहुत बढ़िया!','Sin temas débiles. ¡Buen trabajo!','Aucun point faible. Bravo !'],
  ['Correct answer','सही उत्तर','Respuesta correcta','Bonne réponse'],
  ['See revision plan','रिवीज़न योजना देखें','Ver plan de repaso','Voir le plan de révision'],
  ['Your revision plan','आपकी रिवीज़न योजना','Tu plan de repaso','Votre plan de révision'],
  ['Take the diagnostic quiz first. Your plan is built from your weak topics.','पहले डायग्नोस्टिक क्विज़ लें। आपकी योजना आपके कमज़ोर विषयों से बनती है।','Haz primero el cuestionario de diagnóstico. Tu plan se crea con tus temas débiles.','Faites d’abord le quiz de diagnostic. Votre plan se base sur vos points faibles.'],
  ['Day 1','दिन 1','Día 1','Jour 1'],['Day 2','दिन 2','Día 2','Jour 2'],['Day 3','दिन 3','Día 3','Jour 3'],
  ['Re-read','फिर से पढ़ें','Releer','Relire'],['Answer practice questions','अभ्यास प्रश्न हल करें','Resolver preguntas de práctica','Répondre aux questions d’entraînement'],
  ['Retake the quiz','क्विज़ दोबारा दें','Repetir el cuestionario','Refaire le quiz'],
  ['Practise weak topics','कमज़ोर विषयों का अभ्यास करें','Practicar temas débiles','S’entraîner sur les points faibles'],
  ['Attempt','प्रयास','Intento','Essai'],
  ['No attempts yet. Take a quiz to see your progress.','अभी कोई प्रयास नहीं। प्रगति देखने के लिए क्विज़ दें।','Aún no hay intentos. Haz un cuestionario para ver tu progreso.','Aucun essai pour l’instant. Faites un quiz pour voir votre progression.'],
  ['Change since first attempt','पहले प्रयास के बाद बदलाव','Cambio desde el primer intento','Évolution depuis le premier essai'],
  ['Clear history','इतिहास साफ़ करें','Borrar historial','Effacer l’historique'],
  ['Diagnostic','डायग्नोस्टिक','Diagnóstico','Diagnostic'],['Practice','अभ्यास','Práctica','Entraînement'],
  ['Latest quiz score','नवीनतम क्विज़ स्कोर','Última puntuación','Dernier score']
];

studioTranslations.forEach((r) => {
  X[r[0]] = { hi: r[1], es: r[2], fr: r[3] };
});

export let currentLang = 'en';
const AT = ['aria-label', 'title', 'placeholder'];

export function tr(s) {
  if (currentLang === 'en') return s;
  const i = E.indexOf(s);
  if (i >= 0 && L[currentLang]) return L[currentLang][i];
  if (X[s] && X[s][currentLang]) return X[s][currentLang];
  return s;
}

export function applyLanguage() {
  document.documentElement.lang = currentLang;

  const toast = document.getElementById('toast');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  const nodes = [];

  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach((node) => {
    const p = node.parentNode;
    if (
      !p ||
      /^(SCRIPT|STYLE|OPTION)$/.test(p.nodeName) ||
      p.id === 'tlabel' ||
      (p.classList && p.classList.contains('dyn')) ||
      (window.__toast && toast && toast.contains(node))
    ) {
      return;
    }

    if (node.__o === undefined) node.__o = node.nodeValue;
    const k = node.__o.trim();
    if (!k) return;
    node.nodeValue = node.__o.replace(k, tr(k));
  });

  document.querySelectorAll('[aria-label],[title],[placeholder]').forEach((el) => {
    AT.forEach((at) => {
      if (!el.hasAttribute(at)) return;
      const key = '__o_' + at;
      if (el[key] === undefined) el[key] = el.getAttribute(at);
      el.setAttribute(at, tr(el[key]));
    });
  });

  document.title = tr('Agastya — Your Learning Universe');
  const m = document.querySelector('meta[name=description]');
  if (m) {
    if (m.dataset.o === undefined) m.dataset.o = m.content;
    m.content = tr(m.dataset.o);
  }

  if (window.renderDyn) window.renderDyn();
  if (window.__toast && window.showToast) window.showToast();
}

export function initI18n() {
  const s = document.getElementById('lang');
  try {
    const q = (location.search.match(/[?&]lang=(\w+)/) || [])[1];
    const v = q && L[q] ? q : localStorage.getItem('agastya-lang');
    if (v && (L[v] || v === 'en')) {
      currentLang = v;
      if (s) s.value = v;
      applyLanguage();
    }
  } catch (e) {
    console.error('i18n init error:', e);
  }

  if (s) {
    s.addEventListener('change', () => {
      currentLang = s.value;
      try {
        localStorage.setItem('agastya-lang', currentLang);
      } catch {}
      applyLanguage();
    });
  }
}
