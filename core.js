import {dictionary} from './data.js';
export function tone(value){
 return value.replace(/([a-zü:]+)([1-5])/g,(_,raw,n)=>{
  let s=raw.replace(/u:/g,'ü'),i=s.indexOf('a');
  if(i<0)i=s.indexOf('e'); if(i<0&&s.includes('ou'))i=s.indexOf('o');
  if(i<0){for(let j=s.length-1;j>=0;j--)if('iouü'.includes(s[j])){i=j;break;}}
  if(n==='5')return s;
  const marks={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',ü:'ǖǘǚǜ'};
  return i>=0?s.slice(0,i)+marks[s[i]][Number(n)-1]+s.slice(i+1):s;
 });
}
export function convert(surname,given){
 return [surname,given].flatMap((part,group)=>Array.from(part.trim().replace(/\s/g,'')).map(char=>{
  const options=dictionary[char]||[];
  return {char,group,options,selected:options.length===1&&options[0].readings.length===1?{variant:0,reading:0}:null};
 }));
}
export function summary(items){
 return [0,1].map(group=>items.filter(i=>i.group===group).map(i=>{
  if(!i.options.length)return `${i.char}〔未対応〕`;
  const choice=i.selected||{variant:0,reading:0};
  return tone(i.options[choice.variant].readings[choice.reading].numbered);
 }).join(' ')).filter(Boolean).join(' / ');
}

export function initialCapital(value){return value.charAt(0).toUpperCase()+value.slice(1);}
