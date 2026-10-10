import {convert,tone,initialCapital} from './core.js';
import {audioPlan,PinyinPlayer} from './audio.js';
const $=id=>document.getElementById(id); let items=[];
function el(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function update(){
 player.stop();
 $('result-name').textContent=[0,1].map(group=>items.filter(i=>i.group===group).map(i=>i.options.length?i.options[i.selected?.variant??0].simplified:i.char).join('')).filter(Boolean).join(' ');
 $('pinyin').replaceChildren();
 const groups=[0,1].map(group=>items.filter(i=>i.group===group)).filter(g=>g.length);
 groups.forEach((group,g)=>{
  if(g)$('pinyin').append(document.createTextNode(' / '));
  group.forEach((item,index)=>{
   if(index)$('pinyin').append(document.createTextNode(' '));
   if(!item.options.length){$('pinyin').append(el('span',`${item.char}〔未対応〕`));return;}
   const choice=item.selected||{variant:0,reading:0};
   const pronunciation=tone(item.options[choice.variant].readings[choice.reading].numbered);
   const span=el('span',index===0?initialCapital(pronunciation):pronunciation,item.selected?'':'pending-pinyin');
   if(!item.selected)span.title='仮の読みです。下の候補から選択してください。';
   $('pinyin').append(span);
  });
 });
 const pending=items.filter(i=>i.options.length&&!i.selected), unknown=items.filter(i=>!i.options.length).length;
 const polyphones=pending.some(i=>new Set(i.options.flatMap(v=>v.readings.map(r=>r.numbered))).size>1);
 const variants=pending.some(i=>i.options.length>1);
 $('status').textContent=[polyphones?'赤字になっているピンインは多音字です。意味を参考に選択してください。':'',variants?'字体に複数の候補がある文字も赤字で表示しています。下の候補から選択してください。':'',unknown?`${unknown}文字は未対応です。`:''].filter(Boolean).join(' ');
 refreshAudio();
}

function render(){
 $('cards').replaceChildren();
 items.forEach((item,index)=>{
  const card=el('article',undefined,'card');
  const isPolyphone=new Set(item.options.flatMap(v=>v.readings.map(r=>r.numbered))).size>1;
  const head=el('div',undefined,'card-head');head.append(el('h3',item.char),el('span',!item.options.length?'未対応':item.selected?'選択済み':'選択が必要',item.selected?'badge selected':'badge'));card.append(head);
  if(item.options.some(v=>v.readings.some(r=>r.sourceUrls))){const refs=el('details');refs.append(el('summary','読みの出典'));for(const url of [...new Set(item.options.flatMap(v=>v.readings.flatMap(r=>r.sourceUrls||[])))]){const link=el('a',url.includes('zdic')?'漢典':'中日辞典（コトバンク）');link.href=url;link.target='_blank';link.rel='noreferrer';refs.append(link,el('br'));}card.append(refs);}
  if(!item.options.length){card.append(el('p','この辞書では中国語の読みを確認できません。','unsupported'));}
  else{
   if(item.options.length>1)card.append(el('p','中国語の字体に複数の候補があります。表記と意味を見て選んでください。','hint'));
   item.options.forEach((variant,v)=>{
    const block=el('div',undefined,'variant');
    if(item.options.length>1)block.append(el('p',`字体候補：${variant.traditional} / ${variant.simplified}`,'hint'));
    const multi=item.options.length>1||variant.readings.length>1;
    variant.readings.forEach((reading,r)=>{
     const choice=el(multi?'label':'div',undefined,'choice');
     if(multi){const radio=el('input');radio.type='radio';radio.name=`char-${index}`;radio.checked=item.selected?.variant===v&&item.selected?.reading===r;radio.setAttribute('aria-label',`${item.char}：${tone(reading.numbered)}、${reading.meaning}`);radio.addEventListener('change',()=>{item.selected={variant:v,reading:r};update();head.lastChild.textContent='選択済み';head.lastChild.className='badge selected';});choice.append(radio);}
     const desc=el('div');desc.append(el('strong',tone(reading.numbered),'reading'));
     if(isPolyphone){
      desc.append(el('p',reading.meaning));
      if(reading.translationMethod?.startsWith('Google Translate'))desc.append(el('small','自動翻訳'));
      if(reading.meaningLanguage==='ja'){const source=el('details');source.append(el('summary','英語の原文'),el('p',reading.source.join(' / ')));desc.append(source);}
     }
     const examples=reading.source.flatMap(s=>[...s.matchAll(/([\u3400-\u9fff]+)\[([^\]]+)\]/g)].map(m=>m[1]));
     if(isPolyphone&&examples.length)desc.append(el('small',`辞書の参照・用例：${[...new Set(examples)].slice(0,3).join('・')}`));
     choice.append(desc);block.append(choice);
    });card.append(block);
   });
  }$('cards').append(card);
 });update();
}
$('name-form').addEventListener('submit',event=>{
 event.preventDefault();const surname=$('surname').value,given=$('given').value;
 if(!surname.trim()&&!given.trim()){$('error').textContent='姓または名を入力してください。';$('surname').focus();return;}
 $('error').textContent='';items=convert(surname,given);$('result').hidden=false;$('empty').hidden=true;render();
});
document.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{const [surname,given]=button.dataset.sample.split(',');$('surname').value=surname;$('given').value=given;$('name-form').requestSubmit();}));

let audioState='idle';
function refreshAudio(message){
 const plan=audioPlan(items),busy=audioState==='loading'||audioState==='playing';
 $('play-name').disabled=Boolean(plan.error)||busy;
 $('play-name').textContent=audioState==='loading'?'音声を準備中…':audioState==='playing'?'再生中…':'発音を聞く';
 $('stop-audio').hidden=!busy;
 $('audio-status').textContent=message||plan.error||(busy?(audioState==='loading'?'初回は音声の読み込みに少し時間がかかります。':'選択した読みを再生しています。'):'選択した読みで再生します。');
}
const player=new PinyinPlayer((state,message)=>{audioState=state;refreshAudio(message);});
$('play-name').addEventListener('click',()=>{const plan=audioPlan(items);if(!plan.error)player.play(plan.sounds);});
$('stop-audio').addEventListener('click',()=>player.stop());
window.addEventListener('pagehide',()=>player.stop());
