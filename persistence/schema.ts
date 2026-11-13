import {validateProduction,type ProductionItem} from './production.js';
export type DayPlan = { dia:string; data:string; hora:string; status:'Pendente'|'Pronto'|'Postado'; titulo:string };
export type Metric = { video:string; views:string; retencao:string; comentarios:string; seguidores:string };
export type Workspace = {checklist:boolean[]; rodarChecklist:boolean[]; calendar:DayPlan[]; metrics:Metric[]; regra:string; production?:ProductionItem[]};
export const collections = ['fabrica_checklist','fabrica_calendario','fabrica_metricas','fabrica_rodar'] as const;
export function validateWorkspace(input:unknown): Workspace {
  const value=input as Workspace;
  const text=(v:unknown,max=3000)=>typeof v==='string' && v.length<=max;
  if(!value || typeof value!=='object' || !Array.isArray(value.checklist) || value.checklist.length!==5 || value.checklist.some(v=>typeof v!=='boolean') || !Array.isArray(value.rodarChecklist) || value.rodarChecklist.length!==6 || value.rodarChecklist.some(v=>typeof v!=='boolean')) throw new Error('Checklist inválido.');
  if(!Array.isArray(value.calendar) || value.calendar.length<1 || value.calendar.length>366 || value.calendar.some(d=>!d || !text(d.dia,40) || !text(d.data,100) || !['12h','18h','21h'].includes(d.hora) || !['Pendente','Pronto','Postado'].includes(d.status) || !text(d.titulo))) throw new Error('Calendário inválido.');
  if(!Array.isArray(value.metrics) || value.metrics.length>500 || value.metrics.some(m=>!m || !['video','views','retencao','comentarios','seguidores'].every(k=>text(m[k as keyof Metric],k==='video'?3000:100))) || !text(value.regra,12000)) throw new Error('Métricas inválidas.');
  return {checklist:[...value.checklist],rodarChecklist:[...value.rodarChecklist],calendar:value.calendar.map(d=>({dia:d.dia,data:d.data,hora:d.hora,status:d.status,titulo:d.titulo})),metrics:value.metrics.map(m=>({video:m.video,views:m.views,retencao:m.retencao,comentarios:m.comentarios,seguidores:m.seguidores})),regra:value.regra,...(Object.prototype.hasOwnProperty.call(value,'production')?{production:validateProduction(value.production)}:{})};
}
export function toRecords(state:Workspace){return {fabrica_checklist:{items:state.checklist},fabrica_calendario:{days:state.calendar},fabrica_metricas:{rows:state.metrics,regra:state.regra},fabrica_rodar:{items:state.rodarChecklist}};}
