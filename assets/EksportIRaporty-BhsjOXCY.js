import{g as Ct,r as A,j as o}from"./vendor-react-M1a6ECPm.js";import{e as zt,c as Et,d as re,a as St,b as Bt,f as Pt,g as Rt}from"./excelExportService-CFgDQ2R9.js";import{Z as It,b as q}from"./index-BaL5OpfX.js";import At from"./MobilePlanViewer-BZy2vMtl.js";import{l as Tt,Q as De,aJ as Mt,a3 as qe,D as V,af as Ue,ae as $e,J as Fe,S as Lt,d as _t,aa as Dt,Y as qt,j as Ut,aK as $t,o as Ft,aC as Kt,X as Qt}from"./vendor-lucide-BgIFb2YX.js";import"./workloadUtils-KEmcNRDe.js";import"./vendor-zod-C-knLqhL.js";import"./vendor-motion-7o_NUGSZ.js";var X={},ce,Ke;function Ot(){return Ke||(Ke=1,ce=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then}),ce}var de={},Q={},Qe;function H(){if(Qe)return Q;Qe=1;let r;const s=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];return Q.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return t*4+17},Q.getSymbolTotalCodewords=function(t){return s[t]},Q.getBCHDigit=function(i){let t=0;for(;i!==0;)t++,i>>>=1;return t},Q.setToSJISFunction=function(t){if(typeof t!="function")throw new Error('"toSJISFunc" is not a valid function.');r=t},Q.isKanjiModeEnabled=function(){return typeof r<"u"},Q.toSJIS=function(t){return r(t)},Q}var ue={},Oe;function Ie(){return Oe||(Oe=1,(function(r){r.L={bit:1},r.M={bit:0},r.Q={bit:3},r.H={bit:2};function s(i){if(typeof i!="string")throw new Error("Param is not a string");switch(i.toLowerCase()){case"l":case"low":return r.L;case"m":case"medium":return r.M;case"q":case"quartile":return r.Q;case"h":case"high":return r.H;default:throw new Error("Unknown EC Level: "+i)}}r.isValid=function(t){return t&&typeof t.bit<"u"&&t.bit>=0&&t.bit<4},r.from=function(t,e){if(r.isValid(t))return t;try{return s(t)}catch{return e}}})(ue)),ue}var fe,Ve;function Vt(){if(Ve)return fe;Ve=1;function r(){this.buffer=[],this.length=0}return r.prototype={get:function(s){const i=Math.floor(s/8);return(this.buffer[i]>>>7-s%8&1)===1},put:function(s,i){for(let t=0;t<i;t++)this.putBit((s>>>i-t-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(s){const i=Math.floor(this.length/8);this.buffer.length<=i&&this.buffer.push(0),s&&(this.buffer[i]|=128>>>this.length%8),this.length++}},fe=r,fe}var ge,He;function Ht(){if(He)return ge;He=1;function r(s){if(!s||s<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=s,this.data=new Uint8Array(s*s),this.reservedBit=new Uint8Array(s*s)}return r.prototype.set=function(s,i,t,e){const n=s*this.size+i;this.data[n]=t,e&&(this.reservedBit[n]=!0)},r.prototype.get=function(s,i){return this.data[s*this.size+i]},r.prototype.xor=function(s,i,t){this.data[s*this.size+i]^=t},r.prototype.isReserved=function(s,i){return this.reservedBit[s*this.size+i]},ge=r,ge}var he={},Je;function Jt(){return Je||(Je=1,(function(r){const s=H().getSymbolSize;r.getRowColCoords=function(t){if(t===1)return[];const e=Math.floor(t/7)+2,n=s(t),a=n===145?26:Math.ceil((n-13)/(2*e-2))*2,l=[n-7];for(let c=1;c<e-1;c++)l[c]=l[c-1]-a;return l.push(6),l.reverse()},r.getPositions=function(t){const e=[],n=r.getRowColCoords(t),a=n.length;for(let l=0;l<a;l++)for(let c=0;c<a;c++)l===0&&c===0||l===0&&c===a-1||l===a-1&&c===0||e.push([n[l],n[c]]);return e}})(he)),he}var pe={},Ge;function Gt(){if(Ge)return pe;Ge=1;const r=H().getSymbolSize,s=7;return pe.getPositions=function(t){const e=r(t);return[[0,0],[e-s,0],[0,e-s]]},pe}var me={},Ye;function Yt(){return Ye||(Ye=1,(function(r){r.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const s={N1:3,N2:3,N3:40,N4:10};r.isValid=function(e){return e!=null&&e!==""&&!isNaN(e)&&e>=0&&e<=7},r.from=function(e){return r.isValid(e)?parseInt(e,10):void 0},r.getPenaltyN1=function(e){const n=e.size;let a=0,l=0,c=0,f=null,d=null;for(let N=0;N<n;N++){l=c=0,f=d=null;for(let y=0;y<n;y++){let h=e.get(N,y);h===f?l++:(l>=5&&(a+=s.N1+(l-5)),f=h,l=1),h=e.get(y,N),h===d?c++:(c>=5&&(a+=s.N1+(c-5)),d=h,c=1)}l>=5&&(a+=s.N1+(l-5)),c>=5&&(a+=s.N1+(c-5))}return a},r.getPenaltyN2=function(e){const n=e.size;let a=0;for(let l=0;l<n-1;l++)for(let c=0;c<n-1;c++){const f=e.get(l,c)+e.get(l,c+1)+e.get(l+1,c)+e.get(l+1,c+1);(f===4||f===0)&&a++}return a*s.N2},r.getPenaltyN3=function(e){const n=e.size;let a=0,l=0,c=0;for(let f=0;f<n;f++){l=c=0;for(let d=0;d<n;d++)l=l<<1&2047|e.get(f,d),d>=10&&(l===1488||l===93)&&a++,c=c<<1&2047|e.get(d,f),d>=10&&(c===1488||c===93)&&a++}return a*s.N3},r.getPenaltyN4=function(e){let n=0;const a=e.data.length;for(let c=0;c<a;c++)n+=e.data[c];return Math.abs(Math.ceil(n*100/a/5)-10)*s.N4};function i(t,e,n){switch(t){case r.Patterns.PATTERN000:return(e+n)%2===0;case r.Patterns.PATTERN001:return e%2===0;case r.Patterns.PATTERN010:return n%3===0;case r.Patterns.PATTERN011:return(e+n)%3===0;case r.Patterns.PATTERN100:return(Math.floor(e/2)+Math.floor(n/3))%2===0;case r.Patterns.PATTERN101:return e*n%2+e*n%3===0;case r.Patterns.PATTERN110:return(e*n%2+e*n%3)%2===0;case r.Patterns.PATTERN111:return(e*n%3+(e+n)%2)%2===0;default:throw new Error("bad maskPattern:"+t)}}r.applyMask=function(e,n){const a=n.size;for(let l=0;l<a;l++)for(let c=0;c<a;c++)n.isReserved(c,l)||n.xor(c,l,i(e,c,l))},r.getBestMask=function(e,n){const a=Object.keys(r.Patterns).length;let l=0,c=1/0;for(let f=0;f<a;f++){n(f),r.applyMask(f,e);const d=r.getPenaltyN1(e)+r.getPenaltyN2(e)+r.getPenaltyN3(e)+r.getPenaltyN4(e);r.applyMask(f,e),d<c&&(c=d,l=f)}return l}})(me)),me}var ae={},Ze;function xt(){if(Ze)return ae;Ze=1;const r=Ie(),s=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],i=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];return ae.getBlocksCount=function(e,n){switch(n){case r.L:return s[(e-1)*4+0];case r.M:return s[(e-1)*4+1];case r.Q:return s[(e-1)*4+2];case r.H:return s[(e-1)*4+3];default:return}},ae.getTotalCodewordsCount=function(e,n){switch(n){case r.L:return i[(e-1)*4+0];case r.M:return i[(e-1)*4+1];case r.Q:return i[(e-1)*4+2];case r.H:return i[(e-1)*4+3];default:return}},ae}var xe={},se={},We;function Zt(){if(We)return se;We=1;const r=new Uint8Array(512),s=new Uint8Array(256);return(function(){let t=1;for(let e=0;e<255;e++)r[e]=t,s[t]=e,t<<=1,t&256&&(t^=285);for(let e=255;e<512;e++)r[e]=r[e-255]})(),se.log=function(t){if(t<1)throw new Error("log("+t+")");return s[t]},se.exp=function(t){return r[t]},se.mul=function(t,e){return t===0||e===0?0:r[s[t]+s[e]]},se}var Xe;function Wt(){return Xe||(Xe=1,(function(r){const s=Zt();r.mul=function(t,e){const n=new Uint8Array(t.length+e.length-1);for(let a=0;a<t.length;a++)for(let l=0;l<e.length;l++)n[a+l]^=s.mul(t[a],e[l]);return n},r.mod=function(t,e){let n=new Uint8Array(t);for(;n.length-e.length>=0;){const a=n[0];for(let c=0;c<e.length;c++)n[c]^=s.mul(e[c],a);let l=0;for(;l<n.length&&n[l]===0;)l++;n=n.slice(l)}return n},r.generateECPolynomial=function(t){let e=new Uint8Array([1]);for(let n=0;n<t;n++)e=r.mul(e,new Uint8Array([1,s.exp(n)]));return e}})(xe)),xe}var be,et;function Xt(){if(et)return be;et=1;const r=Wt();function s(i){this.genPoly=void 0,this.degree=i,this.degree&&this.initialize(this.degree)}return s.prototype.initialize=function(t){this.degree=t,this.genPoly=r.generateECPolynomial(this.degree)},s.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");const e=new Uint8Array(t.length+this.degree);e.set(t);const n=r.mod(e,this.genPoly),a=this.degree-n.length;if(a>0){const l=new Uint8Array(this.degree);return l.set(n,a),l}return n},be=s,be}var we={},ye={},ke={},tt;function bt(){return tt||(tt=1,ke.isValid=function(s){return!isNaN(s)&&s>=1&&s<=40}),ke}var U={},nt;function wt(){if(nt)return U;nt=1;const r="[0-9]+",s="[A-Z $%*+\\-./:]+";let i="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";i=i.replace(/u/g,"\\u");const t="(?:(?![A-Z0-9 $%*+\\-./:]|"+i+`)(?:.|[\r
]))+`;U.KANJI=new RegExp(i,"g"),U.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),U.BYTE=new RegExp(t,"g"),U.NUMERIC=new RegExp(r,"g"),U.ALPHANUMERIC=new RegExp(s,"g");const e=new RegExp("^"+i+"$"),n=new RegExp("^"+r+"$"),a=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");return U.testKanji=function(c){return e.test(c)},U.testNumeric=function(c){return n.test(c)},U.testAlphanumeric=function(c){return a.test(c)},U}var rt;function J(){return rt||(rt=1,(function(r){const s=bt(),i=wt();r.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},r.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},r.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},r.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},r.MIXED={bit:-1},r.getCharCountIndicator=function(n,a){if(!n.ccBits)throw new Error("Invalid mode: "+n);if(!s.isValid(a))throw new Error("Invalid version: "+a);return a>=1&&a<10?n.ccBits[0]:a<27?n.ccBits[1]:n.ccBits[2]},r.getBestModeForData=function(n){return i.testNumeric(n)?r.NUMERIC:i.testAlphanumeric(n)?r.ALPHANUMERIC:i.testKanji(n)?r.KANJI:r.BYTE},r.toString=function(n){if(n&&n.id)return n.id;throw new Error("Invalid mode")},r.isValid=function(n){return n&&n.bit&&n.ccBits};function t(e){if(typeof e!="string")throw new Error("Param is not a string");switch(e.toLowerCase()){case"numeric":return r.NUMERIC;case"alphanumeric":return r.ALPHANUMERIC;case"kanji":return r.KANJI;case"byte":return r.BYTE;default:throw new Error("Unknown mode: "+e)}}r.from=function(n,a){if(r.isValid(n))return n;try{return t(n)}catch{return a}}})(ye)),ye}var st;function en(){return st||(st=1,(function(r){const s=H(),i=xt(),t=Ie(),e=J(),n=bt(),a=7973,l=s.getBCHDigit(a);function c(y,h,S){for(let B=1;B<=40;B++)if(h<=r.getCapacity(B,S,y))return B}function f(y,h){return e.getCharCountIndicator(y,h)+4}function d(y,h){let S=0;return y.forEach(function(B){const I=f(B.mode,h);S+=I+B.getBitsLength()}),S}function N(y,h){for(let S=1;S<=40;S++)if(d(y,S)<=r.getCapacity(S,h,e.MIXED))return S}r.from=function(h,S){return n.isValid(h)?parseInt(h,10):S},r.getCapacity=function(h,S,B){if(!n.isValid(h))throw new Error("Invalid QR Code version");typeof B>"u"&&(B=e.BYTE);const I=s.getSymbolTotalCodewords(h),E=i.getTotalCodewordsCount(h,S),P=(I-E)*8;if(B===e.MIXED)return P;const z=P-f(B,h);switch(B){case e.NUMERIC:return Math.floor(z/10*3);case e.ALPHANUMERIC:return Math.floor(z/11*2);case e.KANJI:return Math.floor(z/13);case e.BYTE:default:return Math.floor(z/8)}},r.getBestVersionForData=function(h,S){let B;const I=t.from(S,t.M);if(Array.isArray(h)){if(h.length>1)return N(h,I);if(h.length===0)return 1;B=h[0]}else B=h;return c(B.mode,B.getLength(),I)},r.getEncodedBits=function(h){if(!n.isValid(h)||h<7)throw new Error("Invalid QR Code version");let S=h<<12;for(;s.getBCHDigit(S)-l>=0;)S^=a<<s.getBCHDigit(S)-l;return h<<12|S}})(we)),we}var je={},ot;function tn(){if(ot)return je;ot=1;const r=H(),s=1335,i=21522,t=r.getBCHDigit(s);return je.getEncodedBits=function(n,a){const l=n.bit<<3|a;let c=l<<10;for(;r.getBCHDigit(c)-t>=0;)c^=s<<r.getBCHDigit(c)-t;return(l<<10|c)^i},je}var ve={},Ne,it;function nn(){if(it)return Ne;it=1;const r=J();function s(i){this.mode=r.NUMERIC,this.data=i.toString()}return s.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)},s.prototype.getLength=function(){return this.data.length},s.prototype.getBitsLength=function(){return s.getBitsLength(this.data.length)},s.prototype.write=function(t){let e,n,a;for(e=0;e+3<=this.data.length;e+=3)n=this.data.substr(e,3),a=parseInt(n,10),t.put(a,10);const l=this.data.length-e;l>0&&(n=this.data.substr(e),a=parseInt(n,10),t.put(a,l*3+1))},Ne=s,Ne}var Ce,at;function rn(){if(at)return Ce;at=1;const r=J(),s=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function i(t){this.mode=r.ALPHANUMERIC,this.data=t}return i.getBitsLength=function(e){return 11*Math.floor(e/2)+6*(e%2)},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(e){let n;for(n=0;n+2<=this.data.length;n+=2){let a=s.indexOf(this.data[n])*45;a+=s.indexOf(this.data[n+1]),e.put(a,11)}this.data.length%2&&e.put(s.indexOf(this.data[n]),6)},Ce=i,Ce}var ze,lt;function sn(){if(lt)return ze;lt=1;const r=J();function s(i){this.mode=r.BYTE,typeof i=="string"?this.data=new TextEncoder().encode(i):this.data=new Uint8Array(i)}return s.getBitsLength=function(t){return t*8},s.prototype.getLength=function(){return this.data.length},s.prototype.getBitsLength=function(){return s.getBitsLength(this.data.length)},s.prototype.write=function(i){for(let t=0,e=this.data.length;t<e;t++)i.put(this.data[t],8)},ze=s,ze}var Ee,ct;function on(){if(ct)return Ee;ct=1;const r=J(),s=H();function i(t){this.mode=r.KANJI,this.data=t}return i.getBitsLength=function(e){return e*13},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(t){let e;for(e=0;e<this.data.length;e++){let n=s.toSJIS(this.data[e]);if(n>=33088&&n<=40956)n-=33088;else if(n>=57408&&n<=60351)n-=49472;else throw new Error("Invalid SJIS character: "+this.data[e]+`
Make sure your charset is UTF-8`);n=(n>>>8&255)*192+(n&255),t.put(n,13)}},Ee=i,Ee}var Se={exports:{}},dt;function an(){return dt||(dt=1,(function(r){var s={single_source_shortest_paths:function(i,t,e){var n={},a={};a[t]=0;var l=s.PriorityQueue.make();l.push(t,0);for(var c,f,d,N,y,h,S,B,I;!l.empty();){c=l.pop(),f=c.value,N=c.cost,y=i[f]||{};for(d in y)y.hasOwnProperty(d)&&(h=y[d],S=N+h,B=a[d],I=typeof a[d]>"u",(I||B>S)&&(a[d]=S,l.push(d,S),n[d]=f))}if(typeof e<"u"&&typeof a[e]>"u"){var E=["Could not find a path from ",t," to ",e,"."].join("");throw new Error(E)}return n},extract_shortest_path_from_predecessor_list:function(i,t){for(var e=[],n=t;n;)e.push(n),i[n],n=i[n];return e.reverse(),e},find_path:function(i,t,e){var n=s.single_source_shortest_paths(i,t,e);return s.extract_shortest_path_from_predecessor_list(n,e)},PriorityQueue:{make:function(i){var t=s.PriorityQueue,e={},n;i=i||{};for(n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);return e.queue=[],e.sorter=i.sorter||t.default_sorter,e},default_sorter:function(i,t){return i.cost-t.cost},push:function(i,t){var e={value:i,cost:t};this.queue.push(e),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};r.exports=s})(Se)),Se.exports}var ut;function ln(){return ut||(ut=1,(function(r){const s=J(),i=nn(),t=rn(),e=sn(),n=on(),a=wt(),l=H(),c=an();function f(E){return unescape(encodeURIComponent(E)).length}function d(E,P,z){const j=[];let T;for(;(T=E.exec(z))!==null;)j.push({data:T[0],index:T.index,mode:P,length:T[0].length});return j}function N(E){const P=d(a.NUMERIC,s.NUMERIC,E),z=d(a.ALPHANUMERIC,s.ALPHANUMERIC,E);let j,T;return l.isKanjiModeEnabled()?(j=d(a.BYTE,s.BYTE,E),T=d(a.KANJI,s.KANJI,E)):(j=d(a.BYTE_KANJI,s.BYTE,E),T=[]),P.concat(z,j,T).sort(function(k,b){return k.index-b.index}).map(function(k){return{data:k.data,mode:k.mode,length:k.length}})}function y(E,P){switch(P){case s.NUMERIC:return i.getBitsLength(E);case s.ALPHANUMERIC:return t.getBitsLength(E);case s.KANJI:return n.getBitsLength(E);case s.BYTE:return e.getBitsLength(E)}}function h(E){return E.reduce(function(P,z){const j=P.length-1>=0?P[P.length-1]:null;return j&&j.mode===z.mode?(P[P.length-1].data+=z.data,P):(P.push(z),P)},[])}function S(E){const P=[];for(let z=0;z<E.length;z++){const j=E[z];switch(j.mode){case s.NUMERIC:P.push([j,{data:j.data,mode:s.ALPHANUMERIC,length:j.length},{data:j.data,mode:s.BYTE,length:j.length}]);break;case s.ALPHANUMERIC:P.push([j,{data:j.data,mode:s.BYTE,length:j.length}]);break;case s.KANJI:P.push([j,{data:j.data,mode:s.BYTE,length:f(j.data)}]);break;case s.BYTE:P.push([{data:j.data,mode:s.BYTE,length:f(j.data)}])}}return P}function B(E,P){const z={},j={start:{}};let T=["start"];for(let p=0;p<E.length;p++){const k=E[p],b=[];for(let g=0;g<k.length;g++){const v=k[g],w=""+p+g;b.push(w),z[w]={node:v,lastCount:0},j[w]={};for(let m=0;m<T.length;m++){const x=T[m];z[x]&&z[x].node.mode===v.mode?(j[x][w]=y(z[x].lastCount+v.length,v.mode)-y(z[x].lastCount,v.mode),z[x].lastCount+=v.length):(z[x]&&(z[x].lastCount=v.length),j[x][w]=y(v.length,v.mode)+4+s.getCharCountIndicator(v.mode,P))}}T=b}for(let p=0;p<T.length;p++)j[T[p]].end=0;return{map:j,table:z}}function I(E,P){let z;const j=s.getBestModeForData(E);if(z=s.from(P,j),z!==s.BYTE&&z.bit<j.bit)throw new Error('"'+E+'" cannot be encoded with mode '+s.toString(z)+`.
 Suggested mode is: `+s.toString(j));switch(z===s.KANJI&&!l.isKanjiModeEnabled()&&(z=s.BYTE),z){case s.NUMERIC:return new i(E);case s.ALPHANUMERIC:return new t(E);case s.KANJI:return new n(E);case s.BYTE:return new e(E)}}r.fromArray=function(P){return P.reduce(function(z,j){return typeof j=="string"?z.push(I(j,null)):j.data&&z.push(I(j.data,j.mode)),z},[])},r.fromString=function(P,z){const j=N(P,l.isKanjiModeEnabled()),T=S(j),p=B(T,z),k=c.find_path(p.map,"start","end"),b=[];for(let g=1;g<k.length-1;g++)b.push(p.table[k[g]].node);return r.fromArray(h(b))},r.rawSplit=function(P){return r.fromArray(N(P,l.isKanjiModeEnabled()))}})(ve)),ve}var ft;function cn(){if(ft)return de;ft=1;const r=H(),s=Ie(),i=Vt(),t=Ht(),e=Jt(),n=Gt(),a=Yt(),l=xt(),c=Xt(),f=en(),d=tn(),N=J(),y=ln();function h(p,k){const b=p.size,g=n.getPositions(k);for(let v=0;v<g.length;v++){const w=g[v][0],m=g[v][1];for(let x=-1;x<=7;x++)if(!(w+x<=-1||b<=w+x))for(let C=-1;C<=7;C++)m+C<=-1||b<=m+C||(x>=0&&x<=6&&(C===0||C===6)||C>=0&&C<=6&&(x===0||x===6)||x>=2&&x<=4&&C>=2&&C<=4?p.set(w+x,m+C,!0,!0):p.set(w+x,m+C,!1,!0))}}function S(p){const k=p.size;for(let b=8;b<k-8;b++){const g=b%2===0;p.set(b,6,g,!0),p.set(6,b,g,!0)}}function B(p,k){const b=e.getPositions(k);for(let g=0;g<b.length;g++){const v=b[g][0],w=b[g][1];for(let m=-2;m<=2;m++)for(let x=-2;x<=2;x++)m===-2||m===2||x===-2||x===2||m===0&&x===0?p.set(v+m,w+x,!0,!0):p.set(v+m,w+x,!1,!0)}}function I(p,k){const b=p.size,g=f.getEncodedBits(k);let v,w,m;for(let x=0;x<18;x++)v=Math.floor(x/3),w=x%3+b-8-3,m=(g>>x&1)===1,p.set(v,w,m,!0),p.set(w,v,m,!0)}function E(p,k,b){const g=p.size,v=d.getEncodedBits(k,b);let w,m;for(w=0;w<15;w++)m=(v>>w&1)===1,w<6?p.set(w,8,m,!0):w<8?p.set(w+1,8,m,!0):p.set(g-15+w,8,m,!0),w<8?p.set(8,g-w-1,m,!0):w<9?p.set(8,15-w-1+1,m,!0):p.set(8,15-w-1,m,!0);p.set(g-8,8,1,!0)}function P(p,k){const b=p.size;let g=-1,v=b-1,w=7,m=0;for(let x=b-1;x>0;x-=2)for(x===6&&x--;;){for(let C=0;C<2;C++)if(!p.isReserved(v,x-C)){let D=!1;m<k.length&&(D=(k[m]>>>w&1)===1),p.set(v,x-C,D),w--,w===-1&&(m++,w=7)}if(v+=g,v<0||b<=v){v-=g,g=-g;break}}}function z(p,k,b){const g=new i;b.forEach(function(C){g.put(C.mode.bit,4),g.put(C.getLength(),N.getCharCountIndicator(C.mode,p)),C.write(g)});const v=r.getSymbolTotalCodewords(p),w=l.getTotalCodewordsCount(p,k),m=(v-w)*8;for(g.getLengthInBits()+4<=m&&g.put(0,4);g.getLengthInBits()%8!==0;)g.putBit(0);const x=(m-g.getLengthInBits())/8;for(let C=0;C<x;C++)g.put(C%2?17:236,8);return j(g,p,k)}function j(p,k,b){const g=r.getSymbolTotalCodewords(k),v=l.getTotalCodewordsCount(k,b),w=g-v,m=l.getBlocksCount(k,b),x=g%m,C=m-x,D=Math.floor(g/m),$=Math.floor(w/m),le=$+1,oe=D-$,ee=new c(oe);let G=0;const Y=new Array(m),ie=new Array(m);let Z=0;const te=new Uint8Array(p.buffer);for(let F=0;F<m;F++){const ne=F<C?$:le;Y[F]=te.slice(G,G+ne),ie[F]=ee.encode(Y[F]),G+=ne,Z=Math.max(Z,ne)}const O=new Uint8Array(g);let W=0,L,_;for(L=0;L<Z;L++)for(_=0;_<m;_++)L<Y[_].length&&(O[W++]=Y[_][L]);for(L=0;L<oe;L++)for(_=0;_<m;_++)O[W++]=ie[_][L];return O}function T(p,k,b,g){let v;if(Array.isArray(p))v=y.fromArray(p);else if(typeof p=="string"){let D=k;if(!D){const $=y.rawSplit(p);D=f.getBestVersionForData($,b)}v=y.fromString(p,D||40)}else throw new Error("Invalid data");const w=f.getBestVersionForData(v,b);if(!w)throw new Error("The amount of data is too big to be stored in a QR Code");if(!k)k=w;else if(k<w)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+w+`.
`);const m=z(k,b,v),x=r.getSymbolSize(k),C=new t(x);return h(C,k),S(C),B(C,k),E(C,b,0),k>=7&&I(C,k),P(C,m),isNaN(g)&&(g=a.getBestMask(C,E.bind(null,C,b))),a.applyMask(g,C),E(C,b,g),{modules:C,version:k,errorCorrectionLevel:b,maskPattern:g,segments:v}}return de.create=function(k,b){if(typeof k>"u"||k==="")throw new Error("No input text");let g=s.M,v,w;return typeof b<"u"&&(g=s.from(b.errorCorrectionLevel,s.M),v=f.from(b.version),w=a.from(b.maskPattern),b.toSJISFunc&&r.setToSJISFunction(b.toSJISFunc)),T(k,v,g,w)},de}var Be={},Pe={},gt;function yt(){return gt||(gt=1,(function(r){function s(i){if(typeof i=="number"&&(i=i.toString()),typeof i!="string")throw new Error("Color should be defined as hex string");let t=i.slice().replace("#","").split("");if(t.length<3||t.length===5||t.length>8)throw new Error("Invalid hex color: "+i);(t.length===3||t.length===4)&&(t=Array.prototype.concat.apply([],t.map(function(n){return[n,n]}))),t.length===6&&t.push("F","F");const e=parseInt(t.join(""),16);return{r:e>>24&255,g:e>>16&255,b:e>>8&255,a:e&255,hex:"#"+t.slice(0,6).join("")}}r.getOptions=function(t){t||(t={}),t.color||(t.color={});const e=typeof t.margin>"u"||t.margin===null||t.margin<0?4:t.margin,n=t.width&&t.width>=21?t.width:void 0,a=t.scale||4;return{width:n,scale:n?4:a,margin:e,color:{dark:s(t.color.dark||"#000000ff"),light:s(t.color.light||"#ffffffff")},type:t.type,rendererOpts:t.rendererOpts||{}}},r.getScale=function(t,e){return e.width&&e.width>=t+e.margin*2?e.width/(t+e.margin*2):e.scale},r.getImageWidth=function(t,e){const n=r.getScale(t,e);return Math.floor((t+e.margin*2)*n)},r.qrToImageData=function(t,e,n){const a=e.modules.size,l=e.modules.data,c=r.getScale(a,n),f=Math.floor((a+n.margin*2)*c),d=n.margin*c,N=[n.color.light,n.color.dark];for(let y=0;y<f;y++)for(let h=0;h<f;h++){let S=(y*f+h)*4,B=n.color.light;if(y>=d&&h>=d&&y<f-d&&h<f-d){const I=Math.floor((y-d)/c),E=Math.floor((h-d)/c);B=N[l[I*a+E]?1:0]}t[S++]=B.r,t[S++]=B.g,t[S++]=B.b,t[S]=B.a}}})(Pe)),Pe}var ht;function dn(){return ht||(ht=1,(function(r){const s=yt();function i(e,n,a){e.clearRect(0,0,n.width,n.height),n.style||(n.style={}),n.height=a,n.width=a,n.style.height=a+"px",n.style.width=a+"px"}function t(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}r.render=function(n,a,l){let c=l,f=a;typeof c>"u"&&(!a||!a.getContext)&&(c=a,a=void 0),a||(f=t()),c=s.getOptions(c);const d=s.getImageWidth(n.modules.size,c),N=f.getContext("2d"),y=N.createImageData(d,d);return s.qrToImageData(y.data,n,c),i(N,f,d),N.putImageData(y,0,0),f},r.renderToDataURL=function(n,a,l){let c=l;typeof c>"u"&&(!a||!a.getContext)&&(c=a,a=void 0),c||(c={});const f=r.render(n,a,c),d=c.type||"image/png",N=c.rendererOpts||{};return f.toDataURL(d,N.quality)}})(Be)),Be}var Re={},pt;function un(){if(pt)return Re;pt=1;const r=yt();function s(e,n){const a=e.a/255,l=n+'="'+e.hex+'"';return a<1?l+" "+n+'-opacity="'+a.toFixed(2).slice(1)+'"':l}function i(e,n,a){let l=e+n;return typeof a<"u"&&(l+=" "+a),l}function t(e,n,a){let l="",c=0,f=!1,d=0;for(let N=0;N<e.length;N++){const y=Math.floor(N%n),h=Math.floor(N/n);!y&&!f&&(f=!0),e[N]?(d++,N>0&&y>0&&e[N-1]||(l+=f?i("M",y+a,.5+h+a):i("m",c,0),c=0,f=!1),y+1<n&&e[N+1]||(l+=i("h",d),d=0)):c++}return l}return Re.render=function(n,a,l){const c=r.getOptions(a),f=n.modules.size,d=n.modules.data,N=f+c.margin*2,y=c.color.light.a?"<path "+s(c.color.light,"fill")+' d="M0 0h'+N+"v"+N+'H0z"/>':"",h="<path "+s(c.color.dark,"stroke")+' d="'+t(d,f,c.margin)+'"/>',S='viewBox="0 0 '+N+" "+N+'"',I='<svg xmlns="http://www.w3.org/2000/svg" '+(c.width?'width="'+c.width+'" height="'+c.width+'" ':"")+S+' shape-rendering="crispEdges">'+y+h+`</svg>
`;return typeof l=="function"&&l(null,I),I},Re}var mt;function fn(){if(mt)return X;mt=1;const r=Ot(),s=cn(),i=dn(),t=un();function e(n,a,l,c,f){const d=[].slice.call(arguments,1),N=d.length,y=typeof d[N-1]=="function";if(!y&&!r())throw new Error("Callback required as last argument");if(y){if(N<2)throw new Error("Too few arguments provided");N===2?(f=l,l=a,a=c=void 0):N===3&&(a.getContext&&typeof f>"u"?(f=c,c=void 0):(f=c,c=l,l=a,a=void 0))}else{if(N<1)throw new Error("Too few arguments provided");return N===1?(l=a,a=c=void 0):N===2&&!a.getContext&&(c=l,l=a,a=void 0),new Promise(function(h,S){try{const B=s.create(l,c);h(n(B,a,c))}catch(B){S(B)}})}try{const h=s.create(l,c);f(null,n(h,a,c))}catch(h){f(h)}}return X.create=s.create,X.toCanvas=e.bind(null,i.render),X.toDataURL=e.bind(null,i.renderToDataURL),X.toString=e.bind(null,function(n,a,l){return t.render(n,l)}),X}var gn=fn();const hn=Ct(gn);function Ae(r,s,i){if(typeof window>"u")return`https://saleplan.pro/?view=mobile_plan&type=${r}&id=${encodeURIComponent(s)}`;const t=`${window.location.origin}${window.location.pathname}`,e=i?`&yk=${encodeURIComponent(i)}`:"";return`${t}?view=mobile_plan&type=${r}&id=${encodeURIComponent(s)}${e}`}async function Te(r,s={}){const{width:i=400,margin:t=2,colorDark:e="#090d16"}=s;try{return await hn.toDataURL(r,{errorCorrectionLevel:"M",width:i,margin:t,color:{dark:e,light:"#ffffff"}})}catch(n){throw console.error("Błąd generowania kodu QR:",n),n}}async function pn(r){var e,n,a;const s=r.planLekcji,i=r.yearKey,t=[];for(const l of s.classes){const c=Ae("class",l.id,i),f=await Te(c,{width:360});t.push({id:l.id,type:"class",title:`Klasa ${l.name}`,subtitle:l.group||`Oddział szkolny • ${((e=r.school)==null?void 0:e.name)||((a=(n=r.planLekcji)==null?void 0:n.meta)==null?void 0:a.schoolName)||"Szkoła"}`,tag:`Rok szkolny ${r.yearLabel||""}`,targetUrl:c,qrDataUrl:f})}return t}async function mn(r){const s=r.planLekcji,i=r.yearKey,t=[];for(const e of s.teachers){const n=Ae("teacher",e.id,i),a=await Te(n,{width:360,colorDark:"#1e1b4b"});t.push({id:e.id,type:"teacher",title:`${e.last} ${e.first}`,subtitle:`Skrót: ${e.abbr} • Grafik i Dyżury`,tag:"Kadra Pedagogiczna",targetUrl:n,qrDataUrl:a})}return t}async function xn(r){const s=r.planLekcji,i=r.yearKey,t=[];for(const e of s.rooms){const n=Ae("room",e.id,i),a=await Te(n,{width:360,colorDark:"#064e3b"}),l=e.type==="sport"?"Sala sportowa":e.type==="indywidualne"?"Terapia / Indywidualne":"Sala lekcyjna";t.push({id:e.id,type:"room",title:e.name.startsWith("Sala")?e.name:`Sala ${e.name}`,subtitle:e.desc||l,tag:e.capacity?`Pojemność: ${e.capacity} os.`:"Harmonogram sali",targetUrl:n,qrDataUrl:a})}return t}function bn(r,s){const i=document.createElement("a");i.href=r,i.download=s.endsWith(".png")?s:`${s}.png`,document.body.appendChild(i),i.click(),setTimeout(()=>{document.body.removeChild(i)},100)}function wn(r,s,i){var l,c,f;const t=((l=i.school)==null?void 0:l.name)||((f=(c=i.planLekcji)==null?void 0:c.meta)==null?void 0:f.schoolName)||"SZKOŁA",e=i.yearLabel||"";let n="grid-6";s==="cards_12"&&(n="grid-12"),s==="stickers_door"&&(n="grid-door"),s==="table_summary"&&(n="grid-table");const a=r.map(d=>s==="stickers_door"?`
        <div class="door-sticker">
          <div class="door-header">
            <span class="door-school">${t}</span>
            <span class="door-tag">${d.tag||"GABINET"}</span>
          </div>
          <div class="door-title">${d.title}</div>
          <div class="door-desc">${d.subtitle}</div>
          <div class="qr-box">
            <img src="${d.qrDataUrl}" alt="${d.title}" class="qr-img" />
          </div>
          <div class="door-footer">
            <span class="scan-cta">📱 Zeskanuj telefonem rozkład sali</span>
            <span class="sys-brand">SalePlan Pro</span>
          </div>
        </div>
      `:s==="cards_12"?`
        <div class="card-12">
          <div class="card-12-top">
            <span class="badge">${d.tag||""}</span>
            <span class="sch-micro">${t}</span>
          </div>
          <div class="card-12-title">${d.title}</div>
          <div class="card-12-qr">
            <img src="${d.qrDataUrl}" alt="${d.title}" />
          </div>
          <div class="card-12-footer">Zeskanuj plan lekcji</div>
        </div>
      `:`
      <div class="card-6">
        <div class="card-header">
          <div class="school-label">${t}</div>
          <div class="year-label">${e}</div>
        </div>
        <div class="card-body">
          <div class="card-info">
            <div class="card-tag">${d.tag||""}</div>
            <div class="card-title">${d.title}</div>
            <div class="card-subtitle">${d.subtitle}</div>
            <div class="card-instructions">
              <p>📌 <strong>Plan w smartfonie:</strong></p>
              <ul>
                <li>Zeskanuj kod aparatem telefonu</li>
                <li>Działa offline bez logowania</li>
                <li>Zawsze aktualny harmonogram</li>
              </ul>
            </div>
          </div>
          <div class="card-qr-box">
            <img src="${d.qrDataUrl}" alt="${d.title}" class="qr-img-large" />
            <span class="qr-direct-link">${d.targetUrl.replace(/^https?:\/\//,"")}</span>
          </div>
        </div>
        <div class="card-footer">
          <span>Generowano automatycznie z SalePlan Pro</span>
          <span class="page-date">${new Date().toLocaleDateString("pl-PL")}</span>
        </div>
      </div>
    `).join("");return`
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <title>Karty Kodów QR – ${t}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          background-color: #f8fafc;
          color: #0f172a;
          padding: 12px;
        }
        .no-print-bar {
          background-color: #0f172a;
          color: white;
          padding: 12px 20px;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .btn-print {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-close {
          background-color: #334155;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 8px;
        }
        .print-grid {
          display: grid;
          gap: 12px;
        }
        
        /* Szablon cards_6: 2 kolumny na A4 */
        .grid-6 {
          grid-template-columns: repeat(2, 1fr);
        }
        .card-6 {
          background: white;
          border: 2px dashed #94a3b8;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-inside: avoid;
          break-inside: avoid;
          min-height: 240px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }
        .card-body {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .card-info {
          flex: 1;
        }
        .card-tag {
          font-size: 9px;
          font-weight: 900;
          background-color: #eff6ff;
          color: #1d4ed8;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .card-title {
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .card-subtitle {
          font-size: 11px;
          color: #475569;
          margin-bottom: 8px;
        }
        .card-instructions {
          font-size: 10px;
          color: #334155;
          line-height: 1.4;
        }
        .card-instructions ul {
          padding-left: 14px;
          margin-top: 3px;
        }
        .card-qr-box {
          text-align: center;
          width: 120px;
        }
        .qr-img-large {
          width: 110px;
          height: 110px;
          display: block;
          margin: 0 auto 4px auto;
        }
        .qr-direct-link {
          font-size: 8px;
          color: #94a3b8;
          word-break: break-all;
        }
        .card-footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
        }

        /* Szablon stickers_door (Zawieszki na drzwi) */
        .grid-door {
          grid-template-columns: repeat(2, 1fr);
        }
        .door-sticker {
          background: white;
          border: 3px solid #0f172a;
          border-radius: 14px;
          padding: 18px;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          min-height: 280px;
        }
        .door-header {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 10px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .door-title {
          font-size: 26px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 10px;
        }
        .door-desc {
          font-size: 13px;
          color: #475569;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .door-sticker .qr-box img {
          width: 130px;
          height: 130px;
        }
        .door-footer {
          margin-top: 10px;
          width: 100%;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: #2563eb;
        }

        /* Szablon cards_12 (3 kolumny x 4 wiersze) */
        .grid-12 {
          grid-template-columns: repeat(3, 1fr);
        }
        .card-12 {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 8px;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .card-12-top {
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .card-12-title {
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
        }
        .card-12-qr img {
          width: 85px;
          height: 85px;
          margin: 4px auto;
          display: block;
        }
        .card-12-footer {
          font-size: 8px;
          font-weight: 700;
          color: #2563eb;
        }

        @media print {
          .no-print-bar {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
          }
          .card-6, .door-sticker, .card-12 {
            border-color: #000 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <span style="font-weight: 900; font-size: 14px;">DRUKOWANIE KART I KODÓW QR (A4)</span>
          <span style="font-size: 11px; color: #94a3b8; margin-left: 10px;">Liczba elementów: ${r.length}</span>
        </div>
        <div>
          <button class="btn-close" onclick="window.close()">Zamknij</button>
          <button class="btn-print" onclick="window.print()">Drukuj arkusze (Ctrl+P)</button>
        </div>
      </div>

      <div class="print-grid ${n}">
        ${a}
      </div>

      <script>
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      <\/script>
    </body>
    </html>
  `}function Sn({appState:r,schedData:s,onOpenMobileViewer:i}){var Me,Le,_e;const t=r.planLekcji,[e,n]=A.useState("excel"),[a,l]=A.useState(!1),[c,f]=A.useState(!0),[d,N]=A.useState(!0),[y,h]=A.useState(!0),[S,B]=A.useState(!0),[I,E]=A.useState(!0),[P,z]=A.useState(((Me=t.classes[0])==null?void 0:Me.id)||""),[j,T]=A.useState(((Le=t.teachers[0])==null?void 0:Le.id)||""),[p,k]=A.useState(((_e=t.rooms[0])==null?void 0:_e.id)||""),[b,g]=A.useState(!1),[v,w]=A.useState(null),[m,x]=A.useState("class"),[C,D]=A.useState(""),[$,le]=A.useState([]),[oe,ee]=A.useState(!1),[G,Y]=A.useState("cards_6"),[ie,Z]=A.useState(null),[te,O]=A.useState(null);A.useEffect(()=>{let u=!1;return ee(!0),(async()=>{try{let M=[];m==="class"?M=await pn(r):m==="teacher"?M=await mn(r):m==="room"&&(M=await xn(r)),u||(le(M),ee(!1))}catch(M){console.error("Błąd generowania kodów QR:",M),u||ee(!1)}})(),()=>{u=!0}},[m,r]);const W=A.useMemo(()=>{if(!C.trim())return $;const u=C.toLowerCase().trim();return $.filter(R=>R.title.toLowerCase().includes(u)||R.subtitle.toLowerCase().includes(u)||R.tag&&R.tag.toLowerCase().includes(u))},[$,C]),L=()=>{g(!0),setTimeout(()=>{var u,R,M;try{zt(r,s,{includeClasses:c,includeTeachers:d,includeRooms:y,includeDuties:S,includeWorkload:I,separateClassSheets:a,schoolName:((u=r.school)==null?void 0:u.name)||((M=(R=r.planLekcji)==null?void 0:R.meta)==null?void 0:M.schoolName),yearLabel:r.yearLabel}),w("Pomyślnie wygenerowano i pobrano wieloarkuszowy plik Excel (.xlsx)!"),setTimeout(()=>w(null),4e3)}catch(K){console.error("Błąd eksportu Excel:",K)}finally{g(!1)}},100)},_=()=>{const u=t.classes.find(K=>K.id===P);if(!u)return;const R=q.book_new(),M=Et(r,s,u);q.book_append_sheet(R,M,`Klasa_${u.name}`),re(R,`Plan_Klasa_${u.name}_${new Date().toISOString().slice(0,10)}.xlsx`)},F=()=>{const u=t.teachers.find(K=>K.id===j);if(!u)return;const R=q.book_new(),M=St(r,s,u);q.book_append_sheet(R,M,`Plan_${u.abbr}`),re(R,`Plan_${u.last}_${u.first}_${new Date().toISOString().slice(0,10)}.xlsx`)},ne=()=>{const u=q.book_new(),R=Bt(r);q.book_append_sheet(u,R,"Oblozenie_Sal"),re(u,`Oblozenie_Sal_${new Date().toISOString().slice(0,10)}.xlsx`)},kt=()=>{const u=q.book_new(),R=Pt(r);q.book_append_sheet(u,R,"Dyżury_Nauczycielskie"),re(u,`Grafik_Dyzurow_${new Date().toISOString().slice(0,10)}.xlsx`)},jt=()=>{const u=q.book_new(),R=Rt(r);q.book_append_sheet(u,R,"Bilans_Pensum"),re(u,`Bilans_Pensum_${new Date().toISOString().slice(0,10)}.xlsx`)},vt=u=>{navigator.clipboard.writeText(u.targetUrl).then(()=>{Z(u.id),setTimeout(()=>Z(null),2e3)})},Nt=()=>{const u=wn(W,G,r),R=window.open("","_blank");R?(R.document.write(u),R.document.close()):alert("Przeglądarka zablokowała wyskakujące okno. Zezwól na wyskakujące okna dla tej strony.")};return o.jsxs("div",{className:"flex-1 flex flex-col min-h-0 bg-slate-50 text-slate-800 overflow-y-auto font-sans p-4 md:p-8 space-y-6",children:[o.jsxs("div",{className:"bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden",children:[o.jsx("div",{className:"absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"}),o.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10",children:[o.jsxs("div",{className:"space-y-2",children:[o.jsxs("div",{className:"inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-black uppercase tracking-wider",children:[o.jsx(Tt,{size:13,className:"text-emerald-400 animate-pulse"})," Moduł 3: Zaawansowane Raporty i Eksport"]}),o.jsxs("h1",{className:"text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3",children:[o.jsx(De,{className:"text-emerald-400",size:30}),"Arkusze Excel (.xlsx) & Mobilne Kody QR"]}),o.jsx("p",{className:"text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed",children:"Generuj profesjonalne skoroszyty kalkulacyjne Microsoft Excel z kompletem tabel i podsumowań oraz twórz gotowe do wydruku karty z kodami QR dla uczniów, nauczycieli i sal do błyskawicznego podglądu w smartfonie bez konieczności logowania."})]}),o.jsxs("div",{className:"bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 flex gap-1 self-start md:self-auto shrink-0 shadow-lg",children:[o.jsxs("button",{onClick:()=>n("excel"),className:`px-4 py-2.5 rounded-lg text-xs font-black transition flex items-center gap-2 ${e==="excel"?"bg-emerald-600 text-white shadow-md":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:[o.jsx(De,{size:16}),o.jsx("span",{children:"Arkusze Excel (.xlsx)"})]}),o.jsxs("button",{onClick:()=>n("qrcode"),className:`px-4 py-2.5 rounded-lg text-xs font-black transition flex items-center gap-2 ${e==="qrcode"?"bg-indigo-600 text-white shadow-md":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:[o.jsx(Mt,{size:16}),o.jsx("span",{children:"Mobilne Kody QR"})]})]})]}),v&&o.jsxs("div",{className:"mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in",children:[o.jsx(qe,{size:16}),o.jsx("span",{children:v})]})]}),e==="excel"&&o.jsxs("div",{className:"space-y-6 animate-in fade-in",children:[o.jsx("div",{className:"bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden",children:o.jsxs("div",{className:"flex flex-col lg:flex-row lg:items-center justify-between gap-6",children:[o.jsxs("div",{className:"space-y-2 max-w-xl",children:[o.jsxs("span",{className:"text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5",children:[o.jsx(qe,{size:14})," Kompletny pakiet dyrektorski"]}),o.jsx("h2",{className:"text-xl font-black text-white",children:"Pobierz Pełny Skoroszyt Szkoły (.xlsx)"}),o.jsx("p",{className:"text-xs text-slate-300 leading-relaxed",children:"Zawiera w jednym pliku kompletne arkusze ze sformatowanymi tabelami: Plan wszystkich klas, Harmonogram nauczycieli, Obłożenie i wykorzystanie sal lekcyjnych, Grafik dyżurów oraz Bilans pensum i nadgodzin."}),o.jsx("div",{className:"pt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-300",children:o.jsxs("label",{className:"flex items-center gap-2 cursor-pointer select-none",children:[o.jsx("input",{type:"checkbox",checked:a,onChange:u=>l(u.target.checked),className:"rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"}),o.jsxs("span",{children:["Generuj oddzielną zakładkę dla każdego oddziału (",t.classes.length," klas)"]})]})})]}),o.jsx("div",{className:"flex flex-col sm:flex-row items-center gap-3",children:o.jsxs("button",{onClick:L,disabled:b,className:"w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2.5 transition cursor-pointer",children:[o.jsx(V,{size:18,className:b?"animate-bounce":""}),o.jsx("span",{children:b?"Generowanie Excela...":"Pobierz Pełny Skoroszyt (.xlsx)"})]})})]})}),o.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5",children:[o.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition",children:[o.jsxs("div",{className:"space-y-2",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsx("span",{className:"p-2 bg-blue-500/10 text-blue-400 rounded-lg",children:o.jsx(Ue,{size:18})}),o.jsx("span",{className:"text-[10px] font-black text-slate-400 uppercase tracking-wider",children:"Arkusz Klasy"})]}),o.jsx("h3",{className:"text-base font-black text-white",children:"Plan Lekcji Oddziału"}),o.jsx("p",{className:"text-xs text-slate-400",children:"Tygodniowa siatka zajęć wybranej klasy ze skrótami nauczycieli, gabinetami i godzinami lekcji."}),o.jsxs("div",{className:"pt-2",children:[o.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase block mb-1",children:"Wybierz klasę"}),o.jsx("select",{value:P,onChange:u=>z(u.target.value),className:"w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none",children:t.classes.map(u=>o.jsxs("option",{value:u.id,children:["Klasa ",u.name]},u.id))})]})]}),o.jsxs("button",{onClick:_,className:"w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer",children:[o.jsx(V,{size:14})," Pobierz arkusz klasy (.xlsx)"]})]}),o.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition",children:[o.jsxs("div",{className:"space-y-2",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsx("span",{className:"p-2 bg-indigo-500/10 text-indigo-400 rounded-lg",children:o.jsx($e,{size:18})}),o.jsx("span",{className:"text-[10px] font-black text-slate-400 uppercase tracking-wider",children:"Arkusz Nauczyciela"})]}),o.jsx("h3",{className:"text-base font-black text-white",children:"Plan Nauczyciela"}),o.jsx("p",{className:"text-xs text-slate-400",children:"Indywidualny rozkład zajęć pedagoga z salami, oddziałami oraz przypisanymi dyżurami międzylekcyjnymi."}),o.jsxs("div",{className:"pt-2",children:[o.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase block mb-1",children:"Wybierz pedagoga"}),o.jsx("select",{value:j,onChange:u=>T(u.target.value),className:"w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none",children:t.teachers.map(u=>o.jsxs("option",{value:u.id,children:[u.last," ",u.first," (",u.abbr,")"]},u.id))})]})]}),o.jsxs("button",{onClick:F,className:"w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer",children:[o.jsx(V,{size:14})," Pobierz plan pedagoga (.xlsx)"]})]}),o.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition",children:[o.jsxs("div",{className:"space-y-2",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsx("span",{className:"p-2 bg-emerald-500/10 text-emerald-400 rounded-lg",children:o.jsx(Fe,{size:18})}),o.jsx("span",{className:"text-[10px] font-black text-slate-400 uppercase tracking-wider",children:"Raport Gabinetów"})]}),o.jsx("h3",{className:"text-base font-black text-white",children:"Obłożenie Wszystkich Sal"}),o.jsx("p",{className:"text-xs text-slate-400",children:"Zestawienie wykorzystania gabinetów (ogólne, sportowe, indywidualne) wraz z procentowym wskaźnikiem obłożenia."}),o.jsxs("div",{className:"pt-2 text-xs text-slate-400",children:["Liczba gabinetów w szkole: ",o.jsx("strong",{className:"text-white",children:t.rooms.length})]})]}),o.jsxs("button",{onClick:ne,className:"w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer",children:[o.jsx(V,{size:14})," Pobierz obłożenie sal (.xlsx)"]})]}),o.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition",children:[o.jsxs("div",{className:"space-y-2",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsx("span",{className:"p-2 bg-amber-500/10 text-amber-400 rounded-lg",children:o.jsx(Lt,{size:18})}),o.jsx("span",{className:"text-[10px] font-black text-slate-400 uppercase tracking-wider",children:"BHP i Bezpieczeństwo"})]}),o.jsx("h3",{className:"text-base font-black text-white",children:"Grafik Dyżurów Przerwowych"}),o.jsx("p",{className:"text-xs text-slate-400",children:"Tabela obsadzenia stref, pięter i korytarzy podczas przerw międzylekcyjnych z godzinami i nazwiskami nauczycieli."})]}),o.jsxs("button",{onClick:kt,className:"w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer",children:[o.jsx(V,{size:14})," Pobierz grafik dyżurów (.xlsx)"]})]}),o.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-slate-700 transition",children:[o.jsxs("div",{className:"space-y-2",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsx("span",{className:"p-2 bg-purple-500/10 text-purple-400 rounded-lg",children:o.jsx(_t,{size:18})}),o.jsx("span",{className:"text-[10px] font-black text-slate-400 uppercase tracking-wider",children:"Kadry i Płace"})]}),o.jsx("h3",{className:"text-base font-black text-white",children:"Bilans Pensum i Nadgodzin"}),o.jsx("p",{className:"text-xs text-slate-400",children:"Tabela rozliczeniowa dla dyrekcji i księgowości: etat bazowy, godziny przydzielone, liczba nadgodzin, dyżury i dni pracy."})]}),o.jsxs("button",{onClick:jt,className:"w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer",children:[o.jsx(V,{size:14})," Pobierz bilans pensum (.xlsx)"]})]})]})]}),e==="qrcode"&&o.jsxs("div",{className:"space-y-6 animate-in fade-in",children:[o.jsxs("div",{className:"bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm",children:[o.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[o.jsx("span",{className:"text-xs font-bold text-slate-400 mr-1 uppercase",children:"Kategoria:"}),o.jsxs("button",{onClick:()=>x("class"),className:`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${m==="class"?"bg-blue-600 text-white":"bg-slate-800 text-slate-300 hover:bg-slate-700"}`,children:[o.jsx(Ue,{size:14})," Klasy (",t.classes.length,")"]}),o.jsxs("button",{onClick:()=>x("teacher"),className:`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${m==="teacher"?"bg-indigo-600 text-white":"bg-slate-800 text-slate-300 hover:bg-slate-700"}`,children:[o.jsx($e,{size:14})," Nauczyciele (",t.teachers.length,")"]}),o.jsxs("button",{onClick:()=>x("room"),className:`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${m==="room"?"bg-emerald-600 text-white":"bg-slate-800 text-slate-300 hover:bg-slate-700"}`,children:[o.jsx(Fe,{size:14})," Sale Lekcyjne (",t.rooms.length,")"]})]}),o.jsxs("div",{className:"flex flex-col sm:flex-row items-center gap-3",children:[o.jsxs("div",{className:"relative w-full sm:w-60",children:[o.jsx(Dt,{size:14,className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"}),o.jsx("input",{type:"text",placeholder:"Szukaj (np. 1A, Kowalski, 102)...",value:C,onChange:u=>D(u.target.value),className:"w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"})]}),o.jsxs("select",{value:G,onChange:u=>Y(u.target.value),className:"bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 outline-none",children:[o.jsx("option",{value:"cards_6",children:"Szablon: 6 kart A4 (Identyfikatory)"}),o.jsx("option",{value:"cards_12",children:"Szablon: 12 naklejek A4 (Zeszyty/Legitymacje)"}),o.jsx("option",{value:"stickers_door",children:"Szablon: Zawieszki na drzwi gabinetów"})]}),o.jsxs("button",{onClick:Nt,className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg transition shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer",title:"Wydrukuj wygenerowane karty z kodami QR na drukarce lub do pliku PDF",children:[o.jsx(qt,{size:15})," Drukuj arkusze A4"]})]})]}),oe?o.jsxs("div",{className:"py-20 text-center space-y-3",children:[o.jsx("div",{className:"w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"}),o.jsx("p",{className:"text-xs font-bold text-slate-400",children:"Generowanie kodów QR wysokiej rozdzielczości..."})]}):W.length===0?o.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-2",children:[o.jsx(Ut,{size:28,className:"mx-auto text-slate-500"}),o.jsx("h3",{className:"text-sm font-bold text-white",children:"Nie znaleziono pasujących elementów"}),o.jsx("p",{className:"text-xs text-slate-400",children:"Zmień frazę wyszukiwania lub wybierz inną kategorię."})]}):o.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",children:W.map(u=>{var R,M,K;return o.jsxs("div",{className:"bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm transition",children:[o.jsxs("div",{className:"space-y-2",children:[o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsx("span",{className:"text-[9px] font-black px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded uppercase",children:u.tag||u.type}),o.jsx("span",{className:"text-[10px] text-slate-500 font-bold",children:((R=r.school)==null?void 0:R.name)||((K=(M=r.planLekcji)==null?void 0:M.meta)==null?void 0:K.schoolName)||"Szkoła"})]}),o.jsx("h4",{className:"text-base font-black text-white leading-tight",children:u.title}),o.jsx("p",{className:"text-[11px] text-slate-400 leading-snug line-clamp-1",children:u.subtitle}),o.jsx("div",{className:"bg-white p-3 rounded-lg flex items-center justify-center my-2 shadow-inner",children:u.qrDataUrl?o.jsx("img",{src:u.qrDataUrl,alt:u.title,className:"w-36 h-36 object-contain"}):o.jsx("div",{className:"w-36 h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-xs",children:"Ładowanie QR..."})})]}),o.jsxs("div",{className:"space-y-2 pt-2 border-t border-slate-800/80",children:[o.jsxs("div",{className:"grid grid-cols-2 gap-1.5",children:[o.jsxs("button",{onClick:()=>O({type:u.type,id:u.id}),className:"py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black rounded-lg transition flex items-center justify-center gap-1 cursor-pointer",title:"Otwórz symulator podglądu mobilnego",children:[o.jsx($t,{size:13})," Podgląd"]}),o.jsx("button",{onClick:()=>vt(u),className:"py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer",title:"Kopiuj bezpośredni adres URL planu",children:ie===u.id?o.jsxs(o.Fragment,{children:[o.jsx(Ft,{size:13,className:"text-emerald-400"})," Skopiowano"]}):o.jsxs(o.Fragment,{children:[o.jsx(Kt,{size:13})," Kopiuj link"]})})]}),o.jsxs("button",{onClick:()=>u.qrDataUrl&&bn(u.qrDataUrl,`QR_${u.title.replace(/\s+/g,"_")}`),className:"w-full py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer",children:[o.jsx(V,{size:12})," Pobierz grafikę QR (.png)"]})]})]},u.id)})})]}),te&&o.jsx("div",{className:`fixed inset-0 bg-black/80 backdrop-blur-md ${It.MODAL} flex items-center justify-center p-4`,children:o.jsxs("div",{className:"bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm h-[88vh] flex flex-col overflow-hidden shadow-2xl relative ring-1 ring-slate-700",children:[o.jsxs("div",{className:"bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800 shrink-0",children:[o.jsx("span",{className:"text-[10px] font-bold text-slate-400",children:"📱 Symulator Smartfona"}),o.jsx("button",{onClick:()=>O(null),className:"p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition",children:o.jsx(Qt,{size:16})})]}),o.jsx("div",{className:"flex-1 overflow-y-auto",children:o.jsx(At,{appState:r,schedData:s,initialType:te.type,initialId:te.id,onBackToApp:()=>O(null)})})]})})]})}export{Sn as default};
