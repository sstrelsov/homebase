import{j as r,r as c}from"./index-7zqVQZSl.js";import{C as k,a as P,i as A,u as C}from"./client-only-DUAw1VFs.js";import{b as R,d as b,u as H,s as N}from"./hooks-CiuIyPzu.js";import"./chunk-UWE6H66T-NhxQk7i9.js";import"./index-D5O5zLCk.js";const M=()=>{const e=R(),{theme:t,setTheme:n}=P();c.useEffect(()=>{e(b(t))},[]);const u=()=>{e(b(t==="light"?"dark":"light")),n(t==="light"?"dark":"light")};return r.jsx(A,{className:`
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
        `,src:"/images/strelsov-headshot.png",alt:"Spencer Strelsov Headshot",isBlurred:!0,onClick:u})},E=()=>r.jsx(k,{fallback:r.jsx("div",{children:"Loading..."}),children:()=>r.jsx(M,{})}),B="_blink_18wdy_2",_={blink:B};function D(e,t){let n=0;for(;n<e.length&&n<t.length&&e[n]===t[n];)n++;return n}function L(e,t){if(t>=e.length)return t;const n=e.slice(t);return/^[\n\s]+$/.test(n)?e.length:t}const W=({phrases:e,period:t=2e3,typingSpeed:n,deletingSpeed:u,loop:f=!0,preserveTrailingNewlines:j=!1})=>{const[d,h]=c.useState("typing"),[p,y]=c.useState(0),[l,g]=c.useState(0),v=H(N);c.useEffect(()=>{h("typing"),y(0),g(0)},[e]);const I=!f&&p===e.length-1,o=e[p]??"",T=I?"":e[(p+1)%e.length];let x=D(o,T);j&&(x=L(o,x)),c.useEffect(()=>{if(d==="typing")if(l<o.length){const s=o[l];let i=n;(s==="."||s===`
`)&&(i*=2);const a=setTimeout(()=>{g(m=>m+1)},i);return()=>clearTimeout(a)}else{const s=setTimeout(()=>{h("pause")},t);return()=>clearTimeout(s)}else if(d==="pause"){if(I)return;h("deleting")}else if(d==="deleting")if(l>x){const s=o[l-1];let i=u;(s==="."||s===`
`)&&(i*=2);const a=setTimeout(()=>{g(m=>m-1)},i);return()=>clearTimeout(a)}else y(s=>f?(s+1)%e.length:s+1),h("typing")},[d,l,o,x,t,n,u,p,T,I,f,e.length]);const S=o.slice(0,l);function w(s){return s.split(`
`).map((i,a,m)=>r.jsxs("span",{children:[i,a<m.length-1&&r.jsx("br",{})]},a))}return r.jsxs("div",{children:[w(S),r.jsx("span",{className:`border-r-[2.5px] solid ml-[1.8px] ${_.blink}`,style:v?{borderColor:v}:void 0})]})},F=()=>[{title:"New Remix App"},{name:"description",content:"Welcome to Remix!"}],G=()=>{const e=C("xl"),t=["Hey, I'm Spencer!","I'm a PM at Thomson Reuters","I build AI for lawyers","I build AI for journalists","I love coding + design","I love history","I love storytelling"],n=[`Hey, I'm Spencer!

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

 I'm based in Brooklyn, NY`];return r.jsxs("div",{className:"xl:font-light xl:flex-row xl:gap-10 w-full flex flex-col justify-center items-center gap-8 xl:items-start px-6",children:[r.jsx(E,{}),r.jsx("div",{className:"flex-1 text-left text-2xl sm:text-3xl leading-relaxed xl:max-w-[30rem] xl:max-h-[25rem] xl:content-start",children:r.jsx(W,{typingSpeed:e?70:110,period:e?1e3:void 0,deletingSpeed:e?50:70,phrases:e?n:t,loop:!e,preserveTrailingNewlines:!!e})})]})};export{G as default,F as meta};
