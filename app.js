'use strict';
const G=9.81, checkpoints=[0,30,60,90], heights=[70,30,50,20];
const $=id=>document.getElementById(id);
const scene=$('scene'),ctx=scene.getContext('2d'),chart=$('chart'),cx=chart.getContext('2d');
const photos={1:new Image(),2:new Image()};
photos[1].src='cartulina-toma-1.jpg';photos[2].src='cartulina-toma-2.jpg';
let photoNumber=2,photo=photos[2];
let view='photo',running=false,clock=0,lastFrame=null,table=[],arrivals=[],force=0,E0=0,mass=.05,duration=0,blocked=false;
const fmt=(n,p=2)=>Number.isFinite(n)?n.toFixed(p):'—';

// Cubic Hermite profile in metres. Its only nonzero checkpoint slope is at release.
function profile(x){
 const xs=[0,30,60,90,105],ys=[70,30,50,20,20],slopes=[-.1,0,0,0,0];
 let k=0;while(k<3&&x>xs[k+1])k++;
 const L=xs[k+1]-xs[k],u=Math.max(0,Math.min(1,(x-xs[k])/L));
 const h=(2*u**3-3*u*u+1)*ys[k]+(u**3-2*u*u+u)*L*slopes[k]+(-2*u**3+3*u*u)*ys[k+1]+(u**3-u*u)*L*slopes[k+1];
 const dh=((6*u*u-6*u)*ys[k]+(3*u*u-4*u+1)*L*slopes[k]+(-6*u*u+6*u)*ys[k+1]+(3*u*u-2*u)*L*slopes[k+1])/L;
 return {h,dh};
}
function makeGeometry(){
 const list=[{x:0,h:70,s:0}];
 for(let i=1;i<=2100;i++){
  const x=i*.05,h=profile(x).h,p=list[list.length-1];
  list.push({x,h,s:p.s+Math.hypot(x-p.x,h-p.h)});
 }
 return list;
}
const geometry=makeGeometry();
const sB=geometry[600].s;
function rebuild(){
 mass=Number($('mass').value);if(!Number.isFinite(mass)||mass<.01)mass=.05;
 mass=Math.min(1000,mass);$('mass').value=mass;
 let loss=Number($('lossInput').value);if(!Number.isFinite(loss)||loss<0)loss=.15;
 loss=Math.min(100000,loss);$('lossInput').value=loss.toFixed(3);
 force=$('friction').checked?loss/sB:0;E0=mass*G*70;
 $('lossControl').hidden=!$('friction').checked;
 table=[{...geometry[0],v:0,t:0,q:0}];blocked=false;
 // At rest, the carriage cannot start if the prescribed drag exceeds gravity along the slope.
 if(force>=mass*G*.1/Math.hypot(1,.1)&&force>0){blocked=true;}
 else for(let i=1;i<geometry.length;i++){
  const p=table[table.length-1],z=geometry[i];let q=force*z.s,energy=E0-mass*G*z.h-q;
  if(energy<0){
   let lo=0,hi=1;
   for(let j=0;j<40;j++){const u=(lo+hi)/2,s=p.s+(z.s-p.s)*u,x=p.x+(z.x-p.x)*u;if(E0-mass*G*profile(x).h-force*s>0)lo=u;else hi=u;}
   const u=(lo+hi)/2,x=p.x+(z.x-p.x)*u,s=p.s+(z.s-p.s)*u;
   table.push({x,s,h:profile(x).h,q:force*s,v:0,t:p.t+2*(s-p.s)/Math.max(p.v,1e-12)});blocked=true;break;
  }
  const v=Math.sqrt(2*energy/mass),dt=2*(z.s-p.s)/(p.v+v);
  table.push({...z,q,v,t:p.t+dt});
 }
 duration=table[table.length-1].t;
 arrivals=checkpoints.map(x=>{const z=table.find(p=>p.x>=x-1e-8);return z&&Math.abs(z.x-x)<1e-6?z:null;});
 running=false;clock=0;lastFrame=null;updateRows();update();draw();
}
function stateAt(t){
 if(table.length===1)return table[0];
 let lo=0,hi=table.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(table[mid].t<=t)lo=mid;else hi=mid;}
 if(t>=duration)return table[table.length-1];
 const a=table[lo],b=table[hi],dt=b.t-a.t,dtNow=Math.max(0,t-a.t),acc=(b.v-a.v)/dt;
 const ds=Math.min(b.s-a.s,Math.max(0,a.v*dtNow+.5*acc*dtNow*dtNow));
 const f=(b.s-a.s)>0?ds/(b.s-a.s):0,x=a.x+(b.x-a.x)*f,s=a.s+ds,h=profile(x).h,q=force*s;
 return {x,s,h,q,t,v:Math.sqrt(Math.max(0,2*(E0-mass*G*h-q)/mass))};
}
function energies(z){return{ep:mass*G*z.h,ec:Math.max(0,E0-mass*G*z.h-z.q),q:z.q};}
function update(){
 const z=stateAt(clock),e=energies(z);
 $('velocity').textContent=fmt(z.v);$('height').textContent=fmt(z.h)+' m';$('position').textContent=fmt(z.x)+' m';
 $('ep').textContent=fmt(e.ep,3)+' J';$('ec').textContent=fmt(e.ec,3)+' J';$('q').textContent=fmt(e.q,3)+' J';$('total').textContent=fmt(e.ep+e.ec+e.q,3)+' J';
 $('epMeter').value=e.ep/E0*100;$('ecMeter').value=e.ec/E0*100;$('qMeter').value=e.q/E0*100;
 $('time').textContent=fmt(clock)+' s';$('timeline').value=duration?clock/duration*1000:0;
 let nearest=checkpoints.findIndex(x=>Math.abs(z.x-x)<.1);
 $('pointBadge').textContent=nearest>=0?'Punto '+(nearest+1):z.x>90?'Tramo final':z.x<30?'Tramo 1 → 2':z.x<60?'Tramo 2 → 3':'Tramo 3 → 4';
 $('play').textContent=running?'Ⅱ Pausar':clock>=duration&&duration>0?'↺ Repetir':'▶ Reproducir';
 $('status').textContent=blocked&&clock>=duration?'Energía insuficiente':clock>=duration&&duration>0?'Fin del tramo · sin frenos':running?'En movimiento':clock>0?'En pausa':'Listo para iniciar';
 Array.from($('rows').children).forEach((tr,i)=>tr.classList.toggle('active',i===nearest));
}
function updateRows(){
 $('rows').innerHTML=arrivals.map((z,i)=>{const e=z?energies(z):null;return `<tr tabindex="0" role="button" aria-label="Ver punto ${i+1}" data-i="${i}"><td>0${i+1} · ${['Salida','Valle','Cima','Llegada'][i]}</td><td>${heights[i]}</td><td>${z?fmt(z.v):'No llega'}</td><td>${fmt(mass*G*heights[i],3)}</td><td>${e?fmt(e.ec,3):'—'}</td><td>${e?fmt(e.q,3):'—'}</td></tr>`;}).join('');
 $('rows').querySelectorAll('tr').forEach(tr=>{tr.onclick=()=>jump(Number(tr.dataset.i));tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jump(Number(tr.dataset.i));}};});
}
function jump(i){if(!arrivals[i]){toast('Con estas condiciones, el carrito no alcanza el punto '+(i+1)+'.');return;}clock=arrivals[i].t;running=false;update();draw();}
function bezier(p,u){const a=1-u;return{x:a**3*p[0][0]+3*a*a*u*p[1][0]+3*a*u*u*p[2][0]+u**3*p[3][0],y:a**3*p[0][1]+3*a*a*u*p[1][1]+3*a*u*u*p[2][1]+u**3*p[3][1]};}
// Separate registration for each photograph; the original files are not altered.
const photoTracks={
 1:{stations:[307,596,884,1198,1528],samples:[[307,480],[345,491],[385,526],[423,584],[450,650],[475,736],[493,780],[530,847],[566,893],[596,910],[626,910],[660,898],[700,871],[740,832],[780,789],[824,747],[857,721],[884,703],[914,711],[947,728],[980,753],[1009,789],[1037,843],[1068,914],[1100,972],[1134,1013],[1164,1040],[1198,1063],[1240,1075],[1300,1082],[1380,1086],[1460,1092],[1528,1094]]},
 2:{stations:[303,593,879,1189,1528],samples:[[303,476],[340,484],[376,510],[405,547],[433,602],[457,664],[480,730],[494,772],[524,829],[555,870],[580,888],[593,893],[624,892],[653,882],[685,862],[720,829],[756,791],[793,754],[830,726],[861,704],[879,693],[909,700],[938,715],[968,734],[995,762],[1020,805],[1044,852],[1070,905],[1093,950],[1120,982],[1150,1010],[1189,1037],[1230,1048],[1280,1054],[1370,1057],[1450,1061],[1528,1063]]}
};
function photoPosition(x){
 const track=photoTracks[photoNumber],i=x<30?0:x<60?1:x<90?2:3;
 const u=Math.max(0,Math.min(1,i===3?(x-90)/15:(x-i*30)/30));
 const px=track.stations[i]+u*(track.stations[i+1]-track.stations[i]);
 const ps=track.samples;let j=0;while(j<ps.length-2&&px>ps[j+1][0])j++;
 const a=ps[j],b=ps[j+1],prev=ps[Math.max(0,j-1)],next=ps[Math.min(ps.length-1,j+2)];
 const L=b[0]-a[0],v=Math.max(0,Math.min(1,(px-a[0])/L));
 const d0=(b[1]-prev[1])/(b[0]-prev[0]),d1=(next[1]-a[1])/(next[0]-a[0]);
 const py=(2*v**3-3*v*v+1)*a[1]+(v**3-2*v*v+v)*L*d0+(-2*v**3+3*v*v)*b[1]+(v**3-v*v)*L*d1;
 return{x:px,y:py};
}
const plot={left:180,right:1440,top:115,bottom:1000};
function scalePosition(x){return{x:plot.left+x/105*(plot.right-plot.left),y:plot.bottom-profile(x).h*10.5};}
function canvasPosition(x){return view==='photo'?photoPosition(x):scalePosition(x);}
function rounded(g,x,y,w,h,r,fill){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();}
function drawScale(){
 ctx.fillStyle='#111b29';ctx.fillRect(0,0,1536,1152);ctx.font='21px Arial';ctx.textAlign='right';
 for(let h=0;h<=80;h+=10){const y=plot.bottom-h*10.5;ctx.strokeStyle='#29384b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(plot.left,y);ctx.lineTo(plot.right,y);ctx.stroke();ctx.fillStyle='#b3c2d5';ctx.fillText(h+'',plot.left-23,y+7);}
 for(let x=0;x<=100;x+=10){const p=scalePosition(x);ctx.strokeStyle='#243347';ctx.beginPath();ctx.moveTo(p.x,plot.top);ctx.lineTo(p.x,plot.bottom);ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#b3c2d5';ctx.fillText(x+'',p.x,plot.bottom+39);}
 ctx.strokeStyle='#91a6c2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(plot.left,plot.top);ctx.lineTo(plot.left,plot.bottom);ctx.lineTo(plot.right,plot.bottom);ctx.stroke();
 ctx.font='23px Arial';ctx.fillStyle='#c5d4e8';ctx.textAlign='left';ctx.fillText('Altura (m)',plot.left,70);ctx.textAlign='right';ctx.fillText('Posición horizontal (m)',plot.right,1100);
 ctx.beginPath();for(let i=0;i<geometry.length;i++){const p=scalePosition(geometry[i].x);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle='#82aaff';ctx.lineWidth=7;ctx.lineCap='round';ctx.stroke();
 for(let i=0;i<4;i++){const p=scalePosition(checkpoints[i]);ctx.fillStyle='#82aaff';ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();rounded(ctx,p.x-23,p.y-70,46,39,9,'#263d60');ctx.textAlign='center';ctx.font='bold 24px Arial';ctx.fillStyle='#c3d5ff';ctx.fillText(i+1,p.x,p.y-43);}
}
function drawCar(z){
 const p=canvasPosition(z.x),a=canvasPosition(Math.max(0,z.x-.03)),b=canvasPosition(Math.min(105,z.x+.03));
 const angle=Math.atan2(b.y-a.y,b.x-a.x),size=view==='photo'?1:1.2;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.scale(size,size);
 ctx.shadowColor='#0007';ctx.shadowBlur=12;ctx.shadowOffsetY=5;
 rounded(ctx,-29,-34,58,25,7,'#f2a339');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 rounded(ctx,-24,-48,17,19,4,'#193650');rounded(ctx,4,-48,17,19,4,'#193650');
 ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-21,-26);ctx.lineTo(20,-26);ctx.stroke();
 for(const x of [-18,18]){ctx.fillStyle='#102738';ctx.beginPath();ctx.arc(x,-7,9,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x,-7);ctx.rotate(z.s/1.1);ctx.strokeStyle='#c5d5e7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();ctx.restore();}
 ctx.restore();
}
function draw(){
 const desiredHeight=view==='photo'?(photo.naturalHeight|| (photoNumber===1?1414:1375)):1152;
 if(scene.height!==desiredHeight)scene.height=desiredHeight;
 ctx.clearRect(0,0,scene.width,scene.height);
 if(view==='photo'&&photo.complete&&photo.naturalWidth)ctx.drawImage(photo,0,0,1536,desiredHeight);else drawScale();
 const z=stateAt(clock);drawCar(z);drawChart(z);
}
function drawChart(z){
 const w=chart.width,h=chart.height,l=70,r=730,t=20,b=290;
 cx.clearRect(0,0,w,h);cx.font='18px Arial';cx.lineWidth=1;cx.textAlign='right';
 for(let j=0;j<=4;j++){const y=b-(b-t)*j/4;cx.strokeStyle='#2a394d';cx.beginPath();cx.moveTo(l,y);cx.lineTo(r,y);cx.stroke();cx.fillStyle='#b1bfd2';cx.fillText(fmt(E0*j/4,E0<10?2:1),l-10,y+6);}
 cx.textAlign='center';for(let x=0;x<=90;x+=30){const px=l+x/105*(r-l);cx.fillText(x+'',px,b+30);}cx.fillText('Posición (m)',(l+r)/2,h-7);cx.textAlign='left';cx.fillText('J',14,t+5);
 const px=x=>l+x/105*(r-l),py=v=>b-v/E0*(b-t);
 const colors=['#82aaff','#ffb34c','#de91d1'];
 for(let k=0;k<3;k++){cx.beginPath();for(let i=0;i<table.length;i+=4){const p=table[i],e=energies(p),v=[e.ep,e.ec,e.q][k];if(i===0)cx.moveTo(px(p.x),py(v));else cx.lineTo(px(p.x),py(v));}const p=table[table.length-1],e=energies(p);cx.lineTo(px(p.x),py([e.ep,e.ec,e.q][k]));cx.strokeStyle=colors[k];cx.lineWidth=3;cx.stroke();}
 const x=px(z.x);cx.save();cx.setLineDash([5,5]);cx.strokeStyle='#9daab9';cx.lineWidth=2;cx.beginPath();cx.moveTo(x,t);cx.lineTo(x,b);cx.stroke();cx.restore();
}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),3500);}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('play').onclick=()=>{if(blocked&&duration===0){toast('El rozamiento impide iniciar: reduce la energía disipada o aumenta la masa.');return;}if(clock>=duration)clock=0;running=!running;lastFrame=null;update();draw();};
$('reset').onclick=()=>{running=false;clock=0;update();draw();};
$('timeline').oninput=e=>{running=false;clock=duration*Number(e.target.value)/1000;update();draw();};
for(const id of ['mass','friction','lossInput'])$(id).onchange=rebuild;
document.querySelectorAll('[data-point]').forEach(b=>b.onclick=()=>jump(Number(b.dataset.point)));
function changeView(v){view=v;$('photoTab').classList.toggle('selected',v==='photo');$('scaleTab').classList.toggle('selected',v==='scale');$('photoTab').setAttribute('aria-pressed',v==='photo');$('scaleTab').setAttribute('aria-pressed',v==='scale');$('photoChoice').disabled=v!=='photo';$('sceneCaption').textContent=v==='photo'?'Toma '+photoNumber+' · fotografía original, sello y firma conservados':'Perfil idealizado a escala · alturas en metros';draw();}
$('photoChoice').onchange=e=>{photoNumber=Number(e.target.value);photo=photos[photoNumber];changeView('photo');};
$('photoTab').onclick=()=>changeView('photo');$('scaleTab').onclick=()=>changeView('scale');
$('snapshot').onclick=()=>{try{const c=document.createElement('canvas'),H=scene.height;c.width=1536;c.height=H+128;const g=c.getContext('2d');g.drawImage(scene,0,0);g.fillStyle='#fff';g.fillRect(0,H,1536,128);const z=stateAt(clock),e=energies(z);g.fillStyle='#17324d';g.font='bold 24px Arial';g.fillText('CARTULINA / LAB · '+($('friction').checked?'Con fricción':'Sin fricción'),36,H+38);g.font='22px Arial';g.fillText(`t = ${fmt(clock)} s  |  h = ${fmt(z.h)} m  |  v = ${fmt(z.v)} m/s  |  m = ${mass} kg`,36,H+74);g.fillText(`Ep = ${fmt(e.ep,3)} J  |  Ec = ${fmt(e.ec,3)} J  |  Q = ${fmt(e.q,3)} J`,36,H+108);c.toBlob(b=>{if(b)download(b,'Cartulina_captura_'+fmt(clock)+'s.png');},'image/png');}catch(e){toast('No se pudo guardar la captura. Intenta de nuevo cuando cargue la fotografía.');}};
$('download').onclick=()=>{let lines=['Punto,Posicion_x_m,Altura_m,Rapidez_m_s,Energia_potencial_J,Energia_cinetica_J,Energia_disipada_J,Energia_mecanica_J,Masa_kg,Fuerza_disipativa_N'];arrivals.forEach((z,i)=>{if(z){const e=energies(z);lines.push([i+1,z.x,z.h,z.v,e.ep,e.ec,e.q,e.ep+e.ec,mass,force].join(','));}else lines.push([i+1,checkpoints[i],heights[i],'No alcanzado','','','','',mass,force].join(','));});lines.push('','Tiempo_s,Posicion_x_m,Altura_m,Rapidez_m_s,Ep_J,Ec_J,Q_J');for(let i=0;i<table.length;i+=10){const z=table[i],e=energies(z);lines.push([z.t,z.x,z.h,z.v,e.ep,e.ec,e.q].join(','));}const z=table[table.length-1],e=energies(z);lines.push([z.t,z.x,z.h,z.v,e.ep,e.ec,e.q].join(','));download(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),'Cartulina_resultados_'+($('friction').checked?'con_friccion':'ideal')+'.csv');};
for(const p of Object.values(photos)){p.onload=draw;p.onerror=()=>{if(p===photo){view='scale';changeView('scale');toast('No se pudo cargar la foto; se muestra el perfil a escala.');}};}
function animate(ts){if(running){if(lastFrame!==null){clock=Math.min(duration,clock+Math.min(.1,(ts-lastFrame)/1000)*Number($('speed').value));if(clock>=duration)running=false;}lastFrame=ts;update();draw();}else lastFrame=null;requestAnimationFrame(animate);}
rebuild();requestAnimationFrame(animate);
