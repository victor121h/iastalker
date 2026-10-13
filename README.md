# Morada

Simulador de vida em 3D que roda no navegador (Three.js r128, JavaScript puro, interface em português).

- `index.html` + `js/*.js`: o jogo (publicado como Artifact no claude.ai)
- `ARCHITECTURE.md`, `DESIGN.md`: contrato de código e decisões de design
- `RESEARCH.md`: pesquisa das mecânicas clássicas de simuladores de vida (fontes públicas)
- `tools/`: testes em Node e checagens em navegador headless (`node tools/check.mjs`)
- `vendor/three.min.js`: cópia local do Three.js r128 usada só nos testes
