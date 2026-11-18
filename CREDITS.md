# Créditos dos assets

**Todas** as imagens, sons e músicas do jogo vêm de pacotes públicos, feitos por artistas e músicos humanos.
Nenhum asset foi gerado por inteligência artificial nem desenhado por código.
Cada pasta em `public/assets/` traz o arquivo de licença original do pacote.

## Arte (sprites, tiles, fundos)

| Pacote | Autor | Licença | Pasta | Onde é usado |
|---|---|---|---|---|
| New Platformer Pack 1.1 | Kenney (kenney.nl) | CC0 1.0 | `kenney_new-platformer-pack/` | terrenos (grama, areia, terra, neve, pedra), blocos, escadas, cordas, moedas, chaves, molas, estrelas, personagens, inimigos e ícones do HUD |
| Background Elements Remastered | Kenney | CC0 1.0 | `kenney_background-elements-remastered/` | fundos de cada fase, árvores, chalés, pirâmides, palmeiras, cactos, lua |
| Platformer Art: Winter (Ice World) | Kenney | CC0 1.0 | `kenney_platformer-art-winter/` | bolas de neve, blocos de gelo, iglu |
| Pixel Platformer: Farm Expansion | Kenney | CC0 1.0 | `kenney_pixel-platformer-farm-expansion/` | abóboras, abóbora-lanterna, fardos de feno, girassóis e plantações do Vale das Abóboras |

Todos os pacotes Kenney estão em https://kenney.nl/assets (busque pelo nome do pacote).

## Efeitos sonoros

| Pacote | Autor | Licença | Pasta |
|---|---|---|---|
| New Platformer Pack (sons) | Kenney | CC0 1.0 | `kenney_new-platformer-pack/sounds/` |
| Impact Sounds | Kenney | CC0 1.0 | `kenney_impact-sounds/` |
| Interface Sounds | Kenney | CC0 1.0 | `kenney_interface-sounds/` |

## Músicas

| Faixas | Autor | Licença | Pasta |
|---|---|---|---|
| "5 Chiptunes (Action)" e "4 Chiptunes (Adventure)" | Juhani Junkala (SubspaceAudio) | CC0 1.0 | `music_juhani-junkala/` (veja o `LICENSE.md` da pasta) |

Fontes: https://opengameart.org/content/5-chiptunes-action · https://opengameart.org/content/4-chiptunes-adventure

## Fonte tipográfica

| Fonte | Autor | Licença |
|---|---|---|
| Press Start 2P | codeman38 | SIL Open Font License 1.1 (instalada pelo npm: `@fontsource/press-start-2p`) |

## Alterações feitas nos assets

- Arquivos renomeados (músicas) e copiados só os que o jogo usa.
- Em tempo de execução, o jogo **tinge** algumas imagens (luz alaranjada no outono, efeito de gelo no chefe) e **estica** o sprite da corda. Os arquivos originais não foram editados.

## Código

Código do jogo: licença MIT (arquivo `LICENSE`). Usa **Three.js** (MIT) e **Vite** (MIT).
