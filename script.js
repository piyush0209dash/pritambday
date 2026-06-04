'use strict';
// ── TIME ──────────────────────────────────────────────
const getIST=()=>{const n=new Date();return new Date(n.getTime()+n.getTimezoneOffset()*60000+19800000)};
const isBday=t=>t.getMonth()===5&&t.getDate()===7; // June 7
const tWin=t=>{const h=t.getHours();return h<4?'mid':h<10?'morn':'day'};
const pad2=n=>String(n).padStart(2,'0');
const cdData=()=>{const t=getIST();let b=new Date(t.getFullYear(),5,7);if(t>=b)b=new Date(t.getFullYear()+1,5,7);const d=b-t;return{days:Math.floor(d/86400000),h:Math.floor((d%86400000)/3600000),m:Math.floor((d%3600000)/60000),s:Math.floor(d%60000/1000)}};

// ── THREE.JS ──────────────────────────────────────────
const canvas=document.getElementById('c');
let W=innerWidth,H=innerHeight;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(W,H);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.95;
window.addEventListener('resize',()=>{W=innerWidth;H=innerHeight;camera.aspect=W/H;camera.updateProjectionMatrix();renderer.setSize(W,H)});
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x060a04,14,45);
const camera=new THREE.PerspectiveCamera(72,W/H,.05,300);
camera.rotation.order='YXZ';

// ── HELPERS ───────────────────────────────────────────
const DS=THREE.DoubleSide;
const ml=(c,op=1)=>{const m=new THREE.MeshLambertMaterial({color:c,side:DS});if(op<1){m.transparent=true;m.opacity=op}return m};
const ms=(c,r=.85,m2=0,e=0,ei=0)=>{const mat=new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m2,side:DS});if(e){mat.emissive=new THREE.Color(e);mat.emissiveIntensity=ei}return mat};
const bx=(w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.castShadow=true;m.receiveShadow=true;return m};
const cy=(rt,rb,h,s,mat)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s),mat);m.castShadow=true;m.receiveShadow=true;return m};
const sp=(r,s,mat)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,s,s),mat);m.castShadow=true;return m};
const put=(m,x,y,z,ry=0)=>{m.position.set(x,y,z);if(ry)m.rotation.y=ry;scene.add(m);return m};

// ── COLLISION ─────────────────────────────────────────
const COLLS=[];
const addCol=(xmn,xmx,zmn,zmx)=>COLLS.push({xmn,xmx,zmn,zmx});
const canMove=(nx,nz)=>{const r=.3;for(const c of COLLS)if(nx+r>c.xmn&&nx-r<c.xmx&&nz+r>c.zmn&&nz-r<c.zmx)return false;return true};
function wall(x,y,z,w,h,d,mat,col=true){const m=bx(w,h,d,mat);m.position.set(x,y,z);scene.add(m);if(col)addCol(x-w/2,x+w/2,z-d/2,z+d/2);return m}

// ── FLOODLIGHTS ───────────────────────────────────────
const LIGHTS=[];
function floodlight(x,y,z,col=0xffffff,intensity=2.5,dist=20){
  const l=new THREE.PointLight(col,intensity,dist);l.position.set(x,y,z);scene.add(l);
  LIGHTS.push({l,base:intensity,t:Math.random()*10});return l;
}

// ── INTERACTABLES ─────────────────────────────────────
const IACTS=[];
let nearI=null,gameActive=false;
const WH=5,DW=3.4,DH=3.8;

// ══════════════════════════════════════════════════════
// SCOREBOARD COUNTDOWN TEXTURE
// ══════════════════════════════════════════════════════
const sbCv=document.createElement('canvas');sbCv.width=1024;sbCv.height=512;
const sbCtx=sbCv.getContext('2d');
const sbTex=new THREE.CanvasTexture(sbCv);
sbTex.minFilter=THREE.LinearFilter;sbTex.magFilter=THREE.LinearFilter;

function drawScoreboard(){
  const CW=1024,CH=512,ct=sbCtx;
  ct.clearRect(0,0,CW,CH);
  // Background — dark screen
  ct.fillStyle='#020602';ct.fillRect(0,0,CW,CH);
  // Outer LED border
  ct.strokeStyle='#e8f040';ct.lineWidth=8;ct.strokeRect(5,5,CW-10,CH-10);
  ct.strokeStyle='rgba(232,240,64,.3)';ct.lineWidth=2;ct.strokeRect(16,16,CW-32,CH-32);
  // Corner dots
  [[24,24],[CW-24,24],[24,CH-24],[CW-24,CH-24]].forEach(([ox,oy])=>{ct.fillStyle='#e8f040';ct.beginPath();ct.arc(ox,oy,5,0,Math.PI*2);ct.fill()});
  // Top: MAGGIE STADIUM
  ct.fillStyle='#e8f040';ct.font='bold 52px Bebas Neue,sans-serif';ct.textAlign='center';ct.letterSpacing='8px';
  ct.fillText('MAGGIE STADIUM',CW/2,68);ct.letterSpacing='0px';
  // Divider
  ct.strokeStyle='rgba(232,240,64,.35)';ct.lineWidth=1.5;ct.beginPath();ct.moveTo(40,82);ct.lineTo(CW-40,82);ct.stroke();
  if(!isBday(getIST())){
    const cd=cdData();
    // DAYS UNTIL text
    ct.fillStyle='rgba(168,200,100,.7)';ct.font='22px Barlow Condensed,sans-serif';ct.fillText('DAYS UNTIL KICKOFF',CW/2,114);
    // Big days
    ct.shadowColor='rgba(232,240,64,.6)';ct.shadowBlur=30;
    ct.fillStyle='#e8f040';ct.font='bold 200px Bebas Neue,sans-serif';
    ct.fillText(String(cd.days),CW/2,310);ct.shadowBlur=0;
    // Divider
    ct.strokeStyle='rgba(232,240,64,.25)';ct.lineWidth=1;ct.beginPath();ct.moveTo(80,330);ct.lineTo(CW-80,330);ct.stroke();
    // Time
    ct.fillStyle='#b8d870';ct.font='bold 88px Bebas Neue,sans-serif';
    ct.fillText(pad2(cd.h)+' : '+pad2(cd.m)+' : '+pad2(cd.s),CW/2,420);
    ct.fillStyle='rgba(168,200,100,.5)';ct.font='18px Barlow Condensed,sans-serif';
    [['HRS',280],['MIN',512],['SEC',744]].forEach(([l,x])=>ct.fillText(l,x,442));
  } else {
    ct.fillStyle='#e8f040';ct.font='bold 80px Bebas Neue,sans-serif';ct.fillText('HAPPY BIRTHDAY',CW/2,200);
    ct.font='bold 120px Bebas Neue,sans-serif';ct.fillText('MAGGIE! 🍜⚽',CW/2,320);
    ct.fillStyle='rgba(232,240,64,.6)';ct.font='28px Barlow Condensed,sans-serif';ct.fillText('PRITAM SCORES AGAIN',CW/2,390);
  }
  // Bottom ticker
  ct.fillStyle='rgba(232,240,64,.08)';ct.fillRect(0,CH-36,CW,36);
  ct.fillStyle='rgba(232,240,64,.45)';ct.font='18px Barlow Condensed,sans-serif';ct.fillText('⚽  SHILLONG  ·  MAGGIE FC  ·  EST. 1990-something  ·  ⚽',CW/2,CH-14);
  sbTex.needsUpdate=true;
}

// ══════════════════════════════════════════════════════
// ROOM 1 — THE TUNNEL (entry + main area)
// ══════════════════════════════════════════════════════
function buildTunnel(){
  const TM=ml(0x2a2a2a),TL=ml(0x1a1a1a),TF=ml(0x1e1e1e),TC=ml(0x111111);
  const GM=ms(0x1a6a1a,.9),GD=ms(0x0e4a0e,.95),GF=ml(0x0a3a0a);
  // Tunnel corridor floor/ceiling/walls
  put(bx(8,.15,30,TF),0,0,-5); // tunnel floor
  put(bx(8,.15,30,TC),0,WH,-5); // ceiling
  put(bx(8,.15,30,ml(0x181818)),0,WH-.02,-5); // ceiling inner
  wall(-4,WH/2,-5,.3,WH,30,TM); // left wall
  wall(4,WH/2,-5,.3,WH,30,TM);  // right wall
  // Tunnel end wall (z=-20) — with door to pitch
  wall(0,WH/2,-20,8,WH,.3,TL);
  // Tunnel to locker room door (z=10) - opening at x=0
  {const hw=(8-DW)/2,p1=0-DW/2-hw/2,p2=0+DW/2+hw/2;
   wall(p1,WH/2,10,hw,WH,.3,TM);wall(p2,WH/2,10,hw,WH,.3,TM);
   const hd=bx(DW,WH-DH,.3,TM);hd.position.set(0,DH+(WH-DH)/2,10);scene.add(hd);}
  // Tunnel neon strip lights
  [-3,-1,1,3,-5,-9,-13,-17].forEach(z=>{
    const strip=bx(7.8,.06,.06,ms(0xe8f040,.2,0,0xe8f040,3));put(strip,0,WH-.1,z);
    const sl=new THREE.PointLight(0xe8f040,.4,5);sl.position.set(0,WH-.2,z);scene.add(sl);
  });
  // Yellow lines on tunnel floor
  for(let z=-18;z<10;z+=2){put(bx(7.8,.02,.06,ms(0xe8f040,.1,0,0xe8f040,.2)),0,.08,z)}
  // Jersey banners on walls
  [-12,-6,0,6].forEach(z=>{
    const banner=bx(.05,2,.8,ms(0xe8f040,.2));put(banner,-3.8,3,z);
    const num=bx(.05,1.5,.6,ms(0x0a1a0a,.9));put(num,-3.82,2.8,z);
  });
  [-12,-6,0,6].forEach(z=>{
    const banner=bx(.05,2,.8,ms(0xe8f040,.2));put(banner,3.8,3,z);
    const num=bx(.05,1.5,.6,ms(0x0a1a0a,.9));put(num,3.82,2.8,z);
  });
  // Tunnel lights
  floodlight(-3.5,3.5,-5,0xfff5e0,1.5,10);floodlight(3.5,3.5,-5,0xfff5e0,1.5,10);
  floodlight(-3.5,3.5,-15,0xfff5e0,1.5,10);floodlight(3.5,3.5,-15,0xfff5e0,1.5,10);
  // Ambient
  scene.add(new THREE.AmbientLight(0x1a2a1a,.5));
}

// ══════════════════════════════════════════════════════
// ROOM 2 — LOCKER ROOM (z:10..28, x:-8..8)
// ══════════════════════════════════════════════════════
function buildLockerRoom(){
  const LM=ml(0x1a1a1a),LF=ml(0x141414),LC=ml(0x0e0e0e),WM=ml(0x222222);
  put(bx(16,.15,18,LF),0,0,19);put(bx(16,.15,18,LC),0,WH,19);
  wall(-8,WH/2,19,.3,WH,18,LM);wall(8,WH/2,19,.3,WH,18,LM);
  wall(0,WH/2,28,16,WH,.3,LM);
  // Back wall of tunnel connects — door at z=10, x=0 (already built)
  // Also door to trophy room at x=8, z=19
  {const hw=(18-DW)/2,p1=19-DW/2-hw/2,p2=19+DW/2+hw/2;
   wall(8,WH/2,p1,.3,WH,hw,WM);wall(8,WH/2,p2,.3,WH,hw,WM);
   const hd=bx(.3,WH-DH,DW,WM);hd.position.set(8,DH+(WH-DH)/2,19);scene.add(hd);}
  // Door to press room at x=-8, z=19
  {const hw=(18-DW)/2,p1=19-DW/2-hw/2,p2=19+DW/2+hw/2;
   wall(-8,WH/2,p1,.3,WH,hw,WM);wall(-8,WH/2,p2,.3,WH,hw,WM);
   const hd=bx(.3,WH-DH,DW,WM);hd.position.set(-8,DH+(WH-DH)/2,19);scene.add(hd);}
  // Lockers along both walls
  const lockerM=ms(0x1a2a1a,.8),lockerDM=ms(0x0a180a,.9),handleM=ms(0xc8c820,.3,.8);
  [-6,-3,0,3,6].forEach(x=>{
    put(bx(2,.04,1,ms(0x2a3a2a,.7)),-x,0,12); // bench
    // Left side lockers
    put(bx(2,WH*.8,.6,lockerM),-x,WH*.4,10.3);
    put(bx(1.9,WH*.75,.55,lockerDM),-x,WH*.4,10.35);
    put(bx(.08,.08,.06,handleM),-x,WH*.4,10.08);
    // Right side lockers
    put(bx(2,WH*.8,.6,lockerM),-x,WH*.4,27.7);
    put(bx(1.9,WH*.75,.55,lockerDM),-x,WH*.4,27.65);
    put(bx(.08,.08,.06,handleM),-x,WH*.4,27.92);
  });
  // His special jersey on the wall (center, back wall)
  const jerseyM=ms(0x1a6a1a,.7);
  put(bx(1.5,.04,2,jerseyM),0,2.5,27.8); // jersey shape
  put(bx(1.8,.04,.4,jerseyM),0,3,27.82); // shoulders
  // Number 10 glow
  const numG=bx(.04,.8,1,ms(0xe8f040,.2,0,0xe8f040,1.5));put(numG,0,2,27.8);
  const nL=new THREE.PointLight(0xe8f040,1.2,4);nL.position.set(0,2.5,27.5);scene.add(nL);LIGHTS.push({l:nL,base:1.2,t:2});
  // Tactical board
  const tbM=ms(0x0a3a0a,.6);put(bx(.05,2.5,3.5,tbM),7.8,2.5,19); // green board
  put(bx(.06,2.6,3.6,ms(0x2a4a2a,.8)),7.82,2.5,19); // frame
  // Magnetic pieces on board
  [[0,-1],[.5,.5],[-.5,.3],[.2,-.2],[-1,.1]].forEach(([bz,bx2])=>{
    put(sp(.08,6,ms(0xffffff,.5)),7.78,2.5+bx2,19+bz);
    put(sp(.08,6,ms(0xe8f040,.5)),7.78,2.5+bx2-.4,19+bz+.3);
  });
  // Boots on floor
  put(bx(.3,.15,.6,ms(0x111111,.85)),2,0.08,20);put(bx(.3,.15,.6,ms(0x111111,.85)),2.5,0.08,20);
  // Ball
  const ball=sp(.22,14,ms(0xffffff,.5));put(ball,0,.22,20);
  const ballL=new THREE.PointLight(0xffffff,.3,2);ballL.position.set(0,.5,20);scene.add(ballL);
  // Lights
  floodlight(-3,3.8,19,0xfff5e0,2,10);floodlight(3,3.8,19,0xfff5e0,2,10);floodlight(-3,3.8,13,0xfff5e0,1.5,8);floodlight(3,3.8,13,0xfff5e0,1.5,8);
  // SECRET MAGGIE ROOM hidden behind locker at z=27.7, x=6
  IACTS.push({x:6,z:27,r:1.5,label:'[E] Kya hai yahan? 🤔',game:'secret'});
  IACTS.push({x:0,z:27,r:1.5,label:'[E] Your Jersey #10',game:'jersey'});
  IACTS.push({x:7.5,z:19,r:1.5,label:'[E] Tactical Board Quiz',game:'quiz'});
}

// ══════════════════════════════════════════════════════
// ROOM 3 — TROPHY ROOM (x:8..22, z:10..28)
// ══════════════════════════════════════════════════════
function buildTrophyRoom(){
  const CX=15,CZ=19,TM=ml(0x1a1a10),TF=ml(0x181810),TC=ml(0x101008);
  put(bx(14,.15,18,TF),CX,0,CZ);put(bx(14,.15,18,TC),CX,WH,CZ);
  wall(CX+7,WH/2,CZ,.3,WH,18,TM);wall(CX,WH/2,CZ+9,14,WH,.3,TM);wall(CX,WH/2,CZ-9,14,WH,.3,TM);
  // Shared wall at x=8 — door at z=19
  {const hw=(18-DW)/2,p1=CZ-DW/2-hw/2,p2=CZ+DW/2+hw/2;
   wall(8,WH/2,p1,.3,WH,hw,TM);wall(8,WH/2,p2,.3,WH,hw,TM);
   const hd=bx(.3,WH-DH,DW,TM);hd.position.set(8,DH+(WH-DH)/2,CZ);scene.add(hd);}
  // Trophy display cases
  const glassM=new THREE.MeshStandardMaterial({color:0x8aeeff,roughness:.05,metalness:.1,transparent:true,opacity:.2,side:DS});
  const goldM=ms(0xc8922a,.3,.85,0xc8922a,.5);
  const silverM=ms(0xaaaaaa,.3,.85,0xaaaaaa,.3);
  [[CX-4,CZ-5],[CX,CZ-5],[CX+4,CZ-5],[CX-4,CZ+5],[CX,CZ+5],[CX+4,CZ+5]].forEach(([tx,tz],i)=>{
    put(bx(2,.04,1.5,ms(0x1a1a08,.8)),tx,.02,tz); // plinth
    put(bx(2,1.5,1.5,glassM.clone()),tx,.77,tz);   // glass case
    // Trophy inside
    const col=i<3?goldM:silverM;
    put(cy(.2,.15,.8,8,col),tx,.5,tz);
    put(cy(.35,.35,.06,8,col),tx,.9,tz);
    put(cy(.05,.05,.4,6,col),tx,1.1,tz);
    put(sp(.18,8,col),tx,1.35,tz);
    const tL=new THREE.PointLight(i<3?0xffcc44:0xaaaacc,.8,3);tL.position.set(tx,1.8,tz);scene.add(tL);LIGHTS.push({l:tL,base:.8,t:i*.5});
  });
  // Golden Boot
  put(bx(.3,.15,.6,ms(0xc8922a,.2,.9)),CX,1.8,CZ);
  put(bx(2,.08,1,ms(0xc8922a,.4,.7)),CX,1.72,CZ);
  const gbL=new THREE.PointLight(0xffcc44,2,5);gbL.position.set(CX,2.5,CZ);scene.add(gbL);LIGHTS.push({l:gbL,base:2,t:1});
  // Plaques on wall
  [-4,0,4].forEach(x=>{put(bx(.04,.8,1.2,ms(0xc8922a,.3,.85)),CX+x,3,CZ+8.8);put(bx(.06,.82,1.22,ms(0x1a1808,.9)),CX+x-.02,3,CZ+8.8)});
  floodlight(CX-4,3.8,CZ,0xfff5cc,1.8,10);floodlight(CX+4,3.8,CZ,0xfff5cc,1.8,10);
  IACTS.push({x:CX,z:CZ,r:2,label:'[E] Golden Boot 🏆',game:'memory'});
}

// ══════════════════════════════════════════════════════
// ROOM 4 — PRESS ROOM (x:-22..-8, z:10..28)
// ══════════════════════════════════════════════════════
function buildPressRoom(){
  const CX=-15,CZ=19,PM=ml(0x101818),PF=ml(0x0e1414),PC=ml(0x0a1010);
  put(bx(14,.15,18,PF),CX,0,CZ);put(bx(14,.15,18,PC),CX,WH,CZ);
  wall(CX-7,WH/2,CZ,.3,WH,18,PM);wall(CX,WH/2,CZ+9,14,WH,.3,PM);wall(CX,WH/2,CZ-9,14,WH,.3,PM);
  {const hw=(18-DW)/2,p1=CZ-DW/2-hw/2,p2=CZ+DW/2+hw/2;
   wall(-8,WH/2,p1,.3,WH,hw,PM);wall(-8,WH/2,p2,.3,WH,hw,PM);
   const hd=bx(.3,WH-DH,DW,PM);hd.position.set(-8,DH+(WH-DH)/2,CZ);scene.add(hd);}
  // Press banner backdrop (sponsor board aesthetic)
  const bannerM=ms(0x0a1a12,.9);put(bx(.05,4,12,bannerM),CX+6.8,2,CZ);
  // Sponsor text strips
  for(let z=CZ-5;z<=CZ+5;z+=1.2){for(let y=.5;y<4;y+=.6){put(bx(.02,.5,1,ms(0xe8f040,.2,0,0xe8f040,.8)),CX+6.78,y,z)}}
  // Podium
  put(bx(3,.8,1.5,ms(0x1a2a1a,.8)),CX,0.4,CZ-3);put(bx(2.8,.04,.8,ms(0xe8f040,.2)),CX,.82,CZ-3.35);
  // Microphones
  [-1,0,1].forEach(mx=>{put(cy(.04,.04,.6,6,ms(0x333333,.5)),CX+mx,.82+.3,CZ-3.35);put(sp(.08,8,ms(0x222222,.6)),CX+mx,.82+.65,CZ-3.35)});
  // "MAN OF THE MATCH" screen
  const motmCv=document.createElement('canvas');motmCv.width=512;motmCv.height=256;
  const mctx=motmCv.getContext('2d');
  mctx.fillStyle='#0a0f08';mctx.fillRect(0,0,512,256);
  mctx.strokeStyle='#e8f040';mctx.lineWidth=5;mctx.strokeRect(4,4,504,248);
  mctx.fillStyle='#e8f040';mctx.font='bold 44px Bebas Neue,sans-serif';mctx.textAlign='center';
  mctx.fillText('MAN OF THE MATCH',256,65);
  mctx.fillStyle='rgba(232,240,64,.5)';mctx.font='28px Barlow Condensed,sans-serif';
  mctx.fillText('PRITAM "MAGGIE" ___',256,110);
  mctx.fillStyle='rgba(168,200,100,.6)';mctx.font='20px Barlow Condensed,sans-serif';
  mctx.fillText('GOALS: ∞  ·  NOODLE HAIR: CONFIRMED',256,148);
  mctx.fillText('SHILLONG FC  ·  SEASON 2025-26',256,178);
  const motmTex=new THREE.CanvasTexture(motmCv);motmTex.minFilter=THREE.LinearFilter;
  const motmMesh=new THREE.Mesh(new THREE.PlaneGeometry(5,2.5),new THREE.MeshBasicMaterial({map:motmTex,side:DS}));
  motmMesh.position.set(CX+6.7,2.8,CZ);motmMesh.rotation.y=-Math.PI/2;scene.add(motmMesh);
  // Press chairs
  for(let r=0;r<3;r++)for(let col=0;col<4;col++){
    const cx2=CX-5+col*1.4,cz2=CZ+r*1.6;
    put(bx(1.1,.12,.9,ms(0x1a2a1a,.8)),cx2,.42,cz2);put(bx(1.1,1,.1,ms(0x1a2a1a,.8)),cx2,1,cz2-.45);
    put(cy(.04,.04,.42,4,ms(0x222222,.9)),cx2-.4,.21,cz2-.35);put(cy(.04,.04,.42,4,ms(0x222222,.9)),cx2+.4,.21,cz2-.35);
  }
  // Reporter camera on tripod
  put(bx(.4,.35,.5,ms(0x111111,.8)),CX+5,1.6,CZ+5);put(cy(.04,.04,.5,4,ms(0x222222,.9)),CX+5,.25,CZ+5);
  put(cy(.04,.04,.5,4,ms(0x222222,.9)),CX+5.2,.25,CZ+5.2);put(cy(.04,.04,.5,4,ms(0x222222,.9)),CX+4.8,.25,CZ+5.2);
  const cL=new THREE.PointLight(0xffffff,.6,4);cL.position.set(CX+4.5,2,CZ+5);scene.add(cL);
  floodlight(CX-4,3.8,CZ,0xfff5e0,1.8,10);floodlight(CX+4,3.8,CZ,0xfff5e0,1.8,10);floodlight(CX,3.8,CZ-5,0xfff5e0,1.5,8);
  IACTS.push({x:CX,z:CZ-3,r:2,label:'[E] Press Conference 🎙️',game:'press'});
  IACTS.push({x:CX+4,z:CZ+5,r:1.5,label:'[E] Play Catch Stars ⭐',game:'catch'});
}

// ══════════════════════════════════════════════════════
// ROOM 5 — SECRET NOODLE ROOM (behind locker, x:-4..-2, z:28..36)
// ══════════════════════════════════════════════════════
function buildNoodleRoom(){
  const CX=0,CZ=32,NM=ml(0x1a0808),NF=ml(0x140606),NC=ml(0x100404);
  put(bx(8,.15,8,NF),CX,0,CZ);put(bx(8,.15,8,NC),CX,WH,CZ);
  wall(-4,WH/2,CZ,.3,WH,8,NM);wall(4,WH/2,CZ,.3,WH,8,NM);wall(CX,WH/2,CZ+4,8,WH,.3,NM);
  // Door from locker room back wall at z=28, x=0
  {const hw=(8-DW)/2,p1=0-DW/2-hw/2,p2=0+DW/2+hw/2;
   wall(p1,WH/2,28,hw,WH,.3,NM);wall(p2,WH/2,28,hw,WH,.3,NM);
   const hd=bx(DW,WH-DH,.3,NM);hd.position.set(0,DH+(WH-DH)/2,28);scene.add(hd);}
  // RED neon glow — "danger zone"
  const rL=new THREE.PointLight(0xff2200,2,8);rL.position.set(0,3,32);scene.add(rL);LIGHTS.push({l:rL,base:2,t:0});
  // Giant Maggie noodles packet shrine
  const noodlePack=bx(2,3,1,ms(0xff4400,.6,0,0xff6600,1));put(noodlePack,0,1.5,CZ+3.5);
  put(bx(1.8,2.8,.8,ms(0xffcc00,.4)),0,1.5,CZ+3.48);
  // Floating noodles (strands)
  [-1.5,-1,-.5,0,.5,1,1.5].forEach((x,i)=>{
    const strand=cy(.04,.04,.8+Math.random()*.4,4,ms(0xffcc44,.5,0,0xffcc44,.8));
    strand.position.set(x,2+Math.sin(i)*.3,CZ+2);
    strand.rotation.z=Math.PI/2+Math.sin(i)*.3;
    scene.add(strand);
    LIGHTS.push({l:null,fl:strand,base:0,t:i*.5+1});
  });
  // "YOU FOUND IT" sign
  const signCv=document.createElement('canvas');signCv.width=512;signCv.height=256;
  const sctx=signCv.getContext('2d');
  sctx.fillStyle='#1a0000';sctx.fillRect(0,0,512,256);
  sctx.strokeStyle='#ff4400';sctx.lineWidth=6;sctx.strokeRect(4,4,504,248);
  sctx.fillStyle='#ff4400';sctx.font='bold 60px Bebas Neue,sans-serif';sctx.textAlign='center';
  sctx.fillText('THE NOODLE SHRINE 🍜',256,80);
  sctx.fillStyle='rgba(255,100,50,.7)';sctx.font='26px Barlow Condensed,sans-serif';
  sctx.fillText('MAGGIE\'S TRUE IDENTITY REVEALED',256,130);
  sctx.fillStyle='rgba(255,200,100,.5)';sctx.font='20px Barlow Condensed,sans-serif';
  sctx.fillText('Est. When His Hair Said "2 minute noodles"',256,170);
  const signTex=new THREE.CanvasTexture(signCv);signTex.minFilter=THREE.LinearFilter;
  const signMesh=new THREE.Mesh(new THREE.PlaneGeometry(5,2.5),new THREE.MeshBasicMaterial({map:signTex,side:DS}));
  signMesh.position.set(0,3,CZ+3.85);signMesh.rotation.y=Math.PI;scene.add(signMesh);
  IACTS.push({x:0,z:CZ+3,r:2,label:'[E] Inspect the Shrine 👀',game:'noodle'});
}

// ══════════════════════════════════════════════════════
// GATE — PITCH ENTRANCE (z=-20, scoreboard above)
// ══════════════════════════════════════════════════════
const GATE_Z=-20;
let doorPL,doorPR;
function buildGate(){
  const aM=ms(0x1a3a1a,.8);
  // Arch frame
  put(bx(.5,WH,.5,aM),-2.3,WH/2,GATE_Z);put(bx(.5,WH,.5,aM),2.3,WH/2,GATE_Z);
  put(bx(5.5,.5,.5,aM),0,WH+.2,GATE_Z);
  for(let a=0;a<=Math.PI;a+=Math.PI/8){const seg=bx(.45,.45,.45,aM);seg.position.set(Math.cos(a)*2.3,WH+.25+Math.sin(a)*1.5,GATE_Z);scene.add(seg)}
  // Gate doors
  const dM=ms(0x0a1a0a,.9);
  doorPL=new THREE.Group();doorPL.position.set(-2,DH/2,GATE_Z);
  const dL=bx(2,DH,.12,dM);dL.position.set(1,0,0);
  for(let y=-DH/2+.4;y<DH/2;y+=.7){const pk=bx(1.88,.08,.02,ms(0x0e280e,.95));pk.position.set(1,y,.08);dL.add(pk)}
  const barL=bx(1.5,.06,.02,ms(0xe8f040,.2,0,0xe8f040,1));barL.position.set(.6,0,.1);dL.add(barL);
  doorPL.add(dL);scene.add(doorPL);
  doorPR=new THREE.Group();doorPR.position.set(2,DH/2,GATE_Z);
  const dR=bx(2,DH,.12,dM);dR.position.set(-1,0,0);
  for(let y=-DH/2+.4;y<DH/2;y+=.7){const pk=bx(1.88,.08,.02,ms(0x0e280e,.95));pk.position.set(-1,y,.08);dR.add(pk)}
  const barR=bx(1.5,.06,.02,ms(0xe8f040,.2,0,0xe8f040,1));barR.position.set(-.6,0,.1);dR.add(barR);
  doorPR.add(dR);scene.add(doorPR);
  // Gate collider
  addCol(-2.3,2.3,GATE_Z-.2,GATE_Z+.2);
  // Dark outside
  put(bx(8,WH,.06,ms(0x010301,.99)),0,WH/2,GATE_Z-.22);
  // ── SCOREBOARD ABOVE GATE ──
  const sbMesh=new THREE.Mesh(new THREE.PlaneGeometry(7,3.5),new THREE.MeshBasicMaterial({map:sbTex,side:DS}));
  sbMesh.position.set(0,WH+2.2,GATE_Z);sbMesh.rotation.y=Math.PI; // face player
  scene.add(sbMesh);
  // Scoreboard frame / support structure
  put(bx(7.4,3.9,.15,ms(0x1a1a1a,.9)),0,WH+2.2,GATE_Z+.1);
  put(bx(7.6,.15,.2,ms(0x333333,.8)),0,WH+.2,GATE_Z+.1);
  put(bx(7.6,.15,.2,ms(0x333333,.8)),0,WH+4.35,GATE_Z+.1);
  put(cy(.12,.12,4.2,8,ms(0x333333,.8)),-3.6,WH+2.2,GATE_Z+.1);
  put(cy(.12,.12,4.2,8,ms(0x333333,.8)),3.6,WH+2.2,GATE_Z+.1);
  // Scoreboard lights
  const sbL=new THREE.PointLight(0xe8f040,1.5,8);sbL.position.set(0,WH+2.5,GATE_Z-1);scene.add(sbL);LIGHTS.push({l:sbL,base:1.5,t:0});
  drawScoreboard();setInterval(drawScoreboard,1000);
}

// ══════════════════════════════════════════════════════
// OUTDOOR PITCH SCENE (birthday)
// ══════════════════════════════════════════════════════
const outScene=new THREE.Scene();
const outCam=new THREE.PerspectiveCamera(72,W/H,.1,1200);
outCam.position.set(0,1.65,0);outCam.rotation.order='YXZ';
let outMode=false,outFr=0,outPetals=[],outBreeze=null,confetti=[];

function buildPitch(){
  const ist=getIST(),hr=ist.getHours(),isN=hr<6||hr>=18;
  // Shillong June: misty hills, overcast possible, pleasant
  const storm=Math.random()>.65; // Shillong rains a lot in June
  const skyC=isN?0x040806:hr<8?0x1a2a0e:hr<12?0x2a4a1a:hr<17?0x1a3a10:0x0e2008;
  outScene.background=new THREE.Color(skyC);outScene.fog=new THREE.FogExp2(skyC,.004);
  // PITCH
  const pitchGeo=new THREE.PlaneGeometry(68,105,20,30);
  const pitchMat=new THREE.MeshLambertMaterial({color:0x2a6a12});
  const pitch=new THREE.Mesh(pitchGeo,pitchMat);pitch.rotation.x=-Math.PI/2;pitch.position.set(0,-2,25);outScene.add(pitch);
  // Pitch markings (white lines)
  const lineM=new THREE.MeshLambertMaterial({color:0xffffff});
  // Center circle
  const cc=new THREE.Mesh(new THREE.TorusGeometry(9.15,.1,8,32),lineM);cc.rotation.x=-Math.PI/2;cc.position.set(0,-1.98,25);outScene.add(cc);
  // Center line
  put2(new THREE.Mesh(new THREE.PlaneGeometry(68,.15),lineM),0,-1.98,25,-Math.PI/2);
  // Penalty boxes
  [[0,-1.97,-20],[0,-1.97,70]].forEach(([x,y,z])=>{const pb=new THREE.Mesh(new THREE.PlaneGeometry(40.32,.15),lineM);pb.rotation.x=-Math.PI/2;pb.rotation.z=Math.PI/2;pb.position.set(x,y,z);outScene.add(pb)});
  // Goals
  [[0,-2,-52],[0,-2,102]].forEach(([gx,gy,gz])=>{
    put2(cy(.06,.06,2.5,6,ms(0xffffff,.5)),gx-3.66,gy+1.25,gz);
    put2(cy(.06,.06,2.5,6,ms(0xffffff,.5)),gx+3.66,gy+1.25,gz);
    put2(bx(7.32,.06,.1,ms(0xffffff,.5)),gx,gy+2.5,gz);
  });
  function put2(m,x,y,z,rx=0){m.position.set(x,y,z);if(rx)m.rotation.x=rx;outScene.add(m);return m}
  // Shillong Hills in background
  function mkHill(x,z,h,w,c){const g=new THREE.ConeGeometry(w,h,8+Math.floor(Math.random()*5));const vv=g.attributes.position;for(let i=0;i<vv.count;i++)if(vv.getY(i)<h*.4){vv.setX(i,vv.getX(i)*(1+(Math.random()-.5)*.4));vv.setZ(i,vv.getZ(i)*(1+(Math.random()-.5)*.4))}g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:c}));m.position.set(x,h/2-2,z);outScene.add(m)}
  [[-120,300,80,65,0x2a4a1a],[0,320,95,80,0x1a3a0e],[120,300,75,60,0x2a4a1a],[-200,280,65,50,0x3a5a2a],[200,285,70,55,0x2a5a1a],[-80,340,55,42,0x1a3a0e],[80,350,60,48,0x243c14],[-160,250,48,36,0x3a5a2a],[160,260,52,40,0x2a4a1a]].forEach(a=>mkHill(...a));
  // Mist over hills (Shillong signature)
  for(let i=0;i<6;i++){const mist=new THREE.Mesh(new THREE.SphereGeometry(30+Math.random()*20,8,8),new THREE.MeshLambertMaterial({color:0xc8d8c0,transparent:true,opacity:.18+Math.random()*.12}));mist.position.set((Math.random()-.5)*300,25+Math.random()*20,200+Math.random()*100);mist.scale.set(2+Math.random(),.3+Math.random()*.2,1.5+Math.random());mist.userData.drift=.004+Math.random()*.004;outScene.add(mist)}
  // Floodlight towers on pitch
  [[30,-2,-45],[30,-2,95],[-30,-2,-45],[-30,-2,95]].forEach(([tx,ty,tz])=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.3,.4,18,8),new THREE.MeshLambertMaterial({color:0x888888}));pole.position.set(tx,ty+9,tz);outScene.add(pole);
    const head=new THREE.Mesh(new THREE.BoxGeometry(4,.4,1),new THREE.MeshLambertMaterial({color:0x555555}));head.position.set(tx,ty+18.2,tz);outScene.add(head);
    const fl2=new THREE.PointLight(0xfff5e0,2.5,60);fl2.position.set(tx,ty+18,tz);outScene.add(fl2);
  });
  // Stars or daytime sky
  if(isN){const sg=new THREE.BufferGeometry();const sp2=new Float32Array(1500*3);for(let i=0;i<1500;i++){const t=Math.random()*Math.PI*2,p=Math.acos(Math.random()*.9);sp2[i*3]=Math.sin(p)*Math.cos(t)*900;sp2[i*3+1]=Math.cos(p)*900;sp2[i*3+2]=Math.sin(p)*Math.sin(t)*900}sg.setAttribute('position',new THREE.BufferAttribute(sp2,3));outScene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:1.6})))}
  // Moon/Sun
  const t2=(isN?(hr>=18?(hr-18)/10:(hr+6)/10):((hr-6)/13));
  const cel=new THREE.Mesh(new THREE.SphereGeometry(isN?12:18,16,16),new THREE.MeshBasicMaterial({color:isN?0xeeeedd:0xfff5aa}));cel.position.set(-250+t2*500,80+Math.sin(Math.PI*t2)*200,280);outScene.add(cel);
  // Rain (Shillong!)
  if(storm){const rg=new THREE.BufferGeometry();const rp=new Float32Array(4000*3);for(let i=0;i<4000;i++){rp[i*3]=(Math.random()-.5)*150;rp[i*3+1]=Math.random()*80;rp[i*3+2]=(Math.random()-.5)*150}rg.setAttribute('position',new THREE.BufferAttribute(rp,3));const rn=new THREE.Points(rg,new THREE.PointsMaterial({color:0xaaccaa,size:.25,transparent:true,opacity:.5}));rn.userData.isRain=true;outScene.add(rn)}
  // Confetti (birthday)
  const confColors=[0xe8f040,0x40e840,0xffffff,0xff6644,0x44aaff];
  for(let i=0;i<120;i++){const cm=new THREE.Mesh(new THREE.PlaneGeometry(.15,.08),new THREE.MeshLambertMaterial({color:confColors[i%confColors.length],side:DS,transparent:true,opacity:.9}));cm.position.set((Math.random()-.5)*60,3+Math.random()*12,Math.random()*50-5);cm.userData={vx:(Math.random()-.5)*.025,vy:-.008-Math.random()*.01,sr:.06+Math.random()*.08};confetti.push(cm);outScene.add(cm)}
  // Breeze
  const bg2=new THREE.BufferGeometry();const bp=new Float32Array(250*3);for(let i=0;i<250;i++){bp[i*3]=(Math.random()-.5)*80;bp[i*3+1]=-1+Math.random()*10;bp[i*3+2]=Math.random()*60}bg2.setAttribute('position',new THREE.BufferAttribute(bp,3));outBreeze=new THREE.Points(bg2,new THREE.PointsMaterial({color:0xd0f0d8,size:.14,transparent:true,opacity:.35}));outScene.add(outBreeze);
  outScene.add(new THREE.AmbientLight(isN?0x0a180a:0xddf0cc,isN?.5:1));
  const sun2=new THREE.DirectionalLight(isN?0x2a402a:0xeeffd0,isN?.4:1.1);sun2.position.copy(cel.position);outScene.add(sun2);
}
const ltLight=new THREE.PointLight(0xaaffaa,0,500);ltLight.position.set(0,200,50);outScene.add(ltLight);
let ltTimer2=0;

// ══════════════════════════════════════════════════════
// PLAYER & CONTROLS
// ══════════════════════════════════════════════════════
const player={x:0,y:1.65,z:0,yaw:0,pitch:0};
const keys={};
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyE')tryInteract()});
document.addEventListener('keyup',e=>delete keys[e.code]);
let dlook=false,dlx=0,dly=0;
canvas.addEventListener('mousedown',e=>{dlook=true;dlx=e.clientX;dly=e.clientY});
document.addEventListener('mouseup',()=>dlook=false);
document.addEventListener('mousemove',e=>{if(!dlook||gameActive)return;player.yaw-=(e.clientX-dlx)*.003;player.pitch-=(e.clientY-dly)*.002;player.pitch=Math.max(-.65,Math.min(.6,player.pitch));dlx=e.clientX;dly=e.clientY});
canvas.addEventListener('touchstart',e=>{dlook=true;dlx=e.touches[0].clientX;dly=e.touches[0].clientY},{passive:true});
canvas.addEventListener('touchmove',e=>{if(!dlook||gameActive)return;player.yaw-=(e.touches[0].clientX-dlx)*.004;player.pitch-=(e.touches[0].clientY-dly)*.003;player.pitch=Math.max(-.65,Math.min(.6,player.pitch));dlx=e.touches[0].clientX;dly=e.touches[0].clientY},{passive:true});
canvas.addEventListener('touchend',()=>dlook=false);
const joy={l:{dx:0,dy:0},r:{dx:0,dy:0}};
function setupJoy(eId,kId,side){
  const el=document.getElementById(eId),kn=document.getElementById(kId),R=44;
  let active=false,tid=-1;
  const gc=()=>{const r=el.getBoundingClientRect();return{cx:r.left+r.width/2,cy:r.top+r.height/2}};
  const onS=e=>{e.preventDefault();active=true;const t=e.touches?e.touches[0]:e;tid=t.identifier??-1};
  const onM=e=>{if(!active)return;e.preventDefault();const t=e.touches?Array.from(e.touches).find(x=>x.identifier===tid)||e.touches[0]:e;const{cx,cy}=gc();let dx=t.clientX-cx,dy=t.clientY-cy;const d=Math.sqrt(dx*dx+dy*dy);if(d>R){dx=dx/d*R;dy=dy/d*R}kn.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;joy[side].dx=dx/R;joy[side].dy=dy/R};
  const onE=e=>{e.preventDefault();active=false;kn.style.transform='translate(-50%,-50%)';joy[side].dx=0;joy[side].dy=0};
  el.addEventListener('touchstart',onS,{passive:false});el.addEventListener('touchmove',onM,{passive:false});el.addEventListener('touchend',onE,{passive:false});
  el.addEventListener('mousedown',e=>{active=true;onS(e);const mm=ev=>onM(ev);const mu=()=>{document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);onE(e)};document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu)});
}
setupJoy('jl','jlk','l');setupJoy('jr','jrk','r');
function movePlayer(){
  if(gameActive)return;
  if(Math.abs(joy.r.dx)>.04)player.yaw-=joy.r.dx*.044;
  if(Math.abs(joy.r.dy)>.04){player.pitch-=joy.r.dy*.03;player.pitch=Math.max(-.65,Math.min(.6,player.pitch))}
  if(keys['ArrowLeft']||keys['KeyA'])player.yaw+=.038;if(keys['ArrowRight']||keys['KeyD'])player.yaw-=.038;
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.y=0;dir.normalize();
  const right=new THREE.Vector3(-dir.z,0,dir.x);let mx=0,mz=0;const sp=.07;
  if(Math.abs(joy.l.dy)>.04){mx+=dir.x*(-joy.l.dy)*sp*1.7;mz+=dir.z*(-joy.l.dy)*sp*1.7}
  if(Math.abs(joy.l.dx)>.04){mx+=right.x*joy.l.dx*sp*1.7;mz+=right.z*joy.l.dx*sp*1.7}
  if(keys['KeyW']||keys['ArrowUp']){mx+=dir.x*sp;mz+=dir.z*sp}
  if(keys['KeyS']){mx-=dir.x*sp;mz-=dir.z*sp}
  if(mx||mz){if(canMove(player.x+mx,player.z))player.x+=mx;if(canMove(player.x,player.z+mz))player.z+=mz}
}
function checkInteracts(){
  nearI=null;let best=Infinity;
  IACTS.forEach(o=>{const d=Math.hypot(player.x-o.x,player.z-o.z);if(d<o.r&&d<best){best=d;nearI=o}});
  const ip=document.getElementById('ip');
  if(nearI&&!gameActive){ip.style.display='block';ip.textContent=nearI.label}else ip.style.display='none';
}
function tryInteract(){if(nearI&&!gameActive)launchGame(nearI.game)}
canvas.addEventListener('click',tryInteract);

// ── MINIMAP ───────────────────────────────────────────
const mmCv=document.getElementById('mm');mmCv.width=110;mmCv.height=110;
const mmCtx=mmCv.getContext('2d');
const RMAP=[{x:0,z:-5,w:8,d:30,c:'#101008'},{x:0,z:19,w:16,d:18,c:'#0a1008'},{x:15,z:19,w:14,d:18,c:'#101008'},{x:-15,z:19,w:14,d:18,c:'#0a1010'},{x:0,z:32,w:8,d:8,c:'#180808'}];
function renderMM(){
  mmCtx.clearRect(0,0,110,110);const SC=110/60,OX=30,OZ=22;
  RMAP.forEach(r=>{mmCtx.fillStyle=r.c;mmCtx.fillRect((r.x-r.w/2+OX)*SC,(r.z-r.d/2+OZ)*SC,r.w*SC,r.d*SC);mmCtx.strokeStyle='rgba(232,240,64,.15)';mmCtx.lineWidth=.5;mmCtx.strokeRect((r.x-r.w/2+OX)*SC,(r.z-r.d/2+OZ)*SC,r.w*SC,r.d*SC)});
  IACTS.forEach(o=>{mmCtx.fillStyle='rgba(232,240,64,.45)';mmCtx.beginPath();mmCtx.arc((o.x+OX)*SC,(o.z+OZ)*SC,2.5,0,Math.PI*2);mmCtx.fill()});
  mmCtx.fillStyle='#e8f040';mmCtx.beginPath();mmCtx.arc((player.x+OX)*SC,(player.z+OZ)*SC,3.5,0,Math.PI*2);mmCtx.fill();
  const ax=Math.sin(-player.yaw)*9,az=Math.cos(player.yaw)*9;
  mmCtx.strokeStyle='#e8f040';mmCtx.lineWidth=1.5;mmCtx.beginPath();mmCtx.moveTo((player.x+OX)*SC,(player.z+OZ)*SC);mmCtx.lineTo((player.x+OX)*SC+ax,(player.z+OZ)*SC+az);mmCtx.stroke();
}
const RZONES=[{n:'THE TUNNEL',xmn:-4,xmx:4,zmn:-20,zmx:10},{n:'LOCKER ROOM',xmn:-8,xmx:8,zmn:10,zmx:28},{n:'TROPHY ROOM',xmn:8,xmx:22,zmn:10,zmx:28},{n:'PRESS ROOM',xmn:-22,xmx:-8,zmn:10,zmx:28},{n:'🍜 THE SHRINE',xmn:-4,xmx:4,zmn:28,zmx:37}];
let lastRoom='';
function checkRoom(){for(const z of RZONES){if(player.x>=z.xmn&&player.x<z.xmx&&player.z>=z.zmn&&player.z<z.zmx){if(z.n!==lastRoom){lastRoom=z.n;const el=document.getElementById('rl');el.style.opacity='0';setTimeout(()=>{el.textContent=z.n;el.style.opacity='1'},280);setTimeout(()=>el.style.opacity='0',3400)}return}}}

// ══════════════════════════════════════════════════════
// MINI GAMES
// ══════════════════════════════════════════════════════
let activeRAF=null;
function openG(title,sub){
  document.getElementById('gt').textContent=title;document.getElementById('gs').textContent=sub;
  document.getElementById('gsc').textContent='';document.getElementById('gm').textContent='';
  document.getElementById('gc').style.display='none';document.getElementById('mg').style.display='none';document.getElementById('qw').style.display='none';
  document.getElementById('go').style.display='flex';
  document.getElementById('jl').style.opacity='0';document.getElementById('jr').style.opacity='0';gameActive=true;
}
function closeG(){document.getElementById('go').style.display='none';document.getElementById('jl').style.opacity='1';document.getElementById('jr').style.opacity='1';gameActive=false;if(activeRAF){cancelAnimationFrame(activeRAF);activeRAF=null}}
document.getElementById('gcl').onclick=closeG;

function launchGame(t){
  if(t==='secret')showSecret();
  else if(t==='noodle')showNoodleRoast();
  else if(t==='jersey')showJersey();
  else if(t==='press')showPress();
  else if(t==='quiz')gameQuiz();
  else if(t==='memory')gameMemory();
  else if(t==='catch')gameCatch();
  else if(t==='penalty')gamePenalty();
}

// SECRET ROOM TEASE
function showSecret(){
  gameActive=true;document.getElementById('jl').style.opacity='0';document.getElementById('jr').style.opacity='0';
  document.getElementById('roast-text').innerHTML='Abe yahan kya dhundh raha hai??<br><br>Agar aage gaya toh tujhe pata chal jayega kyun tujhe <b style="color:#e8f040">MAGGIE</b> bulate hain... 🍜<br><br>Jaata hai kya? 😂';
  document.getElementById('roast-title').textContent='OYE! 👀';document.getElementById('roast-noodle').textContent='🚪';
  document.getElementById('roast-popup').style.display='flex';
}

// NOODLE SHRINE ROAST
const ROASTS=["Bhai teri hair dekh ke toh Maggi wale patent sue kar sakte hain 🍜","2 minute ready hota hai Maggi, tu bhi 2 minute mein pitch pe ready ho jaata hai... mostly to fall 😂","Shillong ke hills, curly hair, aur overcooked noodles — teri original story yahi hai bhai ⚽🍜","Referee ne ek baar tujhe yellow card diya tha noodles laane ke liye field pe 🟨","Tere hair ko dekh ke opposition distracted ho jaata hai — yahi teri actual skill hai 😭","Pritam 'Maggie' — The Man, The Myth, The Noodle. Happy Birthday legend! 🎂⚽"];
function showNoodleRoast(){
  gameActive=true;document.getElementById('jl').style.opacity='0';document.getElementById('jr').style.opacity='0';
  const r=ROASTS[Math.floor(Math.random()*ROASTS.length)];
  document.getElementById('roast-text').textContent=r;
  document.getElementById('roast-title').textContent='THE TRUTH 🍜';document.getElementById('roast-noodle').textContent='🍜';
  document.getElementById('roast-popup').style.display='flex';
}

// JERSEY MESSAGE
function showJersey(){
  openG('YOUR JERSEY #10','Shillong FC · The Legend');
  const qw=document.getElementById('qw');qw.style.display='flex';qw.innerHTML='';
  const msgs=['Har match mein tu dil lagaata hai ⚽','Curly hair, straight goals — that\'s the Maggie way 🍜','Shillong ki hills dekhi hain? Waise hi tu chadh jaata hai opposition pe 😤','Tere liye field pe koi "2 minute noodles" nahi — tu slow cooker hai par dish masterpiece hai 👨‍🍳','Bhai, jersey number 10 — Maradona bhi noodle khaata tha, probably 🙏'];
  msgs.forEach((msg,i)=>{const d=document.createElement('div');d.style.cssText='color:#a8c870;font-family:Barlow,sans-serif;font-weight:300;font-size:.82rem;text-align:center;line-height:1.7;opacity:0;transition:opacity .6s';d.textContent=msg;qw.appendChild(d);setTimeout(()=>d.style.opacity='1',i*600)});
}

// PRESS CONFERENCE
const PRESS_QA=[['Reporter: "Maggie, how do you describe your playing style?"','"Dekh bhai, field pe jaata hoon, noodles ki tarah tangled ho jaata hoon opposition mein, aur goal ho jaata hai. Simple." 🍜'],['Reporter: "Any special preparation before a match?"','"Ek packet Maggi, 2 minutes, aur Shillong ki thandi hawa — bas. Fit hoon main." 💪'],['Reporter: "Your hair is iconic. Any haircare secrets?"','"Humidity, rain, aur zero comb. Shillong weather does the rest. Natural noodle style." 😌'],['Reporter: "Message for your fans?"','"Bhai log, curly ho, hungry raho, aur kabhi retire mat karo — jaise Maggi never gets old. 🍜⚽"']];
function showPress(){
  openG('PRESS CONFERENCE 🎙️','Pritam "Maggie" speaks...');
  const qw=document.getElementById('qw');qw.style.display='flex';qw.innerHTML='';
  let idx=0;
  const showNext=()=>{if(idx>=PRESS_QA.length){document.getElementById('gsc').textContent='END OF PRESSER ✓';return}const [q,a]=PRESS_QA[idx];const qd=document.createElement('div');qd.style.cssText='color:rgba(232,240,64,.7);font-family:Barlow Condensed,sans-serif;font-size:.75rem;letter-spacing:1px;text-align:center;margin-bottom:4px';qd.textContent=q;qw.appendChild(qd);const ad=document.createElement('div');ad.style.cssText='color:#a8c870;font-family:Barlow,sans-serif;font-weight:300;font-size:.85rem;text-align:center;line-height:1.7;margin-bottom:12px';ad.textContent=a;qw.appendChild(ad);idx++;const nb=document.createElement('button');nb.className='qo';nb.textContent=idx<PRESS_QA.length?'Next question ➤':'Wrap up';nb.onclick=()=>{nb.remove();showNext()};qw.appendChild(nb)};showNext();
}

// QUIZ (Football + Maggie themed)
const QUIZ=[{q:'Which city is Shillong in?',opts:['Assam','Meghalaya','Nagaland','Manipur'],a:1},{q:'Maggi noodles — original cooking time?',opts:['1 min','2 min','5 min','10 min'],a:1},{q:'How many players in a football team on the pitch?',opts:['9','10','11','12'],a:2},{q:'The "Golden Boot" is awarded to?',opts:['Best defender','Top goal scorer','Best goalkeeper','Best midfielder'],a:1},{q:'Curly hair + football skills = ?',opts:['Ronaldo','Gullit','Valderrama','All of the above legends'],a:3},{q:'Shillong is known as the "Scotland of ___"',opts:['Asia','India','East','Northeast'],a:1}];
function gameQuiz(){
  openG('TACTICAL BOARD QUIZ','Prove you know football, Maggie');
  const qw=document.getElementById('qw');qw.style.display='flex';qw.innerHTML='';let qi=0,score=0;
  const showQ=()=>{qw.innerHTML='';if(qi>=QUIZ.length){document.getElementById('gsc').textContent='SCORE: '+score+'/'+QUIZ.length;const gm=document.getElementById('gm');gm.style.color='#e8f040';gm.textContent=score===QUIZ.length?'PERFECT! Maggie FC would be proud!':score>=4?'Good game, legend!':'Hit the training ground more often 😂';return}const q=QUIZ[qi];const qd=document.createElement('div');qd.className='qt';qd.textContent=(qi+1)+'. '+q.q;qw.appendChild(qd);q.opts.forEach((opt,i)=>{const btn=document.createElement('button');btn.className='qo';btn.textContent=opt;btn.onclick=()=>{qw.querySelectorAll('.qo').forEach(b=>b.disabled=true);if(i===q.a){score++;btn.style.background='rgba(100,200,50,.2)';btn.style.borderColor='#70c840'}else{btn.style.background='rgba(200,80,80,.18)';btn.style.borderColor='#c08080';qw.querySelectorAll('.qo')[q.a].style.background='rgba(80,200,80,.12)'};document.getElementById('gsc').textContent=(qi+1)+'/'+QUIZ.length;qi++;setTimeout(showQ,900)};qw.appendChild(btn)})};showQ();
}

// MEMORY
function gameMemory(){
  openG('TROPHY ROOM MEMORY','Match the trophies!');
  const mg=document.getElementById('mg');mg.style.cssText='display:grid;grid-template-columns:repeat(4,62px);gap:7px';
  const EM=['\u26BD','\uD83C\uDFC6','\uD83E\uDD47','\uD83C\uDFC5','\uD83D\uDC5F','\uD83C\uDFCB\uFE0F','\uD83C\uDF1F','\u2764\uFE0F'];const pairs=[...EM,...EM];
  for(let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}
  let flipped=[],matched=0,locked=false;
  pairs.forEach(em=>{const c=document.createElement('div');c.className='mc';c.dataset.e=em;c.onclick=()=>{if(locked||c.classList.contains('fl')||c.classList.contains('dn'))return;c.textContent=em;c.classList.add('fl');flipped.push(c);if(flipped.length===2){locked=true;if(flipped[0].dataset.e===flipped[1].dataset.e){flipped[0].classList.add('dn');flipped[1].classList.add('dn');flipped=[];locked=false;matched+=2;document.getElementById('gsc').textContent='MATCHED: '+(matched/2)+'/'+EM.length;if(matched===pairs.length){document.getElementById('gm').style.color='#e8f040';document.getElementById('gm').textContent='All trophies found! Legend!'}}else{setTimeout(()=>{flipped[0].textContent='';flipped[0].classList.remove('fl');flipped[1].textContent='';flipped[1].classList.remove('fl');flipped=[];locked=false},820)}};mg.appendChild(c)});
}

// CATCH STARS
function gameCatch(){
  const sz=Math.min(innerWidth*.85,320),gh=Math.round(sz*.8);const gcv=document.getElementById('gc');gcv.width=sz;gcv.height=gh;gcv.style.display='block';
  openG('CATCH THE BALLS!','Catch \u26BD dodge \uD83D\uDEA8');
  const gct=gcv.getContext('2d');let basket={x:sz/2,w:70,h:13},items=[],sc=0,lives=3,spd=2.2,sf=55,fr=0;
  const spawn=()=>items.push({x:14+Math.random()*(sz-28),y:-20,type:Math.random()<.72?'ball':'bomb',vy:spd+Math.random()*1.4,r:Math.random()*Math.PI*2});
  const draw=()=>{fr++;if(fr%sf===0)spawn();if(fr%280===0&&spd<7){spd+=.22;sf=Math.max(26,sf-3)}gct.fillStyle='#030a03';gct.fillRect(0,0,sz,gh);if(fr%10===0){gct.fillStyle='rgba(232,240,64,'+(0.1+Math.random()*.15)+')';gct.beginPath();gct.arc(Math.random()*sz,Math.random()*gh*.3,Math.random()*1.2,0,Math.PI*2);gct.fill()}gct.strokeStyle='#e8f040';gct.lineWidth=2;gct.fillStyle='rgba(232,240,64,.2)';gct.beginPath();gct.moveTo(basket.x-basket.w/2,gh-basket.h-3);gct.lineTo(basket.x+basket.w/2,gh-basket.h-3);gct.lineTo(basket.x+basket.w/2-7,gh-3);gct.lineTo(basket.x-basket.w/2+7,gh-3);gct.closePath();gct.fill();gct.stroke();let over=false;items=items.filter(it=>{it.y+=it.vy;it.r+=.055;gct.save();gct.translate(it.x,it.y);gct.rotate(it.r);gct.font='19px serif';gct.textAlign='center';gct.textBaseline='middle';gct.fillText(it.type==='ball'?'\u26BD':'\uD83D\uDEA8',0,0);gct.restore();if(it.y>gh-basket.h-18&&it.y<gh-2&&Math.abs(it.x-basket.x)<basket.w/2+7){if(it.type==='ball')sc++;else{lives--;if(lives<=0)over=true}return false}if(it.y>gh+22){if(it.type==='ball'){lives--;if(lives<=0)over=true}return false}return true});if(over){document.getElementById('gm').style.color='#c08080';document.getElementById('gm').textContent='FULL TIME! Score: '+sc+' ⚽';cancelAnimationFrame(activeRAF);activeRAF=null;return}gct.fillStyle='#e8f040';gct.font='bold 13px Bebas Neue';gct.textAlign='left';gct.fillText('GOALS: '+sc,7,20);gct.textAlign='right';gct.fillText('\u2764\uFE0F'.repeat(Math.max(0,lives)),sz-7,20);document.getElementById('gsc').textContent='SCORE: '+sc;activeRAF=requestAnimationFrame(draw)};
  draw();gcv.addEventListener('mousemove',e=>{const rc=gcv.getBoundingClientRect();basket.x=e.clientX-rc.left});gcv.addEventListener('touchmove',e=>{e.preventDefault();const rc=gcv.getBoundingClientRect();basket.x=e.touches[0].clientX-rc.left},{passive:false});
}

// ══════════════════════════════════════════════════════
// GATE + TRANSITION TO PITCH
// ══════════════════════════════════════════════════════
let gateOpen=false,gateAng=0;
function openGate(){gateOpen=true;document.getElementById('ht').style.opacity='0'}

// ══════════════════════════════════════════════════════
// BIRTHDAY MESSAGE
// ══════════════════════════════════════════════════════
function showBday(){
  document.getElementById('bu').style.display='block';
  document.getElementById('jl').style.opacity='0';document.getElementById('jr').style.opacity='0';
  document.getElementById('xh').style.display='none';document.getElementById('ip').style.display='none';
  document.getElementById('rl').style.display='none';document.getElementById('mm').style.display='none';
  setTimeout(()=>{document.getElementById('bb').classList.add('v');buildBdayMsg()},1200);
}
function buildBdayMsg(){
  const ist=getIST(),win=tWin(ist),c=document.getElementById('bc');c.innerHTML='';let d=0;
  const add=(cls,text,delay)=>{if(cls==='bdv'){c.appendChild(Object.assign(document.createElement('div'),{className:'bdv'}));return}const el=Object.assign(document.createElement('div'),{className:cls,textContent:text});c.appendChild(el);setTimeout(()=>el.classList.add('s'),delay*1000+50)};
  if(win==='mid'){add('bhi','Abe! Tu abhi tak jaag raha hai\uD83E\uDD28??',0);add('bhi','Maggi ki tarah raat bhar pakta raha kya? Apna khayal rakh.',1);add('bti','HAPPY BIRTHDAY MAGGIE! \uD83C\uDF9C\uFE0F\u26BD',2);add('bdv','',2.5);add('bhi','Chal, Shillong ki raat mein kuch bata ta hoon tujhe... \u2728',3);d=3.8}
  else if(win==='morn'){add('bhi','Uth gaya Maggie\uD83E\uDD28?? Aaj toh field pe teri watt lagni chahiye!',0);add('bti','HAPPY BIRTHDAY PRITAM! \u26BD\uD83C\uDF89',1);add('bdv','',1.6);d=2.2}
  else{add('bti','HAPPY BIRTHDAY \uD83C\uDF89',0);add('bti','MAGGIE FC \u26BD',1);add('bdv','',1.6);d=2.2}
  [[d,'bli','Bhai, teri friendship mein wahi baat hai jo Shillong mein hai — unique, thodi foggy, but always real.'],[d+.8,'bli','Football ho ya life, tu apna game apne style mein khelata hai. Curly hair, straight goals.'],[d+1.6,'bhi','Shillong ki thandi hawa mein aaj tere liye cheers \u2014 Maggie FC ka sabse bada fan main hoon. \uD83C\uDF7B'],[d+2.4,'bli','Bhai, ye saal tere liye tight defense tod ne wala ho, goals barsao, aur noodles kabhi khatam mat ho! \uD83C\uDF5C'],[d+3.2,'bti','Happy Birthday, Pritam. Stay curly. \uD83D\uDC4F\u26BD']].forEach(([dl,cls,t])=>add(cls,t,dl));
}

// ══════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
  if(!outMode){
    if(!gameActive)movePlayer();
    camera.position.set(player.x,player.y,player.z);camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;
    if(gateOpen){gateAng=Math.min(gateAng+.016,Math.PI*.65);doorPL.rotation.y=gateAng;doorPR.rotation.y=-gateAng;
      if(gateAng>=Math.PI*.65){document.getElementById('fl').style.background='rgba(232,240,100,.65)';setTimeout(()=>document.getElementById('fl').style.background='',600);setTimeout(startTransition,1400);gateOpen=false}}
    LIGHTS.forEach((t,i)=>{t.t+=dt;const fl=Math.sin(t.t*8+i*2.1)*.15+Math.sin(t.t*13+i)*.08;if(t.l)t.l.intensity=t.base*(0.9+fl);if(t.fl&&t.fl.scale)t.fl.scale.y=.94+Math.sin(t.t*7+i)*.08});
    checkInteracts();checkRoom();renderer.render(scene,camera);renderMM();
  } else {
    outFr++;
    if(Math.abs(joy.r.dx)>.04)outCam.rotation.y-=joy.r.dx*.044;
    if(outBreeze){const pos=outBreeze.geometry.attributes.position;for(let i=0;i<pos.count;i++){let x=pos.getX(i)+.025+Math.sin(outFr*.01+i)*.01;if(x>50)x=-50;pos.setX(i,x)}pos.needsUpdate=true}
    confetti.forEach(p=>{p.position.x+=p.userData.vx+Math.sin(outFr*.02+p.position.x)*.004;p.position.y+=p.userData.vy;p.rotation.x+=p.userData.sr;p.rotation.y+=p.userData.sr*.7;if(p.position.y<-1.5){p.position.y=12+Math.random()*4;p.position.x=(Math.random()-.5)*55}});
    outScene.traverse(o=>{if(o.userData.drift)o.position.x+=o.userData.drift;if(o.userData.isRain){const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++){let y=pos.getY(i)-.38;if(y<-2){y=90;pos.setX(i,(Math.random()-.5)*150);pos.setZ(i,(Math.random()-.5)*150)}pos.setY(i,y)}pos.needsUpdate=true}});
    ltTimer2-=dt;if(ltTimer2<=0){ltLight.intensity=20+Math.random()*20;setTimeout(()=>ltLight.intensity=0,100);ltTimer2=1.5+Math.random()*5}
    renderer.render(outScene,outCam);
  }
}
function startTransition(){
  canvas.style.transition='opacity 1.5s ease';canvas.style.opacity='0';buildPitch();
  setTimeout(()=>{outMode=true;canvas.style.opacity='1';
    canvas.addEventListener('mousemove',e=>{if(!dlook||gameActive)return;outCam.rotation.y-=(e.clientX-dlx)*.003;dlx=e.clientX});
    canvas.addEventListener('touchmove',e=>{if(!dlook||gameActive)return;outCam.rotation.y-=(e.touches[0].clientX-dlx)*.004;dlx=e.touches[0].clientX},{passive:true});
    setTimeout(showBday,2200)},1500);
}

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
let pv=0;
const piv=setInterval(()=>{pv=Math.min(100,pv+3);document.getElementById('pf').style.width=pv+'%';if(pv>=100){clearInterval(piv);
  buildTunnel();buildLockerRoom();buildTrophyRoom();buildPressRoom();buildNoodleRoom();buildGate();
  setTimeout(()=>{const ld=document.getElementById('loading');ld.style.opacity='0';setTimeout(()=>{ld.style.display='none';animate();
    const ist=getIST();
    if(isBday(ist)){document.getElementById('ht').textContent='The tunnel awaits you, Maggie...';setTimeout(openGate,2000)}
    setTimeout(()=>document.getElementById('ht').style.opacity='0',5500);
  },1500)},350);
}},25);
