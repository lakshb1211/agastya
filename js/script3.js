(function(){
var $=function(i){return document.getElementById(i)},mem={},SK='agastya-streak',AK='agastya-attempts',doc=null,quiz=null,last=null;
[['YOUR STUDY STUDIO','आपका स्टडी स्टूडियो','TU ESPACIO DE ESTUDIO','VOTRE ESPACE D’ÉTUDE'],
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
].forEach(function(r){X[r[0]]={hi:r[1],es:r[2],fr:r[3]}});

function ls(k,d){try{var v=localStorage.getItem(k);if(v)return JSON.parse(v)}catch(e){}return mem[k]!==undefined?mem[k]:d}
function sv(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function h(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function rx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function shuf(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function out(el,html){el.innerHTML=html;apply()}
function msg(el,k,c){out(el,'<div class="ans'+(c||'')+'"><span>'+k+'</span></div>')}

/* ---------- streak: starts at 0, +1 per active day, resets after a missed day ---------- */
function ymd(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function dd(a){var p=a.split('-'),t=new Date();return Math.round((new Date(t.getFullYear(),t.getMonth(),t.getDate())-new Date(+p[0],p[1]-1,+p[2]))/864e5)}
function streak(){var s=ls(SK,{n:0,last:null});if(s.last&&dd(s.last)>1&&s.n){s.n=0;sv(SK,s)}return s}
window.markActive=function(){var s=streak(),d=s.last?dd(s.last):null;if(d===0)return;s.n=d===1?s.n+1:1;s.last=ymd(new Date());sv(SK,s);renderDyn()};
function sT(n){return cur==='hi'?n+' दिन की स्ट्रीक':cur==='es'?'Racha de '+n+(n==1?' día':' días'):cur==='fr'?'Série de '+n+(n>1?' jours':' jour'):n+' day streak'}
window.renderDyn=function(){
 $('streakTxt').textContent=sT(streak().n);
 var a=ls(AK,[]),p=a.length?Math.round(a[a.length-1].s/a[a.length-1].t*100):0;
 $('pctBig').textContent=p+'%';$('pctRing').textContent=p+'%';document.querySelector('.prog').style.setProperty('--p',p+'%');};

/* ---------- reading the material ---------- */
var SW=new Set('the and for that with this from are was were have has had not but you your can will they their them which what when where who how why does did its into than then also such been being more most other some any all one two use used using about over under between each per del las los una uno con por para que como mas pero sus este esta estos les des une est sont pour dans qui par pas plus aux sur cette ces का की के है हैं में से और को पर यह वह एक नहीं'.split(' '));
function tok(s){return(s.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)||[]).filter(function(w){return w.length>3&&!SW.has(w)&&!/^\d+$/.test(w)})}
function sents(t){return(t.replace(/\s+/g,' ').match(/[^.!?।]+[.!?।]*\s*/g)||[]).map(function(x){return x.trim()})}
function chunk(t){var o=[],c='',n=1;sents(t).forEach(function(s){c+=(c?' ':'')+s;if(c.length>1000){o.push({n:n++,text:c});c=''}});if(c)o.push({n:n,text:c});return o}
function analyse(pages){var S=[],df={},tf={};
 pages.forEach(function(p){sents(p.text).forEach(function(t){if(t.length>25){var w=tok(t),st=new Set(w);S.push({t:t,p:p.n,w:w,set:st});st.forEach(function(x){df[x]=(df[x]||0)+1});w.forEach(function(x){tf[x]=(tf[x]||0)+1})}})});
 var N=S.length,idf=function(x){return Math.log(1+N/(df[x]||1))};
 var kw=Object.keys(tf).filter(function(x){return tf[x]>=2&&df[x]<N*.8}).sort(function(a,b){return tf[b]*idf(b)-tf[a]*idf(a)});
 var topics=kw.slice(0,6);
 S.forEach(function(s){s.topic=topics.filter(function(t){return s.set.has(t)})[0]});
 return{S:S,N:N,idf:idf,topics:topics,kw:kw.slice(0,14),used:new Set()}}
function setDoc(pages,pdf){var a=analyse(pages);
 if(a.N<4||a.topics.length<2){doc=null;msg($('mstat'),'Add more material: at least a few full sentences are needed.');return}
 a.unit=pdf?'Page':'Passage';doc=a;quiz=null;last=null;markActive();
 out($('mstat'),'<span>Material loaded.</span> <b>'+a.N+'</b> <span>sentences</span> · <b>'+a.topics.length+'</b> <span>key topics</span><div>'+a.topics.map(function(t){return'<i class="chip dyn">'+h(cap(t))+'</i>'}).join('')+'</div>');}
$('use').addEventListener('click',function(){var t=$('paste').value.trim();if(t)setDoc(chunk(t),false)});
function ensurePdf(ok,bad){if(window.pdfjsLib)return ok();var B='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/',s=document.createElement('script');s.src=B+'pdf.min.js';s.onerror=bad;
 s.onload=function(){var w=document.createElement('script');w.src=B+'pdf.worker.min.js';w.onerror=bad;w.onload=function(){pdfjsLib.GlobalWorkerOptions.workerSrc=w.src;ok()};document.head.appendChild(w)};document.head.appendChild(s)}
$('pdf').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;msg($('mstat'),'Reading your PDF…');
 var bad=function(){msg($('mstat'),'Couldn’t read text from this PDF. If it is a scanned image, paste the text instead.')},r=new FileReader();
 r.onerror=bad;r.onload=function(){ensurePdf(function(){pdfjsLib.getDocument({data:new Uint8Array(r.result)}).promise.then(function(d){var ps=[],i=1;
  (function next(){if(i>d.numPages){return ps.some(function(p){return p.text.trim().length>30})?setDoc(ps,true):bad()}
   d.getPage(i).then(function(p){return p.getTextContent()}).then(function(c){ps.push({n:i,text:c.items.map(function(x){return x.str}).join(' ')});i++;next()}).catch(bad)})()}).catch(bad)},bad)};
 r.readAsArrayBuffer(f)});

/* ---------- ask: answers come only from the material ---------- */
function simple(t){t=t.replace(/\s*\([^)]*\)/g,'');if(t.length>150){var c=t.slice(0,150),i=Math.max(c.lastIndexOf(', '),c.lastIndexOf('; '));t=(i>60?c.slice(0,i):c.replace(/\s+\S*$/,''))+'…'}return t}
function ask(){var o=$('aout'),q=$('q').value.trim();if(!q)return;markActive();
 if(!doc)return msg(o,'Add your material first.',' no');
 var qt=tok(q),need=Math.max(1,Math.ceil(qt.length/2));
 var sc=doc.S.map(function(s){var m=0,v=0;qt.forEach(function(x){var hit=s.set.has(x)||(x.length>4&&s.w.some(function(y){return y.length>4&&y.indexOf(x.slice(0,5))===0}));if(hit){m++;v+=doc.idf(x)}});return{s:s,m:m,v:v}}).filter(function(r){return r.m}).sort(function(a,b){return b.v-a.v});
 if(!qt.length||!sc.length||sc[0].m<need)return msg(o,'Not in your material. This question can’t be answered from what you uploaded, so I won’t guess. Try different words or add the relevant pages.',' no');
 var top=sc.filter(function(r){return r.m>=need&&r.v>=sc[0].v*.45}).slice(0,3);
 out(o,'<div class="ans"><b>In simple words</b><ul>'+top.map(function(r){var s=r.s,sm=simple(s.t);return'<li><span class="dyn">'+h(sm)+'</span><span class="ref"><i>'+doc.unit+'</i> '+s.p+'</span>'+(sm!==s.t?'<details><summary>Original passage</summary><span class="dyn">'+h(s.t)+'</span></details>':'')+'</li>'}).join('')+'</ul></div>');}
$('askb').addEventListener('click',ask);$('q').addEventListener('keydown',function(e){if(e.key==='Enter')ask()});

/* ---------- quiz ---------- */
function build(s){var re=new RegExp('(^|[^\\p{L}\\p{N}])('+rx(s.topic)+')(?![\\p{L}\\p{N}])','iu');if(!re.test(s.t))return null;
 var ds=shuf(doc.kw.filter(function(k){return k!==s.topic&&!s.set.has(k)})).slice(0,3);if(ds.length<3)return null;
 return{text:s.t.replace(re,'$1_____'),ans:s.topic,o:shuf(ds.concat([s.topic])),topic:s.topic,p:s.p,s:s}}
function gen(n,only){var by={};doc.S.forEach(function(s){if(s.topic&&s.t.length>=40&&s.t.length<=260&&(!only||only.indexOf(s.topic)>-1))(by[s.topic]=by[s.topic]||[]).push(s)});
 var ts=shuf(Object.keys(by)),qs=[],i=0,g=0;if(!ts.length)return qs;
 ts.forEach(function(k){shuf(by[k]).sort(function(a,b){return(doc.used.has(a)?1:0)-(doc.used.has(b)?1:0)})});
 while(qs.length<n&&g++<300){var s=by[ts[i++%ts.length]].shift();if(!s)continue;var q=build(s);if(q){qs.push(q);doc.used.add(s)}}return qs}
function startQuiz(kind,only){var st=$('qstage');if(!doc)return msg(st,'Add your material first.',' no');
 var qs=gen(kind==='d'?8:5,only);if(qs.length<3&&only)qs=gen(5);if(qs.length<2)return msg(st,'Add more material: at least a few full sentences are needed.',' no');
 quiz={k:kind,qs:qs};
 out(st,'<p class="note"><span>Choose the word that completes each passage.</span></p>'+qs.map(function(q,i){return'<div class="qq" id="qq'+i+'"><div><b>'+(i+1)+'.</b> <span class="dyn">'+h(q.text)+'</span></div>'+q.o.map(function(o){return'<label><input type="radio" name="r'+i+'" value="'+h(o)+'"> <span class="dyn">'+h(cap(o))+'</span></label>'}).join('')+'</div>'}).join('')+'<div class="row"><button class="b2" data-act="submit">Submit answers</button></div><div id="qres"></div>');}
function submit(){if(!quiz)return;var r=0,tp={};
 quiz.qs.forEach(function(q,i){var c=document.querySelector('input[name=r'+i+']:checked'),ok=!!c&&c.value===q.ans,t=tp[q.topic]=tp[q.topic]||[0,0];t[1]++;if(ok){r++;t[0]++}
  var b=$('qq'+i);b.className='qq '+(ok?'ok':'bad');if(!ok)b.insertAdjacentHTML('beforeend','<div class="note"><b>Correct answer</b>: <span class="dyn">'+h(cap(q.ans))+'</span><span class="ref"><i>'+doc.unit+'</i> '+q.p+'</span></div>')});
 document.querySelectorAll('#qstage input').forEach(function(x){x.disabled=true});var sb=document.querySelector('[data-act=submit]');if(sb)sb.remove();
 var a=ls(AK,[]);a.push({d:Date.now(),k:quiz.k,s:r,t:quiz.qs.length,tp:tp});sv(AK,a);markActive();
 var weak=Object.keys(tp).filter(function(k){return tp[k][0]/tp[k][1]<.7});last={weak:weak};quiz=null;
 out($('qres'),'<div class="ans"><b>Score</b>: <span class="dyn">'+r+' / '+a[a.length-1].t+'</span><br><b>Weak topics</b>: '+(weak.length?weak.map(function(t){return'<i class="chip dyn">'+h(cap(t))+'</i>'}).join(''):'<span>No weak topics. Great work!</span>')+'<div class="row"><button class="b2" data-act="plan">See revision plan</button></div></div>');
 renderDyn();$('qres').scrollIntoView({behavior:'smooth',block:'nearest'});}

/* ---------- revision plan + progress ---------- */
function renderPlan(){var el=$('pout');
 if(!doc||!last)return out(el,'<p class="note"><span>Take the diagnostic quiz first. Your plan is built from your weak topics.</span></p>');
 if(!last.weak.length)return msg(el,'No weak topics. Great work!');
 out(el,'<h3>Your revision plan</h3>'+last.weak.map(function(t){var pg=[];doc.S.forEach(function(s){if(s.topic===t&&pg.indexOf(s.p)<0)pg.push(s.p)});pg.sort(function(a,b){return a-b});
  return'<div class="stp"><b class="dyn">'+h(cap(t))+'</b><div><span>Day 1</span> · <span>Re-read</span><span class="ref"><i>'+doc.unit+'</i> '+pg.slice(0,6).join(', ')+'</span></div><div><span>Day 2</span> · <span>Answer practice questions</span></div><div><span>Day 3</span> · <span>Retake the quiz</span></div></div>'}).join('')+'<div class="row"><button class="b2" data-act="practice">Practise weak topics</button></div>');}
function renderProgress(){var a=ls(AK,[]),el=$('gout');
 if(!a.length)return out(el,'<p class="note"><span>No attempts yet. Take a quiz to see your progress.</span></p>');
 var pc=function(x){return Math.round(x.s/x.t*100)},rows=a.slice(-10),base=a.length-rows.length;
 out(el,rows.map(function(x,i){var p=pc(x),w=Object.keys(x.tp).filter(function(k){return x.tp[k][0]/x.tp[k][1]<.7});
  return'<div class="hist"><b><span>Attempt</span> '+(base+i+1)+'</b><div class="bar"><span style="width:'+p+'%"></span></div><span class="dyn">'+x.s+'/'+x.t+' · '+p+'%</span><span>'+(x.k==='d'?'Diagnostic':'Practice')+'</span></div>'+(w.length?'<div><b>Weak topics</b>: '+w.map(function(t){return'<i class="chip dyn">'+h(cap(t))+'</i>'}).join('')+'</div>':'')}).join('')+
  (a.length>1?(function(){var d=pc(a[a.length-1])-pc(a[0]);return'<p class="note"><b>Change since first attempt</b>: <span class="dyn">'+(d>0?'+':'')+d+'%</span></p>'})():'')+'<div class="row"><button class="b2 ghost" data-act="clear">Clear history</button></div>');}

/* ---------- tabs, actions, wiring ---------- */
function tab(t){document.querySelectorAll('.tabs button').forEach(function(b){b.classList.toggle('on',b.dataset.t===t)});document.querySelectorAll('.pn').forEach(function(p){p.classList.toggle('on',p.id==='p-'+t)});
 if(t==='plan')renderPlan();if(t==='progress')renderProgress();}
document.querySelectorAll('.tabs button').forEach(function(b){b.addEventListener('click',function(){tab(b.dataset.t)})});
$('startq').addEventListener('click',function(){startQuiz('d')});
$('studio').addEventListener('click',function(e){var a=e.target.closest('[data-act]');if(!a)return;var k=a.dataset.act;
 if(k==='submit')submit();else if(k==='plan')tab('plan');else if(k==='practice'){tab('quiz');startQuiz('p',last&&last.weak)}else if(k==='clear'){sv(AK,[]);renderProgress();renderDyn()}});
var GO=['ask','quiz','material','progress'];
document.querySelectorAll('.qa').forEach(function(b,i){b.addEventListener('click',function(){var g=GO[i];
 if(g==='progress'){window.openDash();return}
 tab(g);window.go('learn')})});
document.addEventListener('visibilitychange',renderDyn);setInterval(renderDyn,60000);
window.__A={ls:ls,AK:AK,streak:streak,tab:tab,startQuiz:startQuiz,h:h,cap:cap,dd:dd,doc:function(){return doc}};
streak();markActive();apply();
})();
