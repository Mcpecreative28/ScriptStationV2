export type Resource={id:string;title:string;desc:string;category:string;language:string;author:string;rating:number;downloads:string;tags:string[];kind:'Script'|'Snippet'|'Baileys'};
export const resources:Resource[]=[
{id:'1',title:'WhatsApp Auto Responder',desc:'Modular Baileys responder dengan command handler yang mudah dikembangkan.',category:'WhatsApp',language:'TypeScript',author:'RyogaDev',rating:4.9,downloads:'12.8K',tags:['baileys','bot','automation'],kind:'Baileys'},
{id:'2',title:'Modern Express API Starter',desc:'Starter API Node.js dengan validation, auth middleware dan struktur production-ready.',category:'API',language:'TypeScript',author:'ArkaLabs',rating:4.8,downloads:'8.4K',tags:['node','api','backend'],kind:'Script'},
{id:'3',title:'Firebase Rate Limiter',desc:'Snippet sederhana untuk membatasi aksi user dan mengurangi abuse.',category:'Backend',language:'TypeScript',author:'Nexa',rating:4.7,downloads:'6.2K',tags:['firebase','security','rate-limit'],kind:'Snippet'},
{id:'4',title:'Telegram Broadcast Tool',desc:'Utility untuk mengelola broadcast dan template pesan Telegram.',category:'Telegram',language:'Python',author:'CodeForge',rating:4.6,downloads:'5.9K',tags:['telegram','python','utility'],kind:'Script'},
{id:'5',title:'Glass Dashboard UI',desc:'Komponen dashboard glassmorphism yang responsif dan ringan.',category:'Frontend',language:'React',author:'PixelStack',rating:5,downloads:'4.1K',tags:['react','ui','tailwind'],kind:'Snippet'},
{id:'6',title:'Baileys Session Manager',desc:'Contoh pengelolaan session Baileys tanpa menaruh credential di client.',category:'Baileys',language:'JavaScript',author:'DevRoom',rating:4.9,downloads:'3.8K',tags:['baileys','whatsapp','auth'],kind:'Baileys'}
];
  
