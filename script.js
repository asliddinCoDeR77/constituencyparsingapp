const API_KEY = "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";


const SYSTEM_PROMPT = `
Siz o'zbek tili uchun ixtisoslashgan, xato qilmaydigan "Constituency Parser" tizimisiz.
[cite_start]Vazifangiz: Gapni tarkibiy qismlarga ajratish va grafik iyerarxiya hamda jadval yaratish[cite: 1, 4, 7].

QAT'IY QOIDALAR:
1. [cite_start]Har doim gapni "S" (Gap) ildizidan boshlang[cite: 6, 9].
2. [cite_start]Har bir so'z (token) NP (Otli birikma) yoki VP (Fe'lli birikma) ichida bo'lishi shart[cite: 5, 8].
3. Chunk tag: Birikmaning birinchi so'zi doim "B-", keyingilari "I-" bilan boshlanadi (Masalan: B-NP, I-NP).
4. [cite_start]Taglar (POS): N (Ot), JJ (Sifat), VB (Fe'l), RR (Ravish), PRN (Olmosh), PUNCT (Tinish belgisi)[cite: 7, 9].
5. Tinish belgilari uchun: BI="B", Tag="PUNCT", Chunk="O".

NAMUNA (Standard):
Input: "Tarix hayotning haqiqiy o'qituvchisidir."
Output JSON:
{
  "tree": {
    "label": "S",
    "children": [
      {
        "label": "NP",
        "children": [
          {"label": "Tarix", "isToken": true},
          {"label": "NP", "children": [
            {"label": "hayotning", "isToken": true},
            {"label": "haqiqiy", "isToken": true},
            {"label": "o'qituvchisidir", "isToken": true}
          ]}
        ]
      },
      {"label": ".", "isToken": true}
    ]
  },
  "tokens": [
    {"id": 1, "token": "Tarix", "lemma": "tarix", "tag": "N", "bi": "B", "chunk": "B-NP"},
    {"id": 2, "token": "hayotning", "lemma": "hayot", "tag": "N", "bi": "B", "chunk": "B-NP"},
    {"id": 3, "token": "haqiqiy", "lemma": "haqiqiy", "tag": "JJ", "bi": "B", "chunk": "I-NP"},
    {"id": 4, "token": "o'qituvchisidir", "lemma": "o'qituvchi", "tag": "N", "bi": "B", "chunk": "I-NP"},
    {"id": 5, "token": ".", "lemma": ".", "tag": "PUNCT", "bi": "B", "chunk": "O"}
  ]
}
`;

async function checkLocalDatabase(inputText) {
    try {
        const response = await fetch('data.txt');
        
        if (!response.ok) return null;

        const database = await response.json();
        
        const foundItem = database.find(item => 
            item.input.trim().toLowerCase() === inputText.trim().toLowerCase()
        );

        return foundItem ? foundItem.output : null;

    } catch (error) {
        console.warn("Lokal baza (data.txt) o'qilmadi yoki mavjud emas. AI ishlatiladi.", error);
        return null;
    }
}

async function startAnalysis() {
    const text = document.getElementById('inputText').value;
    const btn = document.getElementById('runBtn');
    
    if (!text.trim()) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> TAHLIL QILINMOQDA...';

    try {
        const localResult = await checkLocalDatabase(text);

        if (localResult) {
            console.log("Natija data.txt bazasidan olindi (Offline mode).");
            renderTable(localResult.tokens);
            drawTree(localResult.tree);
            btn.disabled = false;
            btn.innerText = "TAHLILNI BOSHLASH";
            return; 
        }

        console.log("Bazadan topilmadi, AI ga so'rov yuborilmoqda...");
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${API_KEY}` 
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Ushbu gapni yuqoridagi qat'iy namunaga mos tahlil qil: "${text}"` }
                ],
                temperature: 0.0, 
                top_p: 0.01,    
                seed: 12345,      
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);

        renderTable(result.tokens);
        drawTree(result.tree);

    } catch (e) {
        console.error("Xatolik:", e);
        alert("Xatolik yuz berdi. API ulanishini tekshiring.");
    } finally {
        btn.disabled = false;
        btn.innerText = "TAHLILNI BOSHLASH";
    }
}

function renderTable(tokens) {
    const body = document.getElementById('tableBody');
    body.innerHTML = tokens.map(t => `
        <tr>
            <td>1</td>
            <td>${t.id}</td>
            <td>${t.token}</td>
            <td><span class="bi-badge">${t.bi}</span></td>
            <td>${t.lemma}</td>
            <td><span class="tag-badge">${t.tag}</span></td>
            <td>${t.chunk}</td>
        </tr>
    `).join('');
}

function drawTree(data) {
    const canvas = document.getElementById('treeCanvas');
    canvas.innerHTML = "";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "1000"); svg.setAttribute("height", "450");

    function build(node, x, y, space) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const isLeaf = node.isToken === true;

        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", x); txt.setAttribute("y", y);
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("class", isLeaf ? "token-text" : "node-text");
        txt.textContent = node.label;
        g.appendChild(txt);

        if (node.children) {
            node.children.forEach((c, i) => {
                const cx = x - (node.children.length - 1) * space / 2 + i * space;
                const cy = y + 75;
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", x); line.setAttribute("y1", y + 10);
                line.setAttribute("x2", cx); line.setAttribute("y2", cy - 20);
                line.setAttribute("class", "line-path");
                svg.appendChild(line);
                g.appendChild(build(c, cx, cy, space / 1.7));
            });
        }
        return g;
    }

    svg.appendChild(build(data, 500, 40, 320));
    canvas.appendChild(svg);

}

