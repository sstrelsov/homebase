import{r}from"./index-BZnoGRV9.js";const a={xs:320,sm:640,md:768,lg:1024,xl:1280,"2xl":1536},u=t=>{const[i,o]=r.useState(!1);return r.useEffect(()=>{function e(){const s=window.innerWidth>=a[t];o(n=>n!==s?s:n)}return window.addEventListener("resize",e),e(),()=>window.removeEventListener("resize",e)},[t]),i};export{u};
