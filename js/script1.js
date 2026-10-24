(function(){
  var c=document.getElementById('stars'),x=c.getContext('2d'),S=[];
  var raf;function size(){cancelAnimationFrame(raf);var u=c.parentNode,w=u.offsetWidth,h=u.offsetHeight,d=window.devicePixelRatio||1;c.width=w*d;c.height=h*d;x.setTransform(d,0,0,d,0,0);S=[];
    for(var i=0;i<Math.min(220,w*h/5000);i++){var t=i/260,bx=Math.random()*w,by=Math.random()*h;
      /* denser along the Milky Way band */
      if(i%2){var p=Math.random()*w;bx=p;by=170+p*-.25+(Math.random()-.5)*220*(Math.random())+60;}
      S.push({x:bx,y:by,r:Math.random()*1.3+.2,a:Math.random(),s:Math.random()*.02+.004,vx:(Math.random()-.3)*.18,vy:(Math.random()-.5)*.08,g:Math.random()<.12});}
    draw();}
  var SH=[],T=0;
  function draw(){var w=c.offsetWidth,h=c.offsetHeight;x.clearRect(0,0,w,h);T++;
    S.forEach(function(s){s.a+=s.s;s.x+=s.vx;s.y+=s.vy;if(s.x>w+4)s.x=-4;if(s.x<-4)s.x=w+4;if(s.y>h+4)s.y=-4;if(s.y<-4)s.y=h+4;var o=.35+.55*Math.abs(Math.sin(s.a));x.beginPath();x.arc(s.x,s.y,s.r,0,6.283);x.fillStyle=s.g?'rgba(245,205,120,'+o+')':'rgba(220,225,255,'+o+')';x.fill();});
    if(Math.random()<.012&&SH.length<3)SH.push({x:Math.random()*w*.9,y:Math.random()*h*.4,l:0,v:7+Math.random()*5});
    SH=SH.filter(function(m){m.x+=m.v;m.y+=m.v*.45;m.l++;var g=x.createLinearGradient(m.x,m.y,m.x-90,m.y-40);g.addColorStop(0,'rgba(255,240,200,'+(1-m.l/60)+')');g.addColorStop(1,'rgba(255,240,200,0)');x.strokeStyle=g;x.lineWidth=1.6;x.beginPath();x.moveTo(m.x,m.y);x.lineTo(m.x-90,m.y-40);x.stroke();return m.l<60});
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)raf=requestAnimationFrame(draw);}
  size();addEventListener('resize',size);

  var toast=document.getElementById('toast'),orig=toast.innerHTML,tt=null;
  window.showToast=function(){toast.textContent='✦ '+tr(window.__toast)+' '+tr('(preview)');toast.style.color='#f5cd78';};
  document.querySelectorAll('.qa').forEach(function(b){b.addEventListener('click',function(){
    window.__toast=b.getAttribute('data-msg');showToast();clearTimeout(tt);
    tt=setTimeout(function(){window.__toast=null;toast.innerHTML=orig;toast.style.color='';apply();},2200);});});
})();
