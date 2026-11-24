(function (root) {
  'use strict';

  const width=240, height=176, cell=40;
  const cast=['kunio','shibata','riki','ichijou','midou','tiger1','tiger2','yama'];
  const elements=['ice','volt','wind','fire'];
  const floor=[111,116,141,116,128];

  function load(name){
    const picture=new Image();
    picture.src='assets/fc-'+name+'.png';
    return picture;
  }
  function ready(image){return image.complete&&image.naturalWidth>0;}
  function position(actor,index){
    return [Math.round(actor.x*width/1280),Math.round(floor[index]+(actor.y-421)/(600-421)*(169-floor[index]))];
  }
  function oval(ctx,x,y,a,b,color){
    ctx.beginPath();
    ctx.ellipse(x,y,a,b,0,0,2*Math.PI);
    ctx.fillStyle=color;
    ctx.fill();
  }
  function pose(actor,time){
    if(actor.hp<=0) return 11;
    const attack=actor.attack;
    if(attack){
      const {kind,wind}=attack.move;
      if(kind==='spin') return Math.floor(attack.time*17)%2?7:8;
      if(kind==='mach') return Math.floor(attack.time*30)%2?5:6;
      if(kind==='kick'||kind==='burst') return attack.time<wind?5:6;
      return attack.time<wind?3:4;
    }
    if(actor.air>0||actor.lift>0) return 7;
    if(actor.moving) return Math.floor(actor.step*1.33)%2?1:2;
    return Math.floor(time*2.9)%2?0:11;
  }

  class Arena {
    constructor(canvas){
      this.c=canvas.getContext('2d',{alpha:false});
      this.c.imageSmoothingEnabled=false;
      this.title=load('title');
      this.sets=Array.from({length:5},(_,i)=>load('stage-'+(i+1)));
      this.fighters=load('fighters');
      this.combos=load('combos');
      this.effects=[];
      this.index=0;
      this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    reset(){this.effects=[];}
    react(type,actor,move){
      if(type!=='strike'&&type!=='hit')return;
      if(type==='strike'&&!move.ultimate)return;
      const [x,y]=position(actor,this.index);
      this.effects.push({x,y,kind:move.kind,color:move.color,
        age:0,duration:type==='hit'?.21:.78,type});
    }
    update(dt){
      this.effects=this.effects.filter(effect=>(effect.age+=dt)<effect.duration);
    }
    fighter(actor,time,index){
      if(!ready(this.fighters)) return;
      const ctx=this.c,[x,y]=position(actor,index);
      const row=Math.max(0,cast.indexOf(actor.palette));
      const up=Math.round((actor.air>0?Math.sin(actor.air/.59*Math.PI)*19:0)+
        (actor.lift>0?Math.sin(actor.lift/.62*Math.PI)*15:0));
      oval(ctx,x,y,7,2,'#111113a8');
      ctx.save();
      ctx.translate(x,y-up);
      if(actor.hp<=0){ctx.translate(-6,-3);ctx.rotate(-Math.PI/2);}
      else ctx.scale(actor.face,1);
      if(actor.flash>0&&!this.reduce&&Math.floor(actor.flash*50)%2===1)ctx.globalAlpha=.42;
      ctx.drawImage(this.fighters,pose(actor,time)*cell,row*cell,cell,cell,-16,-36,cell,cell);
      ctx.restore();
      if(actor.frozen){
        ctx.strokeStyle='#87eaff';ctx.globalAlpha=.88;
        ctx.strokeRect(x-9,y-up-27,18,26);
        ctx.fillStyle='#ebfcff';
        ctx.fillRect(x-7,y-up-24,2,5);
        ctx.globalAlpha=1;
      }
    }
    effect(event){
      const ctx=this.c,phase=event.age/event.duration;
      if(event.type==='strike'&&ready(this.combos)){
        const row=elements.indexOf(event.kind);
        if(row<0)return;
        const column=Math.floor(event.age*13)%4;
        ctx.drawImage(this.combos,column*32,row*32,32,32,event.x-16,event.y-33,32,32);
      }else if(event.type==='hit'){
        const x=event.x,y=event.y-15;
        ctx.globalAlpha=1-phase;
        ctx.fillStyle=event.color;
        ctx.fillRect(x-6,y,13,2);
        ctx.fillRect(x,y-6,2,13);
        ctx.fillStyle='#fff';
        ctx.fillRect(x-1,y-1,4,4);
        ctx.globalAlpha=1;
      }
    }
    draw(game,time,opening=false){
      const ctx=this.c;
      ctx.fillStyle='#08070c';
      ctx.fillRect(0,0,width,height);
      if(opening){
        if(ready(this.title))ctx.drawImage(this.title,0,0,width,height,0,0,width,height);
        return;
      }
      this.index=game.index;
      const stage=this.sets[game.index];
      if(ready(stage))ctx.drawImage(stage,0,0);
      const roster=[game.player,...game.enemies].sort((a,b)=>a.y-b.y);
      for(const actor of roster){
        if(actor.attack?.move.ultimate){
          const sign=actor.face, offset=76+Math.sin(actor.attack.time/actor.attack.move.duration*Math.PI)*40;
          ctx.globalAlpha=.66;
          this.fighter({...actor,x:actor.x+sign*offset,face:-sign,palette:'riki'},time,game.index);
          ctx.globalAlpha=1;
        }
        this.fighter(actor,time,game.index);
      }
      for(const effect of this.effects)this.effect(effect);
    }
  }

  root.Arena=Arena;
})(globalThis);
