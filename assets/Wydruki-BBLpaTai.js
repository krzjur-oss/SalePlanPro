import{r as w,j as e}from"./vendor-react-NQNxyWao.js";import{f as at,a as Ne,c as Ue}from"./index-B4RSIe5T.js";import{P as S,a3 as rt,C as ke,g as nt,X as ot}from"./vendor-lucide-DHKfDJCj.js";import"./vendor-motion-FDUFV107.js";const L=["Poniedziałek","Wtorek","Środa","Czwartek","Piątek"];function v(m){return String(m??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ve(m,M){const k=[];let C=null;return m.forEach((A,q)=>{const R=A.floor.buildingIdx,O=M[R],D=(O==null?void 0:O.name)||"",K=A.floor.id,E=A.floor.name,U=`${R}|${K}`;!C||C.key!==U?(C={startIdx:q,span:1,key:U,name:E,buildingName:D},k.push(C)):C.span++}),k}function ze(m){const M=[];let k=null;return m.forEach((C,A)=>{var E,U;const q=C.floor.buildingIdx,R=C.floor.id,O=((E=C.seg)==null?void 0:E.id)||"default_seg",D=((U=C.seg)==null?void 0:U.name)||"Główny",K=`${q}|${R}|${O}`;!k||k.key!==K?(k={startIdx:A,span:1,key:K,name:D},M.push(k)):k.span++}),M}function mt({appState:m,schedData:M}){var Ge;const[k,C]=w.useState("classes"),[A,q]=w.useState("etap1"),[R,O]=w.useState("all"),[D,K]=w.useState("all"),[E,U]=w.useState("all"),[Ye,oe]=w.useState(!1),[He,$e]=w.useState(!1),[be,Pe]=w.useState(!1),[J,Ae]=w.useState("landscape"),[le,he]=w.useState(!1),[B,Ie]=w.useState("landscape"),[Q,Be]=w.useState(12),[X,Fe]=w.useState("all"),[ee,Ze]=w.useState("all"),[lt,it]=w.useState(1),[Ve,ie]=w.useState(!1),[ue,_e]=w.useState(1),[fe,qe]=w.useState("all");w.useEffect(()=>{try{$e(window.self!==window.top)}catch{$e(!0)}},[]),w.useEffect(()=>{if(be||le){let t=document.querySelector('meta[name="viewport"]');const d=t?t.getAttribute("content"):"";t||(t=document.createElement("meta"),t.setAttribute("name","viewport"),document.head.appendChild(t));const s=le?B:J,c=s==="landscape"?"1120":"794";t.setAttribute("content",`width=${c}, initial-scale=0.8, shrink-to-fit=no`);const l=document.createElement("style");return l.id="print-mobile-viewport-adjustments",l.innerHTML=`
        @media print {
          @page {
            size: ${s};
            margin: 6mm 8mm;
          }
          html, body {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          #weekly-print-overlay, #rooms-print-overlay {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }
        }
      `,document.head.appendChild(l),()=>{t&&(d?t.setAttribute("content",d):t.removeAttribute("content"));const r=document.getElementById("print-mobile-viewport-adjustments");r&&r.remove()}}},[be,J,le,B]);const h=m.planLekcji,te=w.useMemo(()=>{const t=m.yearLabel||"",d=t.match(/(\d{4})/);let s=new Date().getFullYear(),c=s+1;if(d){s=parseInt(d[1],10);const l=t.match(/\d{4}.*?(\d{4})/);l?c=parseInt(l[1],10):c=s+1}return{start:`${s}-09-01`,end:`${c}-06-25`}},[m.yearLabel]),[ge,Ce]=w.useState(te.start),[je,Se]=w.useState(te.end),[ye,Je]=w.useState("[Przedmiot] - [Klasa] [Sala]");w.useEffect(()=>{Ce(te.start),Se(te.end)},[te]);const De=(t,d)=>{const s=new Date(t),c=d+1,l=s.getDay();let r=c-l;r<0&&(r+=7);const o=new Date(s);return o.setDate(s.getDate()+r),o},F=t=>{const d=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),c=String(t.getDate()).padStart(2,"0"),l=String(t.getHours()).padStart(2,"0"),r=String(t.getMinutes()).padStart(2,"0"),o=String(t.getSeconds()).padStart(2,"0");return`${d}${s}${c}T${l}${r}${o}`},Ee=t=>{const d=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),c=String(t.getDate()).padStart(2,"0");return`${d}${s}${c}T235959Z`},Z=t=>t?t.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n").trim():"",Le=["MO","TU","WE","TH","FR"],Re=t=>{const d=[];for(let s=0;s<5;s++)T.forEach((c,l)=>{const r=String(c.num);let o=[];A==="etap1"?Object.entries(h.lessons).forEach(([a,n])=>{var b,g;const p=a.split("|"),x=p[0],i=parseInt(p[1],10),u=parseInt(p[2],10);if(i===s&&u===l){const f=h.assignments.find(j=>j.id===n.assignmentId);if(f&&f.teacherId===t.id){const j=((b=Y.get(f.subjectId))==null?void 0:b.name)||"Inny",P=((g=V.get(x))==null?void 0:g.name)||"Inna",y=f.roomId?se.get(f.roomId):null;o.push({subject:j,className:P,roomName:y==null?void 0:y.name})}}}):(((_.teachers[t.id]||{})[s]||{})[r]||[]).forEach(x=>{var i;o.push({subject:x.subject,className:x.className||((i=x.classes)==null?void 0:i.join("+"))||"Klasa",roomName:x.note})}),o.forEach(a=>{d.push({dayIdx:s,hourNum:c.num,start:c.start,end:c.end,subject:a.subject,className:a.className,roomName:a.roomName})})});return d},Me=t=>{const d=Re(t);if(d.length===0){alert(`Nauczyciel ${t.last} ${t.first} nie ma przypisanych żadnych lekcji w wybranym planie.`);return}let s=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"];d.forEach(a=>{const n=De(ge,a.dayIdx),[p,x]=a.start.split(":").map(Number),[i,u]=a.end.split(":").map(Number),b=new Date(n);b.setHours(p,x,0,0);const g=new Date(n);g.setHours(i,u,0,0);const f=ye.replace("[Przedmiot]",a.subject).replace("[Klasa]",a.className).replace("[Sala]",a.roomName?`s. ${a.roomName}`:"").replace(/\s+/g," ").trim(),j=`Lekcja: ${a.hourNum} (${a.start}-${a.end})\\nNauczyciel: ${t.last} ${t.first} (${t.abbr})\\nKlasa: ${a.className}\\n`+(a.roomName?`Sala: ${a.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",P=a.roomName?`Sala ${a.roomName}`:"",y=`asg-${t.id}-${a.dayIdx}-${a.hourNum}-${a.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}@saleplan.pro`,I=new Date(je);s.push("BEGIN:VEVENT"),s.push(`UID:${y}`),s.push(`DTSTAMP:${F(new Date)}Z`),s.push(`DTSTART:${F(b)}`),s.push(`DTEND:${F(g)}`),s.push(`RRULE:FREQ=WEEKLY;UNTIL=${Ee(I)};BYDAY=${Le[a.dayIdx]}`),s.push(`SUMMARY:${Z(f)}`),s.push(`LOCATION:${Z(P)}`),s.push(`DESCRIPTION:${Z(j)}`),s.push("END:VEVENT")}),s.push("END:VCALENDAR");const c=s.join(`\r
`),l=new Blob([c],{type:"text/calendar;charset=utf-8"}),r=URL.createObjectURL(l),o=document.createElement("a");o.href=r,o.download=`plan_${t.last}_${t.first}.ics`,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(r)},Qe=()=>{let t=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"],d=0;if(h.teachers.forEach(o=>{Re(o).forEach(n=>{d++;const p=De(ge,n.dayIdx),[x,i]=n.start.split(":").map(Number),[u,b]=n.end.split(":").map(Number),g=new Date(p);g.setHours(x,i,0,0);const f=new Date(p);f.setHours(u,b,0,0);const j=`[${o.abbr}] `+ye.replace("[Przedmiot]",n.subject).replace("[Klasa]",n.className).replace("[Sala]",n.roomName?`s. ${n.roomName}`:"").replace(/\s+/g," ").trim(),P=`Nauczyciel: ${o.last} ${o.first} (${o.abbr})\\nLekcja: ${n.hourNum} (${n.start}-${n.end})\\nKlasa: ${n.className}\\n`+(n.roomName?`Sala: ${n.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",y=n.roomName?`Sala ${n.roomName}`:"",I=`asg-all-${o.id}-${n.dayIdx}-${n.hourNum}-${n.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}-${d}@saleplan.pro`,N=new Date(je);t.push("BEGIN:VEVENT"),t.push(`UID:${I}`),t.push(`DTSTAMP:${F(new Date)}Z`),t.push(`DTSTART:${F(g)}`),t.push(`DTEND:${F(f)}`),t.push(`RRULE:FREQ=WEEKLY;UNTIL=${Ee(N)};BYDAY=${Le[n.dayIdx]}`),t.push(`SUMMARY:${Z(j)}`),t.push(`LOCATION:${Z(y)}`),t.push(`DESCRIPTION:${Z(P)}`),t.push("END:VEVENT")})}),d===0){alert("Brak przypisanych lekcji w całym planie lekcji.");return}t.push("END:VCALENDAR");const s=t.join(`\r
`),c=new Blob([s],{type:"text/calendar;charset=utf-8"}),l=URL.createObjectURL(c),r=document.createElement("a");r.href=l,r.download="plan_wszyscy_nauczyciele.ics",document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(l)},V=w.useMemo(()=>new Map(h.classes.map(t=>[t.id,t])),[h.classes]),de=w.useMemo(()=>new Map(h.teachers.map(t=>[t.id,t])),[h.teachers]),Y=w.useMemo(()=>new Map(h.subjects.map(t=>[t.id,t])),[h.subjects]),se=w.useMemo(()=>new Map(h.rooms.map(t=>[t.id,t])),[h.rooms]),T=w.useMemo(()=>h.hours&&h.hours.length>0?h.hours:[{num:1,start:"08:00",end:"08:45"},{num:2,start:"08:55",end:"09:40"},{num:3,start:"09:50",end:"10:35"},{num:4,start:"10:55",end:"11:40"},{num:5,start:"11:50",end:"12:35"}],[h.hours]),_=w.useMemo(()=>{const t=m.yearKey,d=M[t]||{},s={},c={},l={};return Object.entries(d).forEach(([r,o])=>{const a=parseInt(r,10);Object.entries(o).forEach(([n,p])=>{Object.entries(p).forEach(([x,i])=>{(Array.isArray(i)?i:[i]).forEach(b=>{var P,y,I;if(!b)return;const g=x.split("_"),f=g[g.length-1]||"";if(b.classes&&b.classes.length>0)b.classes.forEach(N=>{var $;const z=(($=h.classes.find(W=>W.name===N))==null?void 0:$.id)||N;s[z]||(s[z]={}),s[z][a]||(s[z][a]={}),s[z][a][n]||(s[z][a][n]=[]),s[z][a][n].push({...b,note:f})});else if(b.className){const N=((P=h.classes.find(z=>z.name===b.className))==null?void 0:P.id)||b.className;s[N]||(s[N]={}),s[N][a]||(s[N][a]={}),s[N][a][n]||(s[N][a][n]=[]),s[N][a][n].push({...b,note:f})}const j=b.teacherAbbr;if(j){const N=((y=h.teachers.find(z=>z.abbr===j))==null?void 0:y.id)||j;c[N]||(c[N]={}),c[N][a]||(c[N][a]={}),c[N][a][n]||(c[N][a][n]=[]),c[N][a][n].push({...b,note:f})}if(f){const N=((I=h.rooms.find(z=>z.name===f))==null?void 0:I.id)||f;l[N]||(l[N]={}),l[N][a]||(l[N][a]={}),l[N][a][n]||(l[N][a][n]=[]),l[N][a][n].push({...b,note:f})}})})})}),{classes:s,teachers:c,rooms:l}},[M,m.yearKey,h.classes,h.teachers,h.rooms]),Xe=()=>{window.print()},Oe=(t,d)=>{if(!d||d<=0||t.length<=d)return[t];const s=[];for(let c=0;c<t.length;c+=d)s.push(t.slice(c,c+d));return s},Te=(t,d,s,c)=>{var r,o,a;const l=[];if(A==="etap1"){const n=new Set;Object.entries(h.lessons).forEach(([p,x])=>{var f,j,P;const i=p.split("|"),u=i[0],b=parseInt(i[1],10),g=parseInt(i[2],10);if(b===d&&g===c){const y=h.assignments.find(I=>I.id===x.assignmentId);if(y){const I=h.rooms.find(z=>z.id===y.roomId);if(y.roomId===t.room.id||I&&I.name.toLowerCase().trim()===t.room.num.toLowerCase().trim()){if(n.has(y.id))return;n.add(y.id);const z=((f=Y.get(y.subjectId))==null?void 0:f.name)||"Przedmiot";let $=((j=V.get(u))==null?void 0:j.name)||"Klasa";if(y.linkedClassIds&&y.linkedClassIds.length>0){const G=y.linkedClassIds.map(re=>{var H;return(H=V.get(re))==null?void 0:H.name}).filter(Boolean);$=[$,...G].join("+")}const W=y.teacherId?(P=de.get(y.teacherId))==null?void 0:P.abbr:"";l.push({subject:z,className:$,teacherAbbr:W})}}}})}else{const n=Ue(t),p=(a=(o=(r=M[m.yearKey])==null?void 0:r[d])==null?void 0:o[s])==null?void 0:a[n];(Array.isArray(p)?p:p?[p]:[]).forEach(i=>{var u;i&&l.push({subject:i.subject,className:i.className||((u=i.classes)==null?void 0:u.join("+"))||"Klasa",teacherAbbr:i.teacherAbbr})})}return l},et=()=>{const t=ae,d=X==="all"?[0,1,2,3,4]:[X],s=ee==="all"?t:t.filter(l=>l.id===ee);let c="";return d.forEach(l=>{s.forEach(r=>{const o=Oe(r.cols,Q>0?Q:r.cols.length);o.forEach((a,n)=>{const p=a.length,x=ve(a,m.buildings),i=ze(a);let u="6px 4px",b="5px 3px",g="9.5px",f="9px",j="8px",P="11px",y="8px",I=!0;p>14?(u="3px 1px",b="3px 1px",g="7.5px",f="7px",j="6.5px",P="8.5px",y="6.5px",I=!1):p>10&&(u="4px 2px",b="4px 2px",g="8.5px",f="8px",j="7.5px",P="10px",y="7.5px");let N="";T.forEach(($,W)=>{let G="";a.forEach(re=>{const H=Te(re,l,$.num,W);let Ke='<span style="color: #cbd5e1; font-weight: bold; font-family: monospace;">-</span>';H.length>0&&(Ke=H.map(ne=>`
                  <div style="margin-bottom: 3px; line-height: 1.15;">
                    <span style="font-weight: 900; background-color: #fef3c7; border: 1px solid #fde68a; color: #78350f; padding: 1px 4px; border-radius: 3px; font-size: ${g}; display: inline-block;">
                      ${v(ne.className)}
                    </span>
                    <div style="font-size: ${f}; font-weight: bold; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;" title="${v(ne.subject)}">
                      ${v(ne.subject)}
                    </div>
                    ${ne.teacherAbbr?`
                      <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 0.5px 3px; border-radius: 2px; font-size: ${j}; font-weight: bold; display: inline-block; margin-top: 1px;">
                        ${v(ne.teacherAbbr)}
                      </span>`:""}
                  </div>
                `).join("")),G+=`
                <td style="border: 1px solid #94a3b8; padding: ${b}; text-align: center; vertical-align: top; background: #fff; width: calc((100% - 54px) / ${p}); box-sizing: border-box;">
                  ${Ke}
                </td>
              `}),N+=`
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-family: monospace; background-color: #f8fafc; font-weight: bold; font-size: 10px; width: 54px; max-width: 54px; box-sizing: border-box;">
                  <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${v($.num)}</div>
                  <div style="font-size: 7.5px; color: #64748b; margin-top: 0.5px;">${v($.start)}-${v($.end)}</div>
                </td>
                ${G}
              </tr>
            `});const z=o.length>1?` — CZĘŚĆ ${n+1}/${o.length} (Sal: ${p})`:` (Sal: ${p})`;c+=`
            <div class="sheet-page" style="page-break-after: always; break-after: page; margin-bottom: 24px; background: white; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
              <!-- Page Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
                <div>
                  <div style="font-size: 13px; font-weight: 950; color: #0f172a; letter-spacing: -0.01em;">
                    📅 ${v(L[l].toUpperCase())} — ${v(r.name.toUpperCase())}${v(z)}
                  </div>
                  <div style="font-size: 9.5px; color: #475569; font-weight: bold; margin-top: 1px;">
                    ${v(m.school.name)} • ROK SZKOLNY ${v(m.yearLabel)} • ${A==="etap1"?"PLAN BAZOWY KLAS (ETAP 1)":"PLAN PRZYDZIAŁU SAL (ETAP 2)"}
                  </div>
                </div>
                <div style="text-align: right; font-size: 8.5px; color: #64748b; font-family: monospace; font-weight: bold; line-height: 1.25;">
                  SalePlan Pro · Razem sal: ${we.length}<br>
                  ${new Date().toLocaleDateString("pl-PL")} ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>

              <!-- Matrix Table -->
              <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <!-- Floor level headers row -->
                  <tr style="background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-size: 9.5px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Godz
                    </th>
                    ${x.map($=>`
                      <th colspan="${$.span}" style="border: 1px solid #94a3b8; padding: 3px; text-align: center; font-size: 9.5px; font-weight: bold; background-color: #f8fafc; color: #334155; box-sizing: border-box;">
                        📍 ${v(Ne($.name,$.buildingName))}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Segment level headers row -->
                  <tr style="background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 8px; font-weight: 500; background-color: #f8fafc; color: #64748b; width: 54px; max-width: 54px; box-sizing: border-box;">
                      -
                    </th>
                    ${i.map($=>`
                      <th colspan="${$.span}" style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 8.5px; font-weight: bold; background-color: #ffffff; color: #64748b; text-transform: uppercase; box-sizing: border-box;">
                        🧩 ${v($.name)}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Room level headers row -->
                  <tr style="background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-size: 9.5px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Nr
                    </th>
                    ${a.map($=>{const W=$.room.sub||"sala ogólna";return`
                        <th style="border: 1px solid #94a3b8; padding: ${u}; text-align: center; font-size: 10px; font-weight: 950; color: #020617; width: calc((100% - 54px) / ${p}); box-sizing: border-box;">
                          <span style="font-family: monospace; font-size: ${P}; display: block;">🚪 ${v($.room.num)}</span>
                          ${I?`<span style="font-size: ${y}; color: #475569; font-weight: 500; display: block; margin-top: 0.5px; text-transform: lowercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">(${v(W)})</span>`:""}
                        </th>
                      `}).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${N}
                </tbody>
              </table>
            </div>
          `})})}),`
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=1120, initial-scale=0.8, shrink-to-fit=no">
        <title>Płachta Gabinetów - SalePlan Pro</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 16px;
            background-color: #f1f5f9;
            color: #0f172a;
            width: 100%;
          }
          .no-print-bar {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            max-width: 100%;
          }
          .btn-print {
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .btn-print:hover {
            background-color: #1d4ed8;
          }
          .btn-close {
            background-color: #f8fafc;
            color: #334155;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
          }
          
          .content-container {
            width: 100%;
            max-width: 100%;
          }
          
          @page {
            size: landscape;
            margin: 6mm 8mm;
          }
          
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .sheet-page {
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 0 20px 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
            }
            td, th {
              border: 1px solid #000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 900; font-size: 13px; color: #020617;">🖨️ PODGLĄD WYDRUKU PŁACHTY GABINETÓW (A4 POZIOMO)</span>
            <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Automatycznie dopasowano do szerokości arkusza A4 bez ucinania</span>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button class="btn-close" onclick="window.close()">Zamknij</button>
            <button class="btn-print" onclick="window.print()">
              🖨️ Drukuj teraz (Ctrl+P)
            </button>
          </div>
        </div>

        <div class="content-container">
          ${c}
        </div>

        <script>
          window.addEventListener('DOMContentLoaded', () => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.print();
              });
            });
          });
        <\/script>
      </body>
      </html>
    `},ce=()=>{try{const t=et(),d=window.open("","_blank","noopener");d?(d.document.write(t),d.document.close()):he(!0)}catch(t){console.error(t),he(!0)}},tt=()=>{const t=m.dyzury.miejsca,d=m.dyzury.przerwy,s=Math.min(1,Math.max(.45,8/Math.max(t.length,1)));let c="";return[0,1,2,3,4].forEach(l=>{let r="";d.forEach(o=>{let a="";t.forEach(n=>{const p=`${n.id}|${l}|${o.num}`,x=m.dyzury.harmonogram[p],i=x!=null&&x.teacherAbbr?m.teachers.find(b=>b.abbr===x.teacherAbbr):null;let u="-";x!=null&&x.teacherAbbr&&(u=`
              <div style="font-weight: 900; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 11px; display: inline-block; min-width: 45px; text-align: center;">
                ${v(x.teacherAbbr)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;" title="${i?v(`${i.first} ${i.last}`):""}">
                ${i?`${v(i.first.slice(0,1))}. ${v(i.last)}`:"Dyżur"}
              </div>
            `),a+=`
            <td style="border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle; background: #fff;">
              ${u}
            </td>
          `}),r+=`
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; background-color: #f8fafc; font-weight: bold; font-size: 10.5px; width: 140px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${v(o.name||`Przerwa ${o.num}`)}</div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; font-family: monospace;">⏱️ ${v(o.start)} - ${v(o.end)}</div>
            </td>
            ${a}
          </tr>
        `}),c+=`
        <div class="day-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 32px;">
          <div style="background-color: #0f172a; color: #fff; padding: 8px 14px; margin-bottom: 12px; font-weight: 900; font-size: 11.5px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="letter-spacing: 0.05em; text-transform: uppercase;">📅 ${v(L[l])} — HARMONOGRAM DYŻURÓW</span>
            <span style="font-size: 8.5px; font-family: monospace; font-weight: bold; opacity: 0.8; text-transform: uppercase;">PODZIAŁ NA REJONY / MIEJSCA DYŻUROWAŃ</span>
          </div>

          ${t.length===0?`
            <p style="font-size: 11px; color: #64748b; font-style: italic; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; background: #fafafa;">Brak zdefiniowanych miejsc dyżurowania.</p>
          `:`
            <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 900; color: #334155; width: 140px;">PRZERWA / GODZINA</th>
                  ${t.map(o=>`
                    <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 10.5px; font-weight: 900; color: #1e293b; background-color: #f8fafc;">
                      <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 10.5px;">📍 ${v(o.name)}</div>
                      ${o.floor?`<div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${v(o.floor)}</div>`:""}
                    </th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${r}
              </tbody>
            </table>
          `}
        </div>
      `}),`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plan i Harmonogram Dyżurów — SalePlan Pro</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print-bar {
            background-color: #fff;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .btn-close {
            background-color: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
            color: #1e293b;
          }
          .btn-print {
            background-color: #059669;
            color: #fff;
            border: 1px solid #059669;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 900;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .btn-print:hover {
            background-color: #047857;
            border-color: #047857;
          }
          .header {
            background-color: #fff;
            border-bottom: 2px solid #0f172a;
            padding: 24px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: -0.01em;
            color: #0f172a;
          }
          .header-title p {
            margin: 4px 0 0 0;
            font-size: 11.5px;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-info {
            font-size: 9px;
            font-weight: bold;
            text-align: right;
            line-height: 1.5;
            color: #64748b;
            text-transform: uppercase;
          }
          .content {
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #fff !important;
            }
            .header {
              padding: 12px 0 20px 0 !important;
              margin-bottom: 16px !important;
              border-bottom: 2px solid #000 !important;
            }
            .content {
              padding: 0 !important;
              max-width: 100% !important;
            }
            td, th {
              border: 1px solid #000 !important;
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 900; font-size: 13px; color: #020617;">PODGLĄD HARMONOGRAMU DYŻURÓW</span>
            <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Układ poziomy (A4 landscape) został automatycznie zoptymalizowany pod drukarkę</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 16px; margin-left: auto; margin-right: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; white-space: nowrap;">Skala wydruku (Zoom):</label>
              <select id="scale-selector" onchange="adjustScale(this.value)" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; color: #1e293b; background: white; cursor: pointer;">
                <option value="1.0" ${s>=.95?"selected":""}>Auto (100%)</option>
                <option value="0.95" ${s>=.9&&s<.95?"selected":""}>95%</option>
                <option value="0.90" ${s>=.85&&s<.9?"selected":""}>90%</option>
                <option value="0.85" ${s>=.8&&s<.85?"selected":""}>85% (Kompaktowa)</option>
                <option value="0.80" ${s>=.75&&s<.8?"selected":""}>80%</option>
                <option value="0.75" ${s>=.7&&s<.75?"selected":""}>75%</option>
                <option value="0.70" ${s>=.65&&s<.7?"selected":""}>70%</option>
                <option value="0.65" ${s>=.6&&s<.65?"selected":""}>65%</option>
                <option value="0.60" ${s>=.55&&s<.6?"selected":""}>60% (Gęsta)</option>
                <option value="0.55" ${s>=.5&&s<.55?"selected":""}>55%</option>
                <option value="0.50" ${s>=.45&&s<.5?"selected":""}>50%</option>
                <option value="0.45" ${s>=.4&&s<.45?"selected":""}>45%</option>
                <option value="0.40" ${s<.4?"selected":""}>40% (Bardzo gęsta)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn-close" onclick="window.close()">Zamknij okno</button>
            <button class="btn-print" onclick="window.print()">
              🖨️ Drukuj (Ctrl+P)
            </button>
          </div>
        </div>

        <div class="header">
          <div class="header-title">
            <h1>PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH</h1>
            <p>${v(m.school.name)} — Rok szkolny ${v(m.yearLabel)}</p>
          </div>
          <div class="meta-info">
            SYSTEM GENERACYJNY SalePlan Pro<br>
            MODUŁ DYŻURÓW SZKOLNYCH<br>
            DATA GENEROWANIA: ${new Date().toLocaleDateString("pl-PL")} o ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        <div class="content">
          ${c}
        </div>

        <script>
          function adjustScale(scaleValue) {
            const content = document.querySelector('.content');
            const header = document.querySelector('.header');
            if (content) {
              content.style.zoom = scaleValue;
              content.style.webkitZoom = scaleValue;
            }
            if (header) {
              header.style.zoom = scaleValue;
              header.style.webkitZoom = scaleValue;
            }
          }

          // Initial scale application
          window.addEventListener('DOMContentLoaded', () => {
            const initialScale = document.getElementById('scale-selector')?.value || '1.0';
            adjustScale(initialScale);
            
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.print();
              });
            });
          });
        <\/script>
      </body>
      </html>
    `},st=()=>{try{const t=tt(),d=window.open("","_blank","noopener");d?(d.document.write(t),d.document.close()):oe(!0)}catch(t){console.error(t),oe(!0)}},xe=w.useMemo(()=>R==="all"?h.classes:h.classes.filter(t=>t.id===R),[h.classes,R]),pe=w.useMemo(()=>D==="all"?h.teachers:h.teachers.filter(t=>t.id===D),[h.teachers,D]),we=w.useMemo(()=>E==="all"?h.rooms:h.rooms.filter(t=>t.id===E),[h.rooms,E]),me=w.useMemo(()=>{const t=at(m.floors),d=E==="all"?t:t.filter(a=>{const n=(a.room.num||"").toLowerCase().trim(),p=h.rooms.find(x=>x.name.toLowerCase().trim()===n);return p&&p.id===E}),s=[],c=[],l=[],r=new Map(h.rooms.map(a=>[a.name.toLowerCase().trim(),a]));d.forEach(a=>{const n=(a.room.num||"").toLowerCase().trim(),p=r.get(n),x=m.buildings[a.floor.buildingIdx],i=(p==null?void 0:p.type)==="indywidualne",u=(p==null?void 0:p.type)==="sport"||(x==null?void 0:x.multi)===!0;i?c.push(a):u?l.push(a):s.push(a)});const o=(a,n)=>{const p=a.room.num||"",x=n.room.num||"";return p.localeCompare(x,void 0,{numeric:!0,sensitivity:"base"})};return s.sort(o),c.sort(o),l.sort(o),{main:s,individual:c,sport:l}},[m.floors,m.buildings,h.rooms,E]),ae=w.useMemo(()=>[{id:"main",name:"Budynek Główny",icon:"🏢",cols:me.main},{id:"individual",name:"Nauczanie Indywidualne",icon:"🗣️",cols:me.individual},{id:"sport",name:"Sale Sportowe",icon:"🏆",cols:me.sport}].filter(t=>t.cols.length>0),[me]);if(le){const t=X==="all"?[0,1,2,3,4]:[X],d=ee==="all"?ae:ae.filter(s=>s.id===ee);return e.jsxs("div",{id:"rooms-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
          @media print {
            header, footer, #restoring-pointer-blocker {
              display: none !important;
            }
            html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
              height: auto !important;
              width: 100% !important;
              overflow: visible !important;
              position: static !important;
            }
            body {
              background-color: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #rooms-print-overlay {
              display: block !important;
              position: static !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .rooms-sheet-card {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              border: none !important;
              box-shadow: none !important;
              margin: 0 0 20px 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              table-layout: fixed !important;
            }
            th, td {
              border: 1px solid #000 !important;
              color: #000 !important;
              box-sizing: border-box !important;
            }
            th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: ${B};
              margin: 6mm 8mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-amber-400",children:e.jsx(S,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Studio Wydruku Płachty Sal"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Płachta Obłożenia Gabinetów • Układ A4 ",B==="landscape"?"Poziomy":"Pionowy"]})]})]}),e.jsxs("div",{className:"flex items-center gap-2.5 flex-wrap",children:[e.jsxs("div",{className:"flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700",children:[e.jsx("button",{onClick:()=>Ie("landscape"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${B==="landscape"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"}),e.jsx("button",{onClick:()=>Ie("portrait"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${B==="portrait"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Sal / strona:"}),e.jsxs("select",{value:Q,onChange:s=>Be(parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:8,className:"bg-slate-800 text-white",children:"8 sal (Duża czytelność)"}),e.jsx("option",{value:10,className:"bg-slate-800 text-white",children:"10 sal (Zalecane A4)"}),e.jsx("option",{value:12,className:"bg-slate-800 text-white",children:"12 sal (Standard)"}),e.jsx("option",{value:15,className:"bg-slate-800 text-white",children:"15 sal (Kompakt)"}),e.jsx("option",{value:0,className:"bg-slate-800 text-white",children:"Wszystkie w 1 tabeli"})]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Dzień:"}),e.jsxs("select",{value:X,onChange:s=>Fe(s.target.value==="all"?"all":parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie dni (Pn-Pt)"}),L.map((s,c)=>e.jsx("option",{value:c,className:"bg-slate-800 text-white",children:s},c))]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Budynek:"}),e.jsxs("select",{value:ee,onChange:s=>Ze(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie kategorie"}),ae.map(s=>e.jsx("option",{value:s.id,className:"bg-slate-800 text-white",children:s.name},s.id))]})]}),e.jsxs("button",{onClick:ce,className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer",title:"Otwórz czysty HTML w nowej karcie",children:[e.jsx(rt,{size:14})," W osobnym oknie"]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer",children:[e.jsx(S,{size:15})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>he(!1),className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer",children:"Zamknij"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8",children:t.map(s=>e.jsx("div",{className:"space-y-6",children:d.map(c=>{const l=Oe(c.cols,Q>0?Q:c.cols.length);return l.map((r,o)=>{const a=r.length,n=ve(r,m.buildings),p=ze(r),x=l.length>1?` — Część ${o+1}/${l.length} (Sal: ${a})`:` (Sal: ${a})`;return e.jsxs("div",{className:"rooms-sheet-card bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-md transition",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-base md:text-lg font-black text-slate-950 tracking-tight flex items-center gap-2",children:e.jsxs("span",{children:["📅 ",L[s].toUpperCase()," — ",c.name.toUpperCase(),x]})}),e.jsxs("p",{className:"text-[10.5px] text-slate-600 font-bold uppercase mt-0.5",children:[m.school.name," • Rok szkolny ",m.yearLabel," • ",A==="etap1"?"Plan Bazowy Klas (Etap 1)":"Plan Przydziału Sal (Etap 2)"]})]}),e.jsxs("div",{className:"text-right text-[9px] font-mono text-slate-400 font-bold uppercase leading-tight",children:["SalePlan Pro • Sal w szkole: ",we.length,e.jsx("br",{}),"Wydrukowano: ",new Date().toLocaleDateString("pl-PL")]})]}),e.jsx("div",{className:"w-full overflow-hidden",children:e.jsxs("table",{className:"w-full text-xs text-left border-collapse table-fixed bg-white",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Godz"}),n.map((i,u)=>e.jsxs("th",{colSpan:i.span,className:"border border-slate-300 p-1.5 text-center text-[9.5px] bg-slate-50 font-bold text-slate-700",children:["📍 ",Ne(i.name,i.buildingName)]},u))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1 text-center text-[8px] bg-slate-50 font-medium text-slate-400",children:"-"}),p.map((i,u)=>e.jsxs("th",{colSpan:i.span,className:"border border-slate-300 p-1 text-center text-[8.5px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",i.name]},u))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Nr"}),r.map((i,u)=>e.jsxs("th",{style:{width:`calc((100% - 52px) / ${a})`},className:"border border-slate-300 p-1.5 text-center",children:[e.jsxs("span",{className:"font-mono text-[10.5px] block text-slate-950 font-black",children:["🚪 ",i.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-full mx-auto mt-0.5",children:["(",i.room.sub||"sala ogólna",")"]})]},u))]})]}),e.jsx("tbody",{children:T.map((i,u)=>e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 font-mono text-center bg-slate-50/60",children:[e.jsx("span",{className:"font-black text-slate-900 text-[11px] block",children:i.num}),e.jsxs("span",{className:"block text-[7.5px] text-slate-500 leading-none mt-0.5 font-medium",children:[i.start,"-",i.end]})]}),r.map((b,g)=>{const f=Te(b,s,i.num,u);return e.jsx("td",{style:{width:`calc((100% - 52px) / ${a})`},className:"border border-slate-300 p-1.5 align-top text-center bg-white min-h-[44px]",children:f.length>0?e.jsx("div",{className:"space-y-1",children:f.map((j,P)=>e.jsxs("div",{className:"leading-tight",children:[e.jsx("span",{className:"font-black text-slate-950 block text-[10px] bg-amber-100/90 border border-amber-300/90 rounded px-1.5 py-0.5 inline-block mb-0.5",children:j.className}),e.jsx("span",{className:"text-[9px] text-slate-800 block font-bold truncate max-w-full mx-auto",title:j.subject,children:j.subject}),j.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 text-slate-800 border border-slate-300 px-1 py-0.2 rounded text-[8px] font-bold inline-block mt-0.5",children:j.teacherAbbr})]},P))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},g)})]},i.num))})]})})]},`${s}-${c.id}-${o}`)})})},s))})]})}if(be)return e.jsxs("div",{id:"weekly-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
          @media print {
            /* Ukrywamy nagłówek i stopkę systemową */
            header, footer, #restoring-pointer-blocker {
              display: none !important;
            }

            /* Resetujemy wysokości i paski przewijania kontenerów nadrzędnych */
            html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
              height: auto !important;
              width: auto !important;
              overflow: visible !important;
              position: static !important;
            }

            body {
              background-color: white !important;
              color: black !important;
            }

            #weekly-print-overlay {
              display: block !important;
              position: static !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            .print-card {
              border: 1px solid #000 !important;
              margin-bottom: 25px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-shadow: none !important;
              padding: 10px !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border: 1px solid #000 !important;
              color: #000 !important;
              padding: 4px 6px !important;
              font-size: 10px !important;
            }
            th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: ${J};
              margin: 10mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-indigo-400",children:e.jsx(S,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Tryb przygotowania do druku"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Podgląd Tygodniowego Planu • ",k==="classes"?"Oddziały":"Nauczyciele"]})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>Ae("portrait"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${J==="portrait"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"}),e.jsx("button",{onClick:()=>Ae("landscape"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${J==="landscape"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"})]}),k==="classes"?e.jsxs("select",{value:R,onChange:t=>O(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały"}),h.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]}):e.jsxs("select",{value:D,onChange:t=>K(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele"}),h.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first]},t.id))]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(S,{size:13})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>Pe(!1),className:"px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition select-none cursor-pointer",children:"Zamknij podgląd"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:k==="classes"?xe.map((t,d)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${d<xe.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN LEKCJI • KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[m.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",m.yearLabel," • ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),L.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:T.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{var a;let o=[];if(A==="etap1"){const n=`${t.id}|${r}|${c}`,p=h.lessons[n];if(p){const x=h.assignments.find(i=>i.id===p.assignmentId);if(x){const i=((a=Y.get(x.subjectId))==null?void 0:a.name)||"Inny",u=x.teacherId?de.get(x.teacherId):null,b=x.roomId?se.get(x.roomId):null;o.push({subject:i,teacherAbbr:u==null?void 0:u.abbr,roomName:b==null?void 0:b.name})}}}else(((_.classes[t.id]||{})[r]||{})[l]||[]).forEach(i=>{o.push({subject:i.subject,teacherAbbr:i.teacherAbbr,roomName:i.note})});return e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:o.length>0?e.jsx("div",{className:"space-y-1.5",children:o.map((n,p)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:n.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[n.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:n.teacherAbbr}),n.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",n.roomName]})]})]},p))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id)):pe.map((t,d)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${d<pe.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN NAUCZYCIELA • ",t.last.toUpperCase()," ",t.first.toUpperCase()," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[m.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",m.yearLabel," • ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),L.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:T.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-200 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{let o=[];return A==="etap1"?Object.entries(h.lessons).forEach(([a,n])=>{var b,g;const p=a.split("|"),x=p[0],i=parseInt(p[1],10),u=parseInt(p[2],10);if(i===r&&u===c){const f=h.assignments.find(j=>j.id===n.assignmentId);if(f&&f.teacherId===t.id){const j=((b=Y.get(f.subjectId))==null?void 0:b.name)||"Inny",P=((g=V.get(x))==null?void 0:g.name)||"Inna",y=f.roomId?se.get(f.roomId):null;o.push({subject:j,className:P,roomName:y==null?void 0:y.name})}}}):(((_.teachers[t.id]||{})[r]||{})[l]||[]).forEach(x=>{var i;o.push({subject:x.subject,className:x.className||((i=x.classes)==null?void 0:i.join("+"))||"Klasa",roomName:x.note})}),e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:o.length>0?e.jsx("div",{className:"space-y-1.5",children:o.map((a,n)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:a.className}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",a.roomName]})]})]},n))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id))})]});const We=t=>!t||t.length===0?null:t.map((d,s)=>{var o;const c=d.className||((o=d.classes)==null?void 0:o.join(", "))||"",l=d.subject||"",r=d.note||"";return e.jsxs("div",{className:"text-[10px] font-semibold text-slate-700 leading-tight",children:["📚 ",e.jsx("span",{className:"font-extrabold text-slate-900",children:l})," (kl. ",c,", s. ",r,")"]},s)});return e.jsxs("div",{className:"flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative print:p-0 print:bg-white print:overflow-visible",children:[e.jsx("style",{children:`
        @media print {
          /* Ukrywamy nagłówek i stopkę systemową */
          header, footer, #restoring-pointer-blocker {
            display: none !important;
          }

          /* Resetujemy wysokości i paski przewijania kontenerów nadrzędnych */
          html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            position: static !important;
          }

          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .print-card {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            padding: 10px !important;
            margin-bottom: 25px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
            color: #000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h2, h3, h4 {
            color: #000 !important;
          }
        }
      `}),e.jsxs("div",{className:"no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 max-w-7xl mx-auto",children:[He&&e.jsx("div",{className:"mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl text-left",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx("span",{className:"text-xl shrink-0",children:"⚠️"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase tracking-tight",children:"Ograniczenie zabezpieczeń przeglądarki (Praca w Ramce iFrame)"}),e.jsxs("p",{className:"text-[11px] text-amber-800 leading-normal font-semibold mt-1",children:["Aktualnie przeglądasz aplikację wewnątrz bezpiecznej ramki podglądu AI Studio. Przeglądarki internetowe **całkowicie blokują** próby uruchomienia okna drukowania (",e.jsx("code",{className:"font-mono bg-amber-100 px-1 py-0.5 rounded",children:"window.print()"}),") oraz otwierania nowych okien z wnętrza takich ramek."]}),e.jsxs("div",{className:"bg-white/80 border border-amber-200/50 rounded-lg p-2.5 mt-2.5 space-y-1.5 text-[10.5px] font-bold text-amber-950",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"1"}),e.jsxs("span",{children:["Kliknij okrągłą ikonę ze strzałką ",e.jsx("strong",{className:"font-black",children:'"Otwórz w nowej karcie"'})," w prawym górnym rogu podglądu aplikacji."]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"2"}),e.jsxs("span",{children:["W nowym oknie przycisk ",e.jsx("strong",{className:"font-black",children:'"Drukuj teraz"'})," oraz ",e.jsx("strong",{className:"font-black",children:'"Podgląd płachty sal"'})," zadziałają natychmiast!"]})]})]})]})]})}),e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("div",{className:"p-2 bg-blue-100 text-blue-600 rounded-lg",children:e.jsx(S,{size:20})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"Centrum Wydruków i Publikacji"}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase mt-0.5",children:"Wygodne drukowanie planów lekcji i dyżurów"})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[k==="rooms"&&e.jsxs("button",{onClick:ce,className:"px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(S,{size:15,className:"animate-pulse"})," Podgląd płachty sal"]}),k==="duties"&&e.jsxs("button",{onClick:()=>ie(!0),className:"px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(S,{size:15,className:"animate-pulse"})," Podgląd dyżurów"]}),(k==="classes"||k==="teachers")&&e.jsxs("button",{onClick:()=>Pe(!0),className:"px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",title:"Generuj przejrzysty i czytelny tygodniowy plan dostosowany do wydruku z czyszczeniem interfejsu",children:[e.jsx(ke,{size:15})," Generuj Tygodniowy Plan"]}),e.jsxs("button",{onClick:Xe,className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer",children:[e.jsx(S,{size:15})," Drukuj teraz (Ctrl+P)"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Typ wydruku"}),e.jsxs("div",{className:"grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>C("classes"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="classes"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Plan Klas"}),e.jsx("button",{onClick:()=>C("teachers"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="teachers"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Nauczyciele"}),e.jsx("button",{onClick:()=>C("rooms"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="rooms"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Gabinety"}),e.jsx("button",{onClick:()=>C("duties"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="duties"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Dyżury"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Siatka Lekcji"}),e.jsxs("select",{value:A,onChange:t=>q(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"etap1",children:"Etap 1: Plan Klas (Siatka bazowa)"}),e.jsx("option",{value:"etap2",children:"Etap 2: Plan Sal (Przydzielone gabinety)"})]})]}),k==="classes"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Klasę"}),e.jsxs("select",{value:R,onChange:t=>O(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały (każdy na nowej stronie)"}),h.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]})]}),k==="teachers"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Nauczyciela"}),e.jsxs("select",{value:D,onChange:t=>K(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele (każdy na nowej stronie)"}),h.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first," (",t.abbr,")"]},t.id))]})]}),k==="rooms"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Gabinet"}),e.jsxs("select",{value:E,onChange:t=>U(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie sale/gabinety"}),h.rooms.map(t=>e.jsxs("option",{value:t.id,children:[t.name," (",t.desc||"sala ogólna",")"]},t.id))]})]}),k==="rooms"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:ce,className:"w-full h-[38px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-amber-600 border-solid",children:[e.jsx(S,{size:15})," Podgląd wydruku płachty sal"]})]}),k==="duties"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:()=>ie(!0),className:"w-full h-[38px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",children:[e.jsx(S,{size:15})," Podgląd wydruku dyżurów"]})]})]}),k==="teachers"&&e.jsx("div",{className:"mt-5 pt-5 border-t border-slate-100 space-y-4 text-left",children:e.jsxs("div",{className:"bg-gradient-to-tr from-indigo-50/70 to-blue-50/30 border border-indigo-100 rounded-xl p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsx("span",{className:"p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md font-extrabold text-xs",children:"📅"}),e.jsx("span",{className:"text-xs font-black uppercase text-indigo-900 tracking-wide",children:"Eksport tygodniowego planu zajęć do kalendarza (.ics / Google Calendar)"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 items-end",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Początek okresu (Pierwszy dzień lekcji)"}),e.jsx("input",{type:"date",value:ge,onChange:t=>Ce(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Koniec okresu (Ostatni dzień lekcji)"}),e.jsx("input",{type:"date",value:je,onChange:t=>Se(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Format tytułu wydarzenia w kalendarzu"}),e.jsxs("select",{value:ye,onChange:t=>Je(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none",children:[e.jsx("option",{value:"[Przedmiot] - [Klasa] [Sala]",children:"[Przedmiot] - [Klasa] [Sala]"}),e.jsx("option",{value:"[Klasa] - [Przedmiot] [Sala]",children:"[Klasa] - [Przedmiot] [Sala]"}),e.jsx("option",{value:"[Przedmiot] ([Klasa]) (Sala: [Sala])",children:"[Przedmiot] ([Klasa]) ([Sala])"})]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-indigo-100/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center",children:[e.jsxs("div",{className:"text-[10px] text-slate-500 leading-relaxed max-w-xl",children:["💡 ",e.jsx("strong",{children:"Wskazówka:"})," Kliknij przycisk ",e.jsx("span",{className:"bg-white border text-indigo-700 px-1 py-0.5 rounded font-black text-[9px]",children:"Pobierz kalendarz (.ics)"})," przy konkretnym nauczycielu na liście poniżej, albo pobierz zbiorczy arkusz z kadrą za pomocą poniższych przycisków szybkiego pobierania."]}),e.jsxs("div",{className:"flex gap-2 flex-wrap w-full lg:w-auto",children:[D!=="all"&&e.jsxs("button",{onClick:()=>{const t=h.teachers.find(d=>d.id===D);t&&Me(t)},className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(ke,{size:13})," Pobierz dla ",(Ge=h.teachers.find(t=>t.id===D))==null?void 0:Ge.abbr]}),e.jsxs("button",{onClick:Qe,className:"px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-slate-800 border-solid",children:[e.jsx(nt,{size:13})," Wspólny plik dla KADRY"]})]})]})]})})]}),e.jsxs("div",{className:"print-container max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:[k==="classes"&&xe.map((t,d)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${d<xe.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI · KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),L.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:T.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{var a;let o=[];if(A==="etap1"){const n=`${t.id}|${r}|${c}`,p=h.lessons[n];if(p){const x=h.assignments.find(i=>i.id===p.assignmentId);if(x){const i=((a=Y.get(x.subjectId))==null?void 0:a.name)||"Inny",u=x.teacherId?de.get(x.teacherId):null,b=x.roomId?se.get(x.roomId):null;o.push({subject:i,teacherAbbr:u==null?void 0:u.abbr,roomName:b==null?void 0:b.name})}}}else(((_.classes[t.id]||{})[r]||{})[l]||[]).forEach(i=>{o.push({subject:i.subject,teacherAbbr:i.teacherAbbr,roomName:i.note})});return e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:o.length>0?e.jsx("div",{className:"space-y-1",children:o.map((n,p)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:n.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[n.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:n.teacherAbbr}),n.roomName&&e.jsxs("span",{className:"bg-blue-50/50 border border-blue-100 text-blue-700 px-1 rounded",children:["f. ",n.roomName]})]})]},p))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id)),k==="teachers"&&pe.map((t,d)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${d<pe.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI NAUCZYCIELA: ",t.last," ",t.first," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[e.jsxs("button",{onClick:()=>Me(t),className:"no-print px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg text-[10px] font-black tracking-tight leading-none transition flex items-center gap-1.5 cursor-pointer select-none border-solid",title:"Pobierz plik kalendarza (.ics) dla tego nauczyciela",children:[e.jsx(ke,{size:11})," Pobierz kalendarz (.ics)"]}),e.jsxs("div",{className:"text-right text-[9px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),L.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:T.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{let o=[];return A==="etap1"?Object.entries(h.lessons).forEach(([a,n])=>{var b,g;const p=a.split("|"),x=p[0],i=parseInt(p[1],10),u=parseInt(p[2],10);if(i===r&&u===c){const f=h.assignments.find(j=>j.id===n.assignmentId);if(f&&f.teacherId===t.id){const j=((b=Y.get(f.subjectId))==null?void 0:b.name)||"Inny",P=((g=V.get(x))==null?void 0:g.name)||"Inna",y=f.roomId?se.get(f.roomId):null;o.push({subject:j,className:P,roomName:y==null?void 0:y.name})}}}):(((_.teachers[t.id]||{})[r]||{})[l]||[]).forEach(x=>{var i;o.push({subject:x.subject,className:x.className||((i=x.classes)==null?void 0:i.join("+"))||"Klasa",roomName:x.note})}),e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:o.length>0?e.jsx("div",{className:"space-y-1",children:o.map((a,n)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:a.className}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1.5 rounded",children:["s. ",a.roomName]})]})]},n))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id)),k==="rooms"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN MATRYCOWY GABINETÓW / SAL LEKCYJNYCH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase no-print",children:"Zbiorcza płachta obłożenia gabinetów podzielona na poszczególne dni tygodnia. Filtrowanie pozwala na ograniczenie kolumn płachty."}),e.jsxs("div",{className:"no-print bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6",children:[e.jsxs("div",{className:"space-y-1 text-left",children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase",children:"✨ Dedykowany Wydruk Płachty Dyrektorskiej"}),e.jsx("p",{className:"text-[11px] text-amber-700 leading-normal font-medium max-w-3xl",children:"Standardowy wydruk w ramce przeglądarki może ucinać szeroką tabelę gabinetów. Nasz inteligentny generator otwiera dedykowany, czysty arkusz HTML zoptymalizowany pod układ poziomy (A4 landscape) bez zbędnych elementów deweloperskich i automatycznie uruchamia okno dialogowe drukarki."})]}),e.jsxs("button",{onClick:ce,className:"shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(S,{size:14,className:"animate-pulse"})," Podgląd i Druk Płachty (A4 Poziomo)"]})]}),we.length===0?e.jsx("p",{className:"text-xs text-slate-400 p-4 text-center",children:"Brak gabinetów do wyświetlenia w wybranym filtrze."}):e.jsx("div",{className:"space-y-12",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"page-break last:pb-0 pb-2",children:[e.jsxs("div",{className:"bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl flex justify-between items-center mb-4 print:bg-slate-100 print:text-slate-900 print:border-slate-300",children:[e.jsxs("span",{className:"text-xs font-black uppercase tracking-wide",children:["📅 ",L[t]," — PŁACHTA OBŁOŻENIA GABINETÓW"]}),e.jsx("span",{className:"text-[9px] uppercase font-bold font-mono text-slate-400 print:text-slate-500",children:"Podział na kategorie"})]}),e.jsx("div",{className:"space-y-6",children:ae.map(d=>{const s=ve(d.cols,m.buildings),c=ze(d.cols);return e.jsxs("div",{className:"border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40 p-3 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2 px-1",children:[e.jsx("span",{className:"text-sm",children:d.icon}),e.jsxs("h4",{className:"text-[11px] font-black text-slate-700 uppercase tracking-wider",children:[d.name," (",d.cols.length,")"]})]}),e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300 min-w-[600px] bg-white rounded-lg",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lekcja / Godz"}),s.map((l,r)=>e.jsxs("th",{colSpan:l.span,className:"border border-slate-300 p-2 text-center text-[10px] bg-slate-50 font-bold text-slate-700",children:["📍 ",Ne(l.name,l.buildingName)]},r))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-1.5 text-center text-[9px] bg-slate-50 font-medium text-slate-400",children:"-"}),c.map((l,r)=>e.jsxs("th",{colSpan:l.span,className:"border border-slate-300 p-1.5 text-center text-[9px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",l.name]},r))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:"Godzina"}),d.cols.map((l,r)=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10.5px] min-w-[110px]",children:[e.jsxs("span",{className:"font-mono text-[11px] block text-slate-900",children:["🚪 ",l.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-[140px] mx-auto",children:["(",l.room.sub||"sala ogólna",")"]})]},r))]})]}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:T.map((l,r)=>(String(l.num),e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[11px]",children:l.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[l.start,"-",l.end]})]}),d.cols.map((o,a)=>{var p,x,i;let n=[];if(A==="etap1")Object.entries(h.lessons).forEach(([u,b])=>{var y,I,N;const g=u.split("|"),f=g[0],j=parseInt(g[1],10),P=parseInt(g[2],10);if(j===t&&P===r){const z=h.assignments.find($=>$.id===b.assignmentId);if(z){const $=h.rooms.find(G=>G.id===z.roomId);if(z.roomId===o.room.id||$&&$.name.toLowerCase().trim()===o.room.num.toLowerCase().trim()){const G=((y=Y.get(z.subjectId))==null?void 0:y.name)||"Przedmiot",re=((I=V.get(f))==null?void 0:I.name)||"Klasa",H=z.teacherId?(N=de.get(z.teacherId))==null?void 0:N.abbr:"";n.push({subject:G,className:re,teacherAbbr:H})}}}});else{const u=Ue(o),b=(i=(x=(p=M[m.yearKey])==null?void 0:p[t])==null?void 0:x[l.num])==null?void 0:i[u];(Array.isArray(b)?b:b?[b]:[]).forEach(f=>{var j;f&&n.push({subject:f.subject,className:f.className||((j=f.classes)==null?void 0:j.join("+"))||"Klasa",teacherAbbr:f.teacherAbbr})})}return e.jsx("td",{className:"border border-slate-300 p-1.5 align-top text-center min-h-[50px] bg-white",children:n.length>0?e.jsx("div",{className:"space-y-1",children:n.map((u,b)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-extrabold text-slate-900 block text-[10.5px] bg-amber-100/70 border border-amber-200/80 rounded px-1.5 py-0.5 inline-block mb-0.5",children:u.className}),e.jsx("span",{className:"text-[9px] text-slate-700 block font-bold truncate max-w-[100px] mx-auto",title:u.subject,children:u.subject}),u.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-1.5 rounded text-[8.5px] font-bold inline-block mt-0.5",children:u.teacherAbbr})]},b))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},a)})]},l.num)))})]})})]},d.id)})})]},t))})]}),k==="duties"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:"Generowane przez SalePlan Pro · Moduł Dyżurów"})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase",children:"Wydruk harmonogramu dyżurów przydzielonych w poszczególnych rejonach (miejscach) szkoły dla przerw międzylekcyjnych."}),e.jsx("div",{className:"space-y-8",children:[0,1,2,3,4].map(t=>{const d=m.dyzury.miejsca.some(s=>m.dyzury.przerwy.some(c=>{var r;const l=`${s.id}|${t}|${c.num}`;return!!((r=m.dyzury.harmonogram[l])!=null&&r.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-4 bg-slate-50/50 break-inside-avoid",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5",children:["📅 ",L[t]]}),d?m.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs border-collapse border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-left text-[10px] w-48 bg-slate-50",children:"Godzina / Przerwa"}),m.dyzury.miejsca.map(s=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10px] min-w-[110px] bg-slate-50",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:m.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-200 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2.5 font-mono text-[9px] text-left",children:[e.jsx("span",{className:"font-extrabold text-slate-800",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-0.5",children:["⏱️ ",s.start," - ",s.end]})]}),m.dyzury.miejsca.map(c=>{const l=`${c.id}|${t}|${s.num}`,r=m.dyzury.harmonogram[l],o=r!=null&&r.teacherAbbr?m.teachers.find(a=>a.abbr===r.teacherAbbr):null;return e.jsx("td",{className:"border border-slate-300 p-2 text-center align-middle",children:r!=null&&r.teacherAbbr?e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-900 text-white rounded px-2.5 py-1 text-[10px] font-mono font-black shadow-xs tracking-wider uppercase inline-block print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300",children:r.teacherAbbr}),e.jsx("span",{className:"block text-[8.5px] text-slate-400 font-bold truncate max-w-[100px] mt-1 print:text-slate-500",children:o?`${o.first.slice(0,1)}. ${o.last}`:"Dyżur"})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},c.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})]}),Ve&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[9999] no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-3xl max-w-7xl w-full h-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200",children:[e.jsxs("div",{className:"bg-slate-900 text-white p-5 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl",children:e.jsx(S,{size:22,className:"animate-pulse"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-emerald-400 block uppercase font-black tracking-wider",children:"Dynamiczny Podgląd i Weryfikacja • SchedData"}),e.jsx("h3",{className:"text-lg font-black uppercase text-white leading-tight",children:"Harmonogram Dyżurów Nauczycielskich"})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Dzień Tygodnia"}),e.jsxs("select",{value:fe,onChange:t=>{const d=t.target.value;qe(d==="all"?"all":parseInt(d,10))},className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie dni tygodnia"}),[0,1,2,3,4].map(t=>e.jsx("option",{value:t,children:L[t]},t))]})]}),e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Skala (Zoom)"}),e.jsxs("select",{value:ue,onChange:t=>_e(parseFloat(t.target.value)),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"0.7",children:"70% (Gęsty/Kompaktowy)"}),e.jsx("option",{value:"0.8",children:"80%"}),e.jsx("option",{value:"0.85",children:"85%"}),e.jsx("option",{value:"0.9",children:"90%"}),e.jsx("option",{value:"1.0",children:"100% (Standardowy)"}),e.jsx("option",{value:"1.1",children:"110% (Powiększony)"})]})]}),e.jsx("div",{className:"flex items-end h-full",children:e.jsxs("button",{onClick:st,className:"h-[36px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",title:"Otwórz czysty, zoptymalizowany podział A4 landscape do drukowania lub zapisu do PDF",children:[e.jsx(S,{size:15})," Drukuj / Generuj PDF"]})}),e.jsx("div",{className:"flex items-end h-full",children:e.jsx("button",{onClick:()=>ie(!1),className:"h-[36px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center",children:e.jsx(ot,{size:18})})})]})]}),e.jsx("div",{className:"p-6 bg-slate-100 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("div",{className:"mx-auto bg-white p-8 border border-slate-200 shadow-md rounded-2xl space-y-8",style:{transform:`scale(${ue})`,transformOrigin:"top center",width:`${100/ue}%`,transition:"transform 0.15s ease-out, width 0.15s ease-out"},children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsx("h2",{className:"text-xl font-black text-slate-950",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-extrabold uppercase",children:[m.school.name," • Rok szkolny ",m.yearLabel]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:"Generowane dynamicznie • Weryfikacja planu lekcji (SchedData)"})]}),e.jsx("div",{className:"space-y-8 text-left",children:[0,1,2,3,4].filter(t=>fe==="all"||fe===t).map(t=>{const d=m.dyzury.miejsca.some(s=>m.dyzury.przerwy.some(c=>{var r;const l=`${s.id}|${t}|${c.num}`;return!!((r=m.dyzury.harmonogram[l])!=null&&r.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-5 bg-slate-50/50 break-inside-avoid shadow-sm",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center justify-between",children:[e.jsxs("span",{children:["📅 ",L[t]]}),e.jsxs("span",{className:"text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider",children:[m.dyzury.miejsca.length," Miejsc • ",m.dyzury.przerwy.length," Przerw"]})]}),d?m.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 border border-slate-200 rounded-xl shadow-xs",children:e.jsxs("table",{className:"w-full text-xs border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"p-3 text-left text-[10px] w-48 bg-slate-50 font-black border-r border-slate-200",children:"Godzina / Przerwa"}),m.dyzury.miejsca.map(s=>e.jsxs("th",{className:"p-3 text-center text-[10px] min-w-[200px] bg-slate-50 font-black border-r border-slate-200 last:border-r-0",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:m.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"p-3 font-mono text-[9px] text-left border-r border-slate-200 font-semibold bg-slate-50/30",children:[e.jsx("span",{className:"font-extrabold text-slate-800 block text-xs",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-1",children:["⏱️ ",s.start," - ",s.end]})]}),m.dyzury.miejsca.map(c=>{var b;const l=`${c.id}|${t}|${s.num}`,r=m.dyzury.harmonogram[l],o=r!=null&&r.teacherAbbr?m.teachers.find(g=>g.abbr===r.teacherAbbr):null,a=(o==null?void 0:o.id)||(r==null?void 0:r.teacherAbbr)||"",n=a?((b=_.teachers[a])==null?void 0:b[t])||{}:{},p=a?n[String(s.num)]||[]:[],x=a?n[String(s.num+1)]||[]:[],i=a?Object.values(n).some(g=>Array.isArray(g)&&g.length>0):!1,u=m.dyzury.miejsca.filter(g=>g.id!==c.id).map(g=>{const f=`${g.id}|${t}|${s.num}`;return{placeName:g.name,entry:m.dyzury.harmonogram[f]}}).filter(g=>{var f;return((f=g.entry)==null?void 0:f.teacherAbbr)===(r==null?void 0:r.teacherAbbr)});return e.jsx("td",{className:"p-3 text-center align-middle border-r border-slate-200 last:border-r-0",children:r!=null&&r.teacherAbbr?e.jsxs("div",{className:"flex flex-col items-center justify-center space-y-2",children:[e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-1 text-xs font-mono font-black shadow-xs tracking-wider uppercase inline-block",children:r.teacherAbbr}),e.jsx("span",{className:"block text-[9px] text-slate-600 font-bold truncate max-w-[150px] mt-1",children:o?`${o.first} ${o.last}`:"Dyżur"})]}),e.jsxs("div",{className:"w-full mt-2 pt-2 border-t border-slate-100 text-left space-y-1 bg-slate-50/50 p-2 rounded-lg",children:[e.jsx("div",{className:"text-[8px] text-slate-400 uppercase font-black tracking-wider mb-1",children:"Weryfikacja lekcji:"}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Przed przerwą: "}),p.length>0?We(p):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Po przerwie: "}),x.length>0?We(x):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]})]}),(u.length>0||!i)&&e.jsxs("div",{className:"w-full space-y-1",children:[u.length>0&&e.jsxs("div",{className:"bg-red-50 text-red-700 border border-red-200 rounded p-1 text-[8.5px] font-bold text-left",children:["🚨 Kolizja: Jednoczesny dyżur w rejonie: ",u.map(g=>g.placeName).join(", ")]}),!i&&e.jsx("div",{className:"bg-amber-50 text-amber-700 border border-amber-200 rounded p-1 text-[8.5px] font-bold text-left",children:"⚠️ Brak innych lekcji w tym dniu!"})]})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},c.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})}),e.jsxs("div",{className:"bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0",children:[e.jsx("span",{className:"text-xs text-slate-400 font-semibold uppercase",children:"Opcje weryfikacji są dynamicznie synchronizowane z głównym widokiem deweloperskim"}),e.jsx("button",{onClick:()=>ie(!1),className:"px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg transition",children:"Zamknij podgląd"})]})]})}),Ye&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200",children:[e.jsx("h3",{className:"text-sm font-black text-slate-900 uppercase tracking-tight mb-2",children:"Pop-up zablokowany lub zakazany w bezpiecznym iFrame"}),e.jsx("p",{className:"text-xs text-slate-600 leading-relaxed mb-4",children:"Twoja przeglądarka lub kontener deweloperski zablokowały otwarcie nowego okna dla podglądu płachty sal. Aby wydrukować lub zapisać plan jako PDF, postępuj według poniższych kroków:"}),e.jsxs("div",{className:"bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-700 mb-6 text-left",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"1"}),e.jsx("span",{children:"Otwórz aplikację w osobnym oknie przeglądarki za pomocą przycisku w prawym górnym rogu podglądu."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"2"}),e.jsx("span",{children:"Zezwól na wyskakujące okienka (pop-up) dla adresu tej aplikacji w ustawieniach przeglądarki."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"3"}),e.jsxs("span",{children:["Alternatywnie użyj przycisku ",e.jsx("strong",{className:"font-black text-slate-900",children:"Drukuj teraz"})," w menu głównym."]})]})]}),e.jsxs("div",{className:"flex justify-between items-center gap-3",children:[e.jsx("button",{onClick:()=>{oe(!1),window.print()},className:"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer",children:"Drukuj stąd"}),e.jsx("button",{onClick:()=>oe(!1),className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition cursor-pointer",children:"Rozumiem"})]})]})})]})}export{mt as default};
