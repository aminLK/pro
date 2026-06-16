const fs=require("fs");
const S="/home/user/pro/site";
const rd=p=>fs.readFileSync(S+"/"+p,"utf8");
const b64=p=>fs.readFileSync(S+"/"+p).toString("base64");
const dataURI=p=>"data:image/svg+xml;base64,"+b64(p);

// remplacement IMMUNISÉ contre les motifs $$ / $& (utilise une fonction)
const inject=(html,needle,content)=>html.replace(needle,()=>content);

// --- images en data-URI ---
const slugs=["citadine","berline","suv","sport","luxe","electrique"];
const CARIMG={}; slugs.forEach(s=>CARIMG[s]=dataURI("assets/car-"+s+".svg"));
const HERO=dataURI("assets/hero.svg");

// --- CSS landing : remplacer les url(../assets/..) ---
let styleCss=rd("css/style.css");
styleCss=inject(styleCss,'url("../assets/hero.svg")',`url("${HERO}")`);
styleCss=inject(styleCss,'url("../assets/car-luxe.svg")',`url("${CARIMG.luxe}")`);

// --- data.js : images locales -> data-URI ---
let dataJs=rd("js/data.js");
dataJs=inject(dataJs,'c.img = "assets/car-" + (slug[c.category] || "berline") + ".svg";',
  'c.img = __CARIMG[slug[c.category] || "berline"];');
dataJs="var __CARIMG="+JSON.stringify(CARIMG)+";\n"+dataJs;

// =================== Document LANDING autonome ===================
let landing=rd("index.html");
landing=inject(landing,'<link rel="stylesheet" href="css/style.css" />',`<style>\n${styleCss}\n</style>`);
landing=inject(landing,'<a href="app/login.html" class="nav__link">Espace Pro</a>',
  '<a href="#" class="nav__link" onclick="parent.showCockpit();return false;">Espace Pro</a>');
landing=inject(landing,'<script src="js/data.js"></script>',`<script>\n${dataJs}\n</script>`);
landing=inject(landing,'<script src="js/app.js"></script>',`<script>\n${rd("js/app.js")}\n</script>`);

// =================== Document COCKPIT autonome ===================
let cockpit=rd("app/index.html");
cockpit=inject(cockpit,'<link rel="stylesheet" href="css/dashboard.css" />',`<style>\n${rd("app/css/dashboard.css")}\n</style>`);
cockpit=cockpit.replace(/href="\.\.\/index\.html"/g,'href="#" onclick="parent.showLanding();return false;"');
cockpit=inject(cockpit,'<script src="js/charts.js"></script>',
  `<script>try{sessionStorage.setItem('velorah_auth','1')}catch(e){}</script>\n<script>\n${rd("app/js/charts.js")}\n</script>`);
cockpit=inject(cockpit,'<script src="js/match.js"></script>',`<script>\n${rd("app/js/match.js")}\n</script>`);
cockpit=inject(cockpit,'<script src="js/dashboard-data.js"></script>',`<script>\n${rd("app/js/dashboard-data.js")}\n</script>`);
cockpit=inject(cockpit,'<script src="js/dashboard.js"></script>',`<script>\n${rd("app/js/dashboard.js")}\n</script>`);

// =================== Fichier unique parent ===================
const enc=s=>JSON.stringify(s).split("</script>").join("<\\/script>");
const out=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Fleet Navira — application</title>
<style>html,body{margin:0;height:100%;background:#0a0c11}iframe{border:0;position:fixed;inset:0;width:100%;height:100%;display:none}iframe.on{display:block}</style>
</head><body>
<iframe id="lf" class="on" title="Site"></iframe>
<iframe id="cf" title="Cockpit"></iframe>
<script>
var LANDING=${enc(landing)};
var COCKPIT=${enc(cockpit)};
var lf=document.getElementById('lf'), cf=document.getElementById('cf'), cockpitLoaded=false;
lf.srcdoc=LANDING;
window.showCockpit=function(){ if(!cockpitLoaded){cf.srcdoc=COCKPIT;cockpitLoaded=true;} lf.classList.remove('on'); cf.classList.add('on'); };
window.showLanding=function(){ cf.classList.remove('on'); lf.classList.add('on'); };
</script></body></html>`;

fs.writeFileSync("/tmp/fleet-navira.html",out);
fs.writeFileSync("/tmp/landing.html",landing);
fs.writeFileSync("/tmp/cockpit.html",cockpit);
console.log("OK — fleet-navira.html:",(out.length/1024).toFixed(0)+" Ko");
