'use strict';

const {Campaign, stages, moves, ultimates} = Fighting;
const byId = id => document.getElementById(id);
const shell=byId('game-shell');
const arena=new Arena(byId('arena'));
const panels = {
  home:byId('home-view'), skills:byId('skill-view'), levels:byId('level-view'),
  result:byId('result-view'), pause:byId('pause-view')
};
const keyboardMoves = {KeyJ:'punch',KeyK:'kick',KeyU:'dash',KeyI:'dragon',KeyO:'flame',KeyL:'ultimate',Space:'jump'};
const directionKeys = new Set(['KeyA','KeyD','KeyW','KeyS','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
const held = new Set(), pointers = new Map();
const moveButtons = [...document.querySelectorAll('[data-move]')];
const stick=byId('stick'), knob=byId('stick-knob');
let stickId=null, ax=0, ay=0, view='home', stage=0, chosen='ice', game=new Campaign(0), queued=null;
let intro=0, special=0, finishing=0, elapsed=0, last=0, rotateDismissed=false;
let unlock=readUnlock(), audio=null, muted=false;
const maxStage=stages.length-1;

function readUnlock(){
  try {
    const value=Number(localStorage.getItem('nekketsu-unlocked'));
    return Number.isInteger(value) ? Math.min(stages.length-1,Math.max(0,value)) : 0;
  } catch { return 0; }
}
function markProgress(index){
  if(index<=unlock) return;
  unlock=index;
  try { localStorage.setItem('nekketsu-unlocked',String(index)); } catch { /* Progress still works for this session. */ }
}
function make(tag,text,cls){
  const node=document.createElement(tag);
  if(text) node.textContent=text;
  if(cls) node.className=cls;
  return node;
}
stages.forEach(({name},index)=>{
  const stop=make('span');
  stop.append(make('b',String(index+1).padStart(2,'0')),document.createTextNode(name));
  byId('route').append(stop);
});

function skillOptions(){
  byId('skill-grid').replaceChildren(...Object.entries(ultimates).map(([id,move])=>{
    const button=make('button','','option');
    button.type='button';
    button.dataset.skill=id;
    button.style.setProperty('--power',move.color);
    button.setAttribute('aria-pressed',String(chosen===id));
    button.append(make('span',move.glyph,'glyph'),make('b',move.label),make('small',move.description));
    button.onclick=()=>{
      chosen=id;
      for(const option of byId('skill-grid').children) option.setAttribute('aria-pressed',String(option===button));
      sound('select');
    };
    return button;
  }));
}
function levels(){
  byId('level-grid').replaceChildren(...stages.map(({name,roster},index)=>{
    const button=make('button','','option');
    button.disabled=index>unlock;
    button.append(make('span','第 '+(index+1)+' 关','stage-id'),make('b',name),make('small',button.disabled?'未解锁':roster.length+' 名对手'));
    button.onclick=()=>chooseStage(index);
    return button;
  }));
  setView('levels');
}
function chooseStage(index){
  stage=index;
  byId('fight').firstChild.textContent='进入第 '+(stage+1)+' 关 ';
  skillOptions();
  setView('skills');
}
function setView(next){
  clearInput();
  view=next;
  for(const [key,panel] of Object.entries(panels)) panel.hidden=key!==view;
  byId('battle-ui').hidden=!['play','pause','result'].includes(view);
  byId('touch-controls').hidden=view!=='play';
  byId('pause').hidden=view!=='play';
  mobileHint();
}
function start(){
  arena.reset();
  game=new Campaign(stage,combatEvent,chosen);
  intro=.85;
  special=0;
  finishing=0;
  const button=moveButtons.find(b=>b.dataset.move==='ultimate');
  byId('ultimate-name').textContent=game.ultimate.label;
  button.querySelector('strong').textContent=game.ultimate.glyph;
  button.style.setProperty('--power',game.ultimate.color);
  byId('stage-num').textContent='第 '+(stage+1)+' / '+stages.length+' 关';
  byId('stage-name').textContent=game.stage.name;
  updateHUD();
  setView('play');
  sound('start');
}
function end(){
  const win=game.result==='victory', final=win&&stage===maxStage;
  if(win) markProgress(Math.min(maxStage,stage+1));
  byId('result-caption').textContent='第 '+(stage+1)+' 关　'+game.stage.name;
  byId('result-title').textContent=final?'五关全胜':win?'挑战成功':'挑战失败';
  byId('result-note').textContent=final?'金虎与银虎已落败。':win?'下一关已解锁。':'再试一次，看到敌人蓄力时可以上下走位。';
  byId('result-action').textContent=final?'重闯五关':win?'挑战下一关':'再试一次';
  byId('result-action').onclick=()=>{
    if(final){ chooseStage(0); return; }
    if(win) stage++;
    start();
  };
  sound(win?'clear':'loss');
  setView('result');
}
function combatEvent(type,actor,move){
  arena.react(type,actor,move);
  if(type==='attack'&&move.ultimate) special=1.07;
  if(type==='strike'||type==='hit') sound(type,move);
}
function updateHUD(){
  const player=game.player, enemies=game.enemies;
  const count=enemies.filter(e=>e.hp>0).length;
  const enemyHP=enemies.reduce((sum,e)=>sum+e.hp,0);
  const enemyMax=enemies.reduce((sum,e)=>sum+e.maxHp,0);
  byId('player-life').textContent=player.hp+'/'+player.maxHp;
  byId('player-meter').style.transform='scaleX('+player.hp/player.maxHp+')';
  byId('enemy-meter').style.transform='scaleX('+enemyHP/enemyMax+')';
  byId('enemy-name').textContent=stage===maxStage?'虎面兄弟':enemies.length===1?enemies[0].name:'对手';
  byId('enemy-life').textContent=count+' / '+enemies.length;
  byId('combo').hidden=game.comboTime<=0||game.combo<2;
  byId('combo-number').textContent=game.combo;
  const message=game.result==='victory'?'':intro>0?game.stage.name:special>0?game.ultimate.label:'';
  if(byId('announcement').textContent!==message) byId('announcement').textContent=message;
  for(const button of moveButtons){
    const key=button.dataset.move;
    const remaining=player.cooldown[key]||0;
    const waiting=remaining>.15 && key!=='punch' && key!=='kick';
    button.classList.toggle('waiting',waiting);
    button.classList.toggle('pressed',Array.from(pointers.values()).includes(key));
    const label=key==='ultimate'?game.ultimate.label:key==='jump'?'跳跃':moves[key].label;
    const seconds=waiting ? Math.ceil(remaining) : '';
    const text=String(seconds);
    const countdown=button.querySelector('.countdown');
    if(countdown.textContent!==text) countdown.textContent=text;
    const aria=waiting ? label+'，冷却 '+text+' 秒' : label;
    if(button.getAttribute('aria-label')!==aria) button.setAttribute('aria-label',aria);
  }
}
function sound(type,move){
  if(!audio||muted||audio.state!=='running')return;
  const now=audio.currentTime;
  const notes=type==='clear'?[392,523,659]:type==='loss'?[233,164,98]:type==='start'?[196,294,440]:
    type==='select'?[510]:move?.ultimate?[124,247,538]:type==='hit'?[104]:[move?.kind==='mach'?430:194];
  notes.forEach((freq,i)=>{
    const time=now+i*.079, end=time+.14, oscillator=audio.createOscillator(), amp=audio.createGain();
    oscillator.type=type==='hit'?'triangle':type==='strike'?'square':'triangle';
    oscillator.frequency.setValueAtTime(freq,time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45,freq*(type==='clear'?1.08:.52)),end);
    amp.gain.setValueAtTime(0,time);
    amp.gain.linearRampToValueAtTime(type==='strike'?.046:.082,time+.017);
    amp.gain.exponentialRampToValueAtTime(.0001,end);
    oscillator.connect(amp).connect(audio.destination);
    oscillator.start(time);oscillator.stop(end+.01);
  });
}
function enableAudio(){
  try{
    if(!audio){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(Audio) audio=new Audio();
    }
    if(audio?.state==='suspended')audio.resume().catch(()=>{});
  } catch { /* Audio is optional on this browser. */ }
}
shell.addEventListener('pointerdown',enableAudio,{capture:true});
byId('sound').onclick=()=>{
  enableAudio();muted=!muted;
  byId('sound').setAttribute('aria-pressed',String(muted));
  byId('sound').setAttribute('aria-label',muted?'开启声音':'静音');
};
byId('full').onclick=async()=>{
  if(document.fullscreenElement){ await document.exitFullscreen();return; }
  try{
    await shell.requestFullscreen();
    try{await screen.orientation.lock('landscape');}catch{ /* Manual rotation also works. */ }
  }catch{
    if(matchMedia('(orientation: portrait)').matches){rotateDismissed=false;byId('rotate-tip').hidden=false;}
  }
};
byId('choose').onclick=()=>chooseStage(0);
byId('levels-btn').onclick=levels;
byId('fight').onclick=start;
byId('pause').onclick=()=>setView('pause');
byId('resume').onclick=()=>setView('play');
document.querySelectorAll('[data-home]').forEach(button=>button.onclick=()=>setView('home'));
function mobileHint(){
  byId('rotate-tip').hidden=rotateDismissed||!matchMedia('(orientation: portrait) and (pointer: coarse)').matches||view!=='play';
}
byId('dismiss-rotate').onclick=()=>{rotateDismissed=true;mobileHint();};
window.addEventListener('resize',mobileHint);

function releaseStick(){
  stickId=null;ax=0;ay=0;knob.style.transform='';
}
function clearInput(){held.clear();pointers.clear();queued=null;releaseStick();}
function updateStick(e){
  const bounds=stick.getBoundingClientRect();
  const range=bounds.width*.37;
  const x=e.clientX-bounds.left-bounds.width/2, y=e.clientY-bounds.top-bounds.height/2;
  const radius=Math.max(range,Math.hypot(x,y));
  ax=x/radius;ay=y/radius;
  if(Math.hypot(ax,ay)<.14){ax=0;ay=0;}
  knob.style.transform='translate('+ax*range+'px,'+ay*range+'px)';
}
stick.onpointerdown=e=>{
  if(stickId!==null) return;
  stickId=e.pointerId;
  stick.setPointerCapture(e.pointerId);
  updateStick(e);
};
stick.onpointermove=e=>{if(e.pointerId===stickId)updateStick(e);};
stick.onlostpointercapture=e=>{if(e.pointerId===stickId)releaseStick();};
function requestMove(key){
  if(view!=='play'||intro>0||game.result)return;
  if(game.use(key)) {queued=null;return;}
  if(!(game.player.cooldown[key]>.20))queued={key,t:.22};
}
for(const button of moveButtons){
  const move=button.dataset.move;
  button.onpointerdown=e=>{
    if(e.button!==0)return;
    e.preventDefault();
    button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,move);
    requestMove(move);
  };
  button.onlostpointercapture=e=>pointers.delete(e.pointerId);
  button.onclick=e=>{if(e.detail===0)requestMove(move);};
}
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){
    if(view==='play')setView('pause');
    else if(view==='pause')setView('play');
    return;
  }
  if(view==='play'&&(keyboardMoves[e.code]||directionKeys.has(e.code))){
    e.preventDefault();
    held.add(e.code);
    if(!e.repeat&&keyboardMoves[e.code]){enableAudio();requestMove(keyboardMoves[e.code]);}
  }
});
document.addEventListener('keyup',e=>held.delete(e.code));
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&view==='play')setView('pause');});

function tick(time){
  const dt=last?Math.min(.035,(time-last)/1000):0;
  last=time;
  if(view!=='pause')elapsed+=dt;
  if(view==='play'){
    intro=Math.max(0,intro-dt);
    special=Math.max(0,special-dt);
    if(!intro&&!game.result){
      const x=ax+Number(held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('KeyA')||held.has('ArrowLeft'));
      const y=ay+Number(held.has('KeyS')||held.has('ArrowDown'))-Number(held.has('KeyW')||held.has('ArrowUp'));
      if(queued&&((queued.t-=dt)<=0||game.use(queued.key)))queued=null;
      const punch=held.has('KeyJ')||Array.from(pointers.values()).includes('punch');
      const kick=held.has('KeyK')||Array.from(pointers.values()).includes('kick');
      if(!queued){
        if(punch)game.use('punch');
        else if(kick)game.use('kick');
      }
      game.tick(dt,x,y);
    }
    updateHUD();
    if(game.result){
      finishing+=dt;
      if(finishing>=.72) end();
    }
  }
  if(view!=='pause')arena.update(dt);
  arena.draw(game,elapsed,!['play','pause','result'].includes(view));
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
