# 🖨️ Calculadora de Custos de Impressão 3D

Página web **gratuita, offline e sem servidor** para descobrir o custo real de uma impressão 3D:
quanto de filamento de cada cor foi gasto, quanto custou cada cor, quanto deu a energia elétrica
e qual o preço final da peça.

Feita para ser publicada direto no **GitHub Pages**.

---

## ✨ O que ela calcula

| Etapa | O que você informa | O que a calculadora retorna |
|---|---|---|
| **1. Filamento por cor** | Nome/cor, gramas usadas, preço do rolo, peso do rolo, % de desperdício | **R$/kg automático**, **custo de cada cor**, total de gramas e total do filamento |
| **2. Energia elétrica** | Potência da impressora (W), outros aparelhos (W), tempo de impressão, tarifa R$/kWh | Consumo em **kWh**, **custo da energia** e **custo por hora ligada** |
| **3. Máquina e lucro** | Valor da impressora + vida útil, manutenção/h, mão de obra/h, margem de lucro | **Depreciação por hora**, custos adicionais e lucro |
| **4. Resumo** | — | **Total da impressão**, detalhamento **cor a cor**, subtotal (custo real), preço final e **custo por grama** |

### Exemplo rápido

- 45 g de preto + 30 g de branco, rolo de 1 kg por R$ 89,90
- Impressão de 2 h 30 min a 250 W, tarifa de R$ 0,95/kWh
- Impressora de R$ 1.500 com vida útil de 4.000 h (deprecia R$ 0,38/h)

A calculadora mostra o custo de cada cor, o custo da energia (e por hora), a depreciação
e o total — e ainda monta um **resumo em texto** para você copiar e mandar no WhatsApp
ou anexar ao orçamento.

---

## 🚀 Como usar

Basta abrir o arquivo `index.html` no navegador. Não precisa instalar nada.

```bash
# opção 1: duplo clique no index.html

# opção 2: servidor local (com Python)
python -m http.server 8000
# depois acesse http://localhost:8000
```

Seus dados ficam salvos apenas no `localStorage` do seu navegador — nada é enviado para a internet.

---

## 🌐 Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `calculo-3dprint`).
2. Envie os arquivos deste projeto:

   ```bash
   git init
   git add .
   git commit -m "Calculadora de custos de impressão 3D"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/calculo-3dprint.git
   git push -u origin main
   ```

3. No GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
4. Escolha a branch `main` e a pasta `/ (root)` → **Save**.
5. Em 1 minuto sua página estará online em:
   `https://SEU_USUARIO.github.io/calculo-3dprint/`

---

## 📁 Estrutura do projeto

```
.
├── index.html          # interface da calculadora
├── assets/
│   ├── css/style.css   # tema, layout responsivo
│   └── js/app.js       # cálculos e salvamento automático
├── README.md
└── LICENSE
```

## 🛠️ Tecnologias

- HTML5, CSS3 e JavaScript puro (sem dependências, sem build).
- `Intl.NumberFormat` para valores em **R$** no padrão brasileiro.
- Layout responsivo (celular, tablet e desktop).

## 📄 Licença

[MIT](LICENSE) — use, modifique e compartilhe livremente.
