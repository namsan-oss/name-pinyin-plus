import {audioManifest} from './audio-manifest.js';

export function audioKey(numbered){return numbered.toLowerCase().replace(/u:/g,'ü');}
export function audioPlan(items){
 if(!items.length)return {error:'名前を入力してください。'};
 if(items.some(i=>!i.options.length))return {error:'未対応の文字があるため、名前全体を再生できません。'};
 if(items.some(i=>!i.selected))return {error:'赤字の文字の読み・字体を選択すると、発音を聞けます。'};
 const sounds=items.map(i=>({key:audioKey(i.options[i.selected.variant].readings[i.selected.reading].numbered),group:i.group,char:i.char}));
 const missing=sounds.filter(s=>!audioManifest[s.key]);
 if(missing.length)return {error:`音声未対応：${missing.map(s=>s.char).join('・')}。この読みの音声は収録されていません。`};
 return {sounds};
}

// Fetch only bundled audio packs. Neither names nor dictionary choices leave this app.
export class PinyinPlayer{
 constructor(onState){this.onState=onState;this.generation=0;this.sources=[];this.packs=new Map();this.buffers=new Map();}
 stop(){this.generation++;for(const source of this.sources){try{source.stop();}catch{}}this.sources=[];this.onState('idle');}
 async play(sounds){
  this.stop();const generation=this.generation;
  try{
   const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Context)throw new Error('unsupported');
   this.context??=new Context();
   // Resume immediately during the button's user gesture, before fetching audio on iOS.
   await this.context.resume();
   if(generation!==this.generation)return;
   this.onState('loading');
   const buffers=await Promise.all(sounds.map(async sound=>{
    if(this.buffers.has(sound.key))return this.buffers.get(sound.key);
    const [file,offset,length]=audioManifest[sound.key];
    if(!this.packs.has(file))this.packs.set(file,fetch(new URL(file,import.meta.url)).then(response=>{
     if(!response.ok)throw new Error('network');return response.arrayBuffer();
    }).catch(error=>{this.packs.delete(file);throw error;}));
    const pack=await this.packs.get(file);
    const buffer=await this.context.decodeAudioData(pack.slice(offset,offset+length));
    this.buffers.set(sound.key,buffer);return buffer;
   }));
   if(generation!==this.generation)return;
   let when=this.context.currentTime+0.05;
   buffers.forEach((buffer,index)=>{
    if(index&&sounds[index].group!==sounds[index-1].group)when+=0.2;
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);
    this.sources.push(source);source.start(when);when+=buffer.duration;
   });
   this.sources.at(-1).onended=()=>{if(generation===this.generation){this.sources=[];this.onState('idle');}};
   this.onState('playing');
  }catch(error){if(generation===this.generation){this.stop();this.onState('error',error.message==='unsupported'?'このブラウザでは音声再生を利用できません。':'音声を読み込めませんでした。通信を確認して、もう一度お試しください。');}}
 }
}
