(function(){
var A=window.__A,$=function(i){return document.getElementById(i)},ov=$('dash');
function pc(x){return Math.round(x.s/x.t*100)}
function col(p){return p>=70?'#a9e8c0':p>=50?'#f5cd78':'#ff9a9a'}
function trend(r){var W=560,H=200,l=34,b=24,t=12,rt=12,n=r.length,
 X=function(i){return n<2?l+(W-l-rt)/2:l+i*(W-l-rt)/(n-1)},Y=function(v){return t+(100-v)*(H-t-b)/100},g='';
 [0,25,50,75,100].forEach(function(v){g+='<line x1="'+l+'" x2="'+(W-rt)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="rgba(255,255,255,.08)"/><text x="'+(l-6)+'" y="'+(Y(v)+4)+'" fill="#a3abc5" font-size="10" text-anchor="end">'+v+'</text>'});
 g+='<line x1="'+l+'" x2="'+(W-rt)+'" y1="'+Y(70)+'" y2="'+Y(70)+'" stroke="#f5cd78" stroke-dasharray="5 4"/><text x="'+(W-rt)+'" y="'+(Y(70)-4)+'" fill="#f5cd78" font-size="10" text-anchor="end">Goal 70%</text>';
 var d=r.map(function(x,i){return(i?'L':'M')+X(i)+' '+Y(pc(x))}).join(' ');
 g+='<path d="'+d+'" fill="none" stroke="#ad91ff" stroke-width="2.5"/>';
 r.forEach(function(x,i){g+='<circle cx="'+X(i)+'" cy="'+Y(pc(x))+'" r="4" fill="'+col(pc(x))+'"/><text x="'+X(i)+'" y="'+(H-8)+'" fill="#a3abc5" font-size="10" text-anchor="middle">#'+(i+1)+'</text>'});
 return'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Score trend chart" style="width:100%;height:auto">'+g+'</svg>'}
function render(){var a=A.ls(A.AK,[]),b=$('dbody'),st=A.streak().n;
 if(!a.length){b.innerHTML='<div class="dc"><h3>No quiz data yet</h3><p class="s">Take a diagnostic quiz and this page will show your score trend, weak areas and what to improve.</p><button class="b2" id="dgo">Take a quiz</button></div>';$('dgo').onclick=function(){A.tab('quiz');window.go('learn')};return}
 var sc=a.map(pc),avg=Math.round(sc.reduce(function(x,y){return x+y},0)/sc.length),chg=sc[sc.length-1]-sc[0],T={};
 a.forEach(function(x,i){Object.keys(x.tp).forEach(function(k){var o=T[k]=T[k]||{c:0,t:0,h:[]};o.c+=x.tp[k][0];o.t+=x.tp[k][1];o.h.push(Math.round(x.tp[k][0]/x.tp[k][1]*100))})});
 var tp=Object.keys(T).map(function(k){return{k:k,p:Math.round(T[k].c/T[k].t*100),h:T[k].h}}).sort(function(x,y){return x.p-y.p}),weak=tp.filter(function(x){return x.p<70});
 var days=[];for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);days.push({l:d.toLocaleDateString(undefined,{weekday:'short'}),y:d.toDateString(),n:0})}
 a.forEach(function(x){var y=new Date(x.d).toDateString();days.forEach(function(q){if(q.y===y)q.n+=x.t})});
 var mx=Math.max.apply(null,days.map(function(q){return q.n}).concat([1])),act=days.filter(function(q){return q.n}).length,im=[];
 weak.slice(0,4).forEach(function(w){im.push('<em style="color:#ff9a9a">Weak area</em><b>'+A.h(A.cap(w.k))+'</b> is at '+w.p+'%. You need about +'+(70-w.p)+' points to reach the 70% goal. Re-read it, then retake a practice quiz on it.')});
 if(a.length>1)im.push(chg>=0?'<em style="color:#a9e8c0">Improving</em>Your score is up '+chg+'% since your first attempt. Keep the same routine.':'<em style="color:#ff9a9a">Dropping</em>Your score is down '+Math.abs(chg)+'% since your first attempt. Slow down and revisit the passages you missed.');
 else im.push('<em>Need more data</em>Take at least 3 quizzes so trends become reliable.');
 tp.forEach(function(x){if(x.h.length>1&&x.h[x.h.length-1]<x.h[0])im.push('<em style="color:#f5cd78">Forgetting</em>'+A.h(A.cap(x.k))+' fell from '+x.h[0]+'% to '+x.h[x.h.length-1]+'%. Review it again soon.')});
 if(act<4)im.push('<em style="color:#f5cd78">Consistency</em>You studied on '+act+' of the last 7 days. Aim for at least 4 days a week.');
 if(!weak.length)im.push('<em style="color:#a9e8c0">Strong</em>All topics are at or above 70%. Try longer quizzes or new material.');
 b.innerHTML='<div class="kp"><div><strong>'+sc[sc.length-1]+'%</strong><span>Latest score</span></div><div><strong>'+avg+'%</strong><span>Average score</span></div><div><strong>'+(chg>0?'+':'')+chg+'%</strong><span>Change since first</span></div><div><strong>'+st+'</strong><span>Day streak</span></div><div><strong>'+a.length+'</strong><span>Quizzes taken</span></div></div>'
 +'<div class="dc"><h3>Score trend</h3><p class="s">Last '+Math.min(10,a.length)+' attempts. The dashed line is the 70% goal.</p>'+trend(a.slice(-10))+'</div>'
 +'<div class="dc"><h3>Accuracy by topic</h3><p class="s">Red under 50%, gold under 70%, green 70% or more. Weakest first.</p>'+tp.map(function(x){return'<div class="tb"><span>'+A.h(A.cap(x.k))+'</span><i><b style="width:'+x.p+'%;background:'+col(x.p)+'"></b></i><span>'+x.p+'%</span></div>'}).join('')+'</div>'
 +'<div class="dc"><h3>Questions answered, last 7 days</h3><div class="wk">'+days.map(function(q){return'<div>'+(q.n||'')+'<b style="height:'+Math.round(q.n/mx*80)+'%"></b>'+q.l+'</div>'}).join('')+'</div></div>'
 +'<div class="dc"><h3>What to improve</h3><ul class="im">'+im.map(function(x){return'<li>'+x+'</li>'}).join('')+'</ul>'+(weak.length?'<button class="b2" id="dpr">Practise weak topics</button>':'')+'</div>';
 var pr=$('dpr');if(pr)pr.onclick=function(){A.tab('quiz');if(A.doc())A.startQuiz('p',weak.map(function(w){return w.k}));window.go('learn')}}
var cur0=null;
function show(v){if(!document.querySelector('[data-view="'+v+'"]'))v='home';cur0=v;if(v==='progress')render();
 document.querySelectorAll('.view').forEach(function(e){e.hidden=e.dataset.view!==v});
 document.querySelectorAll('.nav-links a').forEach(function(a){var on=a.dataset.go===v;a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 scrollTo(0,0);if(window.apply)apply();dispatchEvent(new Event('resize'))}
window.go=function(v){try{location.hash=v}catch(e){}if(cur0!==v)show(v)};
addEventListener('hashchange',function(){var v=location.hash.slice(1)||'home';if(v!==cur0)show(v)});
document.addEventListener('click',function(e){var a=e.target.closest('[data-go]');if(!a)return;e.preventDefault();window.go(a.dataset.go)});
window.openDash=function(){window.go('progress')};
$('dclose').onclick=function(){window.go('home')};
document.addEventListener('keydown',function(e){if(e.key==='Escape')$('cb').hidden=true});
var vis=document.querySelector('.visual'),par=vis&&vis.querySelector('.par');
if(par)addEventListener('pointermove',function(e){var r=vis.getBoundingClientRect(),c=function(v){return Math.max(-1,Math.min(1,v))};par.style.setProperty('--mx',c(((e.clientX-r.left)/r.width-.5)*2));par.style.setProperty('--my',c(((e.clientY-r.top)/r.height-.5)*2))});
show(location.hash.slice(1)||'home');
(function(){var mode='login',UK='agastya-users',CK='agastya-user';
function ld(){try{return JSON.parse(localStorage.getItem(UK)||'{}')}catch(e){return{}}}
function hs(t){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')})}
function msg(t,ok){var m=$('amsg');m.textContent=t;m.className='note '+(ok?'okm':'erm')}
function setMode(m){mode=m;document.querySelectorAll('.ao').forEach(function(b){b.classList.toggle('on',b.dataset.auth===m)});
 document.querySelectorAll('#af [data-m]').forEach(function(e){e.hidden=e.dataset.m.split(' ').indexOf(m)<0});
 $('asub').textContent={login:'Log in',signup:'Sign up',create:'Create account'}[m];$('apw').autocomplete=m==='login'?'current-password':'new-password';$('amsg').textContent=''}
document.querySelectorAll('.ao').forEach(function(b){b.addEventListener('click',function(){setMode(b.dataset.auth)})});
function done(n){try{localStorage.setItem(CK,n)}catch(e){}msg('Welcome, '+n+'!',1);setTimeout(function(){$('af').reset();window.go('learn')},900)}
$('af').addEventListener('submit',function(e){e.preventDefault();
 var em=$('aem').value.trim().toLowerCase(),pw=$('apw').value,nm=$('anm').value.trim();
 if(!/^\S+@\S+\.\S+$/.test(em))return msg('Enter a valid email address.');
 if(pw.length<6)return msg('Password must be at least 6 characters.');
 if(mode==='create'&&!nm)return msg('Please enter your name.');
 if(!window.crypto||!crypto.subtle)return msg('This browser cannot create accounts securely here.');
 hs(pw).then(function(h){var u=ld();
  if(mode==='login'){if(!u[em]||u[em].h!==h)return msg('Email or password is incorrect.');return done(u[em].n)}
  if(u[em])return msg('An account with this email already exists. Try logging in.');
  var n=mode==='create'?nm:em.split('@')[0];u[em]={n:n,h:h,g:mode==='create'?$('agr').value:''};
  try{localStorage.setItem(UK,JSON.stringify(u))}catch(x){return msg('Could not save the account in this browser.')}
  done(n)})});
})();

/* ---- chatbot ---- */
var cb=$('cb'),cm=$('cm'),ci=$('ci'),hist=[],busy=false,smp;
$('cbf').onclick=function(){cb.hidden=!cb.hidden;if(!cb.hidden)ci.focus()};
$('cbx').onclick=function(){cb.hidden=true};
function add(c,t){var d=document.createElement('div');d.className='m '+c;d.textContent=t;cm.appendChild(d);cm.scrollTop=cm.scrollHeight;return d}
async function send(){var q=ci.value.trim();if(!q||busy)return;ci.value='';add('u',q);var out=add('b','Thinking…');busy=true;
 try{
  if(!smp){smp=window.claude&&claude.use?await claude.use('sample'):null}
  if(!smp){out.textContent='The assistant isn’t available in this view. Open the page while signed in to claude.ai to chat.';return}
  hist.push({role:'user',content:q});var h=hist.slice(-10);
  if(h[0].role!=='user')h.shift();
  h[0]={role:'user',content:'You are Agastya Assistant, a friendly study helper for students. Answer any question or doubt in any subject clearly, with simple steps or examples, and keep replies concise. Reply in the language the student writes in.\n\nStudent: '+h[0].content};
  var r=await smp(h,{cache:false,onText:function(e){out.textContent=e.text;cm.scrollTop=cm.scrollHeight}});
  out.textContent=r.text;hist.push({role:'assistant',content:r.text});
 }catch(e){hist.pop();out.textContent=e&&e.code==='rate_limited'?'Too many questions right now. Please wait a moment and try again.':e&&e.code==='not_granted'?'Chat needs permission to run. Please allow it when asked.':'Sorry, something went wrong. Please try again.'}
 finally{busy=false;cm.scrollTop=cm.scrollHeight}}
$('cs').onclick=send;ci.addEventListener('keydown',function(e){if(e.key==='Enter')send()});
})();
