import{r as d,u as b,j as r,a as w}from"./index-Iu6nNFYR.js";import{u as P,i as H}from"./useAtOrAboveBreakpoint-BeRcsZzo.js";const A="_blink_12c5a_2",C={blink:A};function R(t,n){let e=0;for(;e<t.length&&e<n.length&&t[e]===n[e];)e++;return e}function M(t,n){if(n>=t.length)return n;const e=t.slice(n);return/^[\n\s]+$/.test(e)?t.length:n}const N=({phrases:t,period:n=2e3,typingSpeed:e,deletingSpeed:h,loop:u=!0,preserveTrailingNewlines:x=!1})=>{const[i,g]=d.useState("typing"),[I,v]=d.useState(0),[a,p]=d.useState(0),{linkColor:S}=b();d.useEffect(()=>{g("typing"),v(0),p(0)},[t]);const y=!u&&I===t.length-1,l=t[I]??"",T=y?"":t[(I+1)%t.length];let f=R(l,T);x&&(f=M(l,f)),d.useEffect(()=>{if(i==="typing")if(a<l.length){const s=l[a];let o=e;(s==="."||s===`
`)&&(o*=2);const c=setTimeout(()=>{p(m=>m+1)},o);return()=>clearTimeout(c)}else{const s=setTimeout(()=>{g("pause")},n);return()=>clearTimeout(s)}else if(i==="pause"){if(y)return;g("deleting")}else if(i==="deleting")if(a>f){const s=l[a-1];let o=h;(s==="."||s===`
`)&&(o*=2);const c=setTimeout(()=>{p(m=>m-1)},o);return()=>clearTimeout(c)}else v(s=>u?(s+1)%t.length:s+1),g("typing")},[i,a,l,f,n,e,h,I,T,y,u,t.length]);const j=l.slice(0,a);function k(s){return s.split(`
`).map((o,c,m)=>r.jsxs("span",{children:[o,c<m.length-1&&r.jsx("br",{})]},c))}return r.jsxs("div",{children:[k(j),r.jsx("span",{className:`border-r-[2.5px] solid ml-[1.8px] ${C.blink}`,style:{borderColor:S}})]})},_=()=>{const{theme:t,setTheme:n}=w(),e=P("xl"),{setRandomColor:h}=b(),u=()=>{h(t==="light"?"dark":"light"),n(t==="light"?"dark":"light")},x=["Hey, I'm Spencer!","I'm a PM at Thomson Reuters","I build AI for lawyers","I build AI for journalists","I love coding + design","I love history","I love storytelling"],i=[`Hey, I'm Spencer!

`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters.`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers...and sometimes journalists :)`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.

 I love coding + design.`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.

 I love coding + design. I'm passionate about history, storytelling, photography and tech.

`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.

 I love coding + design. I'm passionate about history, storytelling, photography and tech.

 I'm based in Brooklyn, NY`];return r.jsxs("div",{className:"xl:font-light xl:flex-row xl:gap-10 w-full flex flex-col justify-center items-center gap-8 xl:items-start px-6",children:[r.jsx(H,{className:`
          relative
          hover:cursor-pointer 
          transition-transform
          duration-300
          ease-in-out
          hover:scale-105
          active:scale-95
          xl:w-72
          sm:w-60
          w-52
        `,src:"/images/strelsov-headshot.png",alt:"Spencer Strelsov Headshot",isBlurred:!0,onClick:u}),r.jsx("div",{className:"flex-1 text-left text-2xl sm:text-3xl leading-relaxed xl:max-w-[30rem] xl:max-h-[25rem] xl:content-start",children:r.jsx(N,{typingSpeed:e?70:110,period:e?1e3:void 0,deletingSpeed:e?50:70,phrases:e?i:x,loop:!e,preserveTrailingNewlines:!!e})})]})};export{_ as default};
