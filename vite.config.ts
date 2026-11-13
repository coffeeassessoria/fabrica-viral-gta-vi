import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
  Object.assign(process.env,loadEnv(mode,process.cwd(),''));
  return {
    server:{host:'127.0.0.1',port:4174,strictPort:true,fs:{deny:['.env','.env.*','**/backups/**','**/.private/**','**/node_modules/**/ACESSO*']}},
    plugins:[{name:'fabrica-api',configureServer(server){
      server.middlewares.use(async(req,res,next)=>{
        const path=req.url?.split('?')[0];
        if(path==='/actions'||path==='/api/actions'){const {default:handler}=await server.ssrLoadModule('/server/actions.ts');return handler(req,res);}
        if(path==='/api/oauth-callback'){const {default:handler}=await server.ssrLoadModule('/api/oauth-callback.ts');return handler(req,res);}
        return next();
      });
    }}]
  };
});
