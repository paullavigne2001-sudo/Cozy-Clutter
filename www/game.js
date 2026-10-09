const $=id=>document.getElementById(id);
const st={get(k,d){try{const v=localStorage.getItem("cc_"+k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("cc_"+k,JSON.stringify(v))}catch(e){}}};
// Réglages du jeu (à ajuster)
const CFG={lives:3,freeHints:1,maxRevives:2,adEvery:2,levelPicker:true};
const DIFF={A:"Facile",B:"Moyen",C:"Difficile",D:"Expert"};
let loadErr="";
let settings=st.get("settings",{vib:true}),cur=st.get("level",0);
let LEVELS=[],idx=0,OBJ=[],found=new Set(),lives=0,maxLives=3,hintsFree=0,revives=0,finished=0,busy=false;
let W=1024,H=1536,s=1,tx=0,ty=0,minS=.3,maxS=1.5,moved=false;
const vp=$("vp"),stage=$("stage"),ov=$("ov"),bg=$("bg"),bar=$("bar");
const show=id=>document.querySelectorAll(".screen").forEach(e=>e.classList.toggle("on",e.id===id));
const modal=(id,on)=>$(id).classList.toggle("on",on);
const vib=ms=>{if(settings.vib&&navigator.vibrate)navigator.vibrate(ms);};

// Niveaux
async function loadLevels(){
  try{const r=await fetch("levels/levels.json");if(!r.ok)throw new Error("levels.json : erreur "+r.status);LEVELS=(await r.json()).levels;if(!Array.isArray(LEVELS))throw new Error("levels.json : liste « levels » absente");}catch(e){LEVELS=[];loadErr=String(e&&e.message||e);}
  updateHome();
}
function updateHome(){
  const done=LEVELS.length>0&&cur>=LEVELS.length;
  $("curLevel").textContent=!LEVELS.length?"Aucun niveau trouvé. "+loadErr:done?"Tous les niveaux sont terminés. Nouveaux niveaux bientôt !":label(cur);
  $("play").hidden=done||!LEVELS.length;
}
function info(i){
  const L=LEVELS[i],re=/^([ABCD])(?![A-Za-zÀ-ÿ])[\s_\-.:]*\d*[\s_\-.:]*/i;
  let m=re.exec(L.title||""),name=L.title||"";
  if(m)name=name.slice(m[0].length)||name;else m=re.exec((L.data||"").split("/").pop());
  const k=m?m[1].toUpperCase():"";
  return{num:i+1,key:k,diff:DIFF[k]||"",name};
}
function label(i){const f=info(i);return "Niveau "+f.num+(f.diff?" · "+f.diff:"")+" · "+f.name;}
function renderLevels(){
  const l=$("lvList");l.innerHTML="";
  LEVELS.forEach((L,i)=>{
    const f=info(i),b=document.createElement("button"),a=document.createElement("span"),t=document.createElement("span");
    b.className="lv";a.textContent=(i<cur?"✓ ":i===cur?"▶ ":"")+f.num+". "+f.name;b.appendChild(a);
    if(f.key){t.className="tag t"+f.key;t.textContent=f.diff;b.appendChild(t);}
    b.onclick=()=>startLevel(i);l.appendChild(b);
  });
}
function goHome(){updateHome();show("home");}
async function startLevel(i){
  idx=i;const L=LEVELS[i];
  try{OBJ=(await (await fetch(L.data)).json()).objects.map((p,k)=>({n:p.name||"Objet "+(k+1),x:+p.x,y:+p.y,r:+p.r}));}
  catch(e){alert("Niveau introuvable : "+L.data);return;}
  show("game");
  await new Promise(res=>{
    const url=new URL(L.image,location.href).href;
    if(bg.src===url&&bg.complete&&bg.naturalWidth)return res();
    bg.onload=res;bg.onerror=res;bg.src=L.image;});
  W=bg.naturalWidth;H=bg.naturalHeight;
  stage.style.width=W+"px";stage.style.height=H+"px";
  ov.setAttribute("viewBox",`0 0 ${W} ${H}`);ov.setAttribute("width",W);ov.setAttribute("height",H);
  found=new Set();maxLives=L.lives||CFG.lives;lives=maxLives;hintsFree=CFG.freeHints;revives=0;ov.innerHTML="";
  buildTiles();limits();s=minS;tx=ty=0;clamp();apply();hud();
  ["over","win"].forEach(m=>modal(m,false));
}
function hud(){
  $("hearts").textContent="❤️".repeat(lives)+"🖤".repeat(maxLives-lives);
  $("count").textContent=found.size+" / "+OBJ.length;
  $("lvInfo").textContent=label(idx);
  $("hint").textContent=hintsFree>0?"💡 Indice (gratuit)":"💡 Indice (pub)";
}
function buildTiles(){
  bar.innerHTML="";
  OBJ.forEach((o,i)=>{const d=document.createElement("div");d.className="tile";d.id="t"+i;
    const c=document.createElement("canvas");c.width=c.height=64;const k=o.r*1.15;
    c.getContext("2d").drawImage(bg,o.x-k,o.y-k,2*k,2*k,0,0,64,64);d.appendChild(c);bar.appendChild(d);});
}
// Vue : déplacement et zoom
function limits(){const r=vp.getBoundingClientRect();minS=Math.max(r.width/W,r.height/H)||1;maxS=minS*4;}
function clamp(){const r=vp.getBoundingClientRect();s=Math.min(maxS,Math.max(minS,s));tx=Math.min(0,Math.max(r.width-W*s,tx));ty=Math.min(0,Math.max(r.height-H*s,ty));}
function apply(){stage.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;}
function zoomAt(cx,cy,ns){ns=Math.min(maxS,Math.max(minS,ns));tx=cx-(cx-tx)*ns/s;ty=cy-(cy-ty)*ns/s;s=ns;clamp();apply();}
function centerOn(x,y){const r=vp.getBoundingClientRect();s=Math.max(s,minS*2);tx=r.width/2-x*s;ty=r.height/2-y*s;clamp();stage.classList.add("anim");apply();setTimeout(()=>stage.classList.remove("anim"),450);}
// Jeu
function tap(cx,cy){
  const r=vp.getBoundingClientRect(),x=(cx-r.left-tx)/s,y=(cy-r.top-ty)/s;
  let best=-1,bd=1e9;
  OBJ.forEach((o,i)=>{if(found.has(i))return;const d=Math.hypot(o.x-x,o.y-y);if(d<=o.r*1.15&&d<bd){bd=d;best=i;}});
  if(best<0){
    vp.classList.remove("miss");void vp.offsetWidth;vp.classList.add("miss");vib(80);
    lives=Math.max(0,lives-1);hud();
    if(lives===0){$("revive").hidden=revives>=CFG.maxRevives;modal("over",true);}
    return;
  }
  const o=OBJ[best];found.add(best);$("t"+best).classList.add("done");vib(30);
  ov.insertAdjacentHTML("beforeend",`<g><circle cx="${o.x}" cy="${o.y}" r="${o.r+8}" fill="rgba(63,157,107,.25)" stroke="#3f9d6b" stroke-width="8"/><path d="M${o.x-o.r*.4} ${o.y} l${o.r*.3} ${o.r*.3} l${o.r*.6} ${-o.r*.7}" fill="none" stroke="#3f9d6b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></g>`);
  hud();
  if(found.size===OBJ.length){
    cur=Math.max(cur,idx+1);st.set("level",cur);finished++;
    $("next").hidden=idx>=LEVELS.length-1;modal("win",true);
  }
}
async function afterLevel(go){
  modal("win",false);
  if(finished%CFG.adEvery===0)await Ads.interstitial();
  go();
}
$("hint").onclick=async()=>{
  if(busy)return;const i=OBJ.findIndex((_,k)=>!found.has(k));if(i<0)return;
  if(hintsFree>0)hintsFree--;
  else{busy=true;const ok=await Ads.rewarded();busy=false;if(!ok)return;}
  hud();const o=OBJ[i];centerOn(o.x,o.y);
  ov.insertAdjacentHTML("beforeend",`<circle class="pulse" id="pl" cx="${o.x}" cy="${o.y}" r="${o.r+25}"/>`);
  setTimeout(()=>{const p=$("pl");if(p)p.remove();},2200);
};
$("revive").onclick=async()=>{
  if(busy)return;busy=true;const ok=await Ads.rewarded();busy=false;
  if(ok){revives++;lives=1;hud();modal("over",false);}
};
$("retry").onclick=()=>startLevel(idx);
$("overMenu").onclick=()=>{modal("over",false);goHome();};
$("next").onclick=()=>afterLevel(()=>startLevel(idx+1));
$("winMenu").onclick=()=>afterLevel(goHome);
// Navigation et paramètres
$("play").onclick=()=>startLevel(Math.min(cur,LEVELS.length-1));
$("gBack").onclick=goHome;
$("pick").hidden=!CFG.levelPicker;
$("pick").onclick=()=>{renderLevels();show("levels");};
$("lvBack").onclick=goHome;
$("openSettings").onclick=()=>{$("optVib").checked=settings.vib;modal("settings",true);};
$("closeSettings").onclick=()=>modal("settings",false);
$("optVib").onchange=e=>{settings.vib=e.target.checked;st.set("settings",settings);};
$("privacy").onclick=()=>Ads.privacy();
$("reset").onclick=()=>{if(confirm("Effacer la progression ?")){cur=0;st.set("level",0);updateHome();}};
// Gestes
const ptr=new Map();let startD=0,startS=1;
vp.addEventListener("pointerdown",e=>{vp.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
  if(ptr.size===1)moved=false;
  if(ptr.size===2){const[a,b]=[...ptr.values()];startD=Math.hypot(a.x-b.x,a.y-b.y);startS=s;moved=true;}});
vp.addEventListener("pointermove",e=>{const p=ptr.get(e.pointerId);if(!p)return;
  if(ptr.size===1){if(Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>8)moved=true;if(moved){tx+=e.clientX-p.x;ty+=e.clientY-p.y;clamp();apply();}p.x=e.clientX;p.y=e.clientY;}
  else if(ptr.size===2){p.x=e.clientX;p.y=e.clientY;const[a,b]=[...ptr.values()],r=vp.getBoundingClientRect();
    zoomAt((a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,startS*Math.hypot(a.x-b.x,a.y-b.y)/startD);}});
function up(e,c){const ok=!moved&&ptr.size===1&&!c;ptr.delete(e.pointerId);if(ok)tap(e.clientX,e.clientY);}
vp.addEventListener("pointerup",e=>up(e,false));
vp.addEventListener("pointercancel",e=>up(e,true));
vp.addEventListener("wheel",e=>{e.preventDefault();const r=vp.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,s*(e.deltaY<0?1.15:1/1.15));},{passive:false});
addEventListener("resize",()=>{if(OBJ.length){limits();clamp();apply();}});
Ads.init();loadLevels();
