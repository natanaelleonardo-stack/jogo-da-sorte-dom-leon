# 🎱 Jogo da Sorte — Padaria Dom Leon

Aplicativo web de loteria instantânea para uso no tablet do balcão da Padaria Dom Leon.

## Tecnologias
- HTML5 + CSS3 + JavaScript puro
- [Firebase Firestore](https://firebase.google.com/) — banco de dados em tempo real
- [Firebase Authentication](https://firebase.google.com/docs/auth) — login anônimo
- Hospedado via [GitHub Pages](https://pages.github.com/)

## Telas
| Aba | Acesso | Descrição |
|---|---|---|
| Prêmios | Público | Vitrine dos prêmios da rodada em aberto |
| Cartela | Público | Venda e emissão de tickets |
| Revelação | Público | Revelação dos números do ticket |
| Conferência | Admin (PIN) | Relatório de fechamento da rodada |
| Abertura | Admin (PIN) | Configuração e abertura de nova rodada |

## Configuração

### 1. Firebase
Substitua o objeto `firebaseConfig` em `script.js` com as credenciais do seu projeto Firebase:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  ...
};
```

### 2. PIN de admin
Altere a constante `ADMIN_PIN` em `script.js`:
```js
const ADMIN_PIN = "1234"; // troque para o PIN desejado
```

### 3. GitHub Pages
- Vá em **Settings → Pages**
- Source: `Deploy from a branch`
- Branch: `main` / `root`
- Acesse em: `https://<seu-usuario>.github.io/jogo-da-sorte-dom-leon`

## Estrutura
```
jogo-da-sorte-dom-leon/
├── index.html   — estrutura HTML das telas
├── style.css    — estilos e tema visual
├── script.js    — lógica, Firebase e interações
└── README.md    — este arquivo
```

## Desenvolvido por
Natan Leonardo — Padaria Dom Leon, Salto de Pirapora/SP
