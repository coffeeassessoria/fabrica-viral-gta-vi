export class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
export async function api<T=any>(action:string,args:unknown={}):Promise<T>{
  const response=await fetch('/api/actions',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action,args}),signal:AbortSignal.timeout(55000)});
  let result;try{result=await response.json();}catch{throw new ApiError(response.status,'O servidor não respondeu. Seu rascunho foi mantido.');}
  if(!response.ok||result.error){if(response.status===401&&action!=='auth.login'&&action!=='auth.session')window.dispatchEvent(new Event('fv:session-expired'));throw new ApiError(response.status,result.error||'Não foi possível concluir a operação.');}
  return result.data;
}
