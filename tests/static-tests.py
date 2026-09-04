from pathlib import Path
import json, re, sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
errors = []

# JSON validity
for name in ['manifest.json', 'data/questions.json', 'data/cards.json']:
    try:
        json.loads((root / name).read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{name}: JSON inválido: {exc}')

# Essential files
essential = [
    'index.html','css/style.css','js/polyfills.js','js/questions.js','js/game.js',
    'js/accessibility.js','js/app.js','manifest.json','service-worker.js',
    'assets/images/board.jpg','assets/images/logo-projeto.png',
    'assets/icons/icon-192.png','assets/icons/icon-512.png'
]
for rel in essential:
    if not (root / rel).is_file(): errors.append(f'Arquivo ausente: {rel}')

# Service worker cached paths
sw = (root / 'service-worker.js').read_text(encoding='utf-8')
for rel in re.findall(r"'\.\/([^']+)'", sw):
    if rel and not (root / rel).exists():
        errors.append(f'Cache referencia arquivo inexistente: {rel}')

# Local-only dependencies in runtime source
for rel in ['index.html','css/style.css','js/app.js','js/accessibility.js','js/game.js','service-worker.js']:
    text = (root / rel).read_text(encoding='utf-8')
    if re.search(r'https?://', text):
        errors.append(f'Dependência externa encontrada em {rel}')


# Interface guiada e perguntas sem exposição prévia do gabarito
app_js = (root / 'js/app.js').read_text(encoding='utf-8')
style_css = (root / 'css/style.css').read_text(encoding='utf-8')
if 'question-modal-overlay' not in app_js or 'question-hub-grid' not in app_js:
    errors.append('Fluxo de perguntas em pop-up sobre o tabuleiro não encontrado')
if 'is-guided-action' not in app_js or 'guidedActionPulse' not in style_css:
    errors.append('Orientação visual da primeira ação não encontrada')
if 'renderBrowserCategory' in app_js or 'browser-category' in app_js:
    errors.append('A antiga listagem completa de perguntas e respostas ainda está acessível')
if 'data-action=\"practice-question\"' not in app_js:
    errors.append('Seleção de tema não sorteia uma pergunta de treinamento diretamente')

# Icon sizes
for rel, expected in [('assets/icons/icon-192.png',(192,192)),('assets/icons/icon-512.png',(512,512)),('assets/icons/icon-maskable-512.png',(512,512))]:
    with Image.open(root / rel) as img:
        if img.size != expected: errors.append(f'{rel}: tamanho {img.size}, esperado {expected}')

# Official category color mapping
app_text = (root / 'js/app.js').read_text(encoding='utf-8')
if "green: { label: 'Verde', title: 'Conceituação e classificação das drogas'" not in app_text:
    errors.append('Mapeamento oficial da categoria verde não encontrado')
if "blue: { label: 'Azul', title: 'Efeitos das drogas'" not in app_text:
    errors.append('Mapeamento oficial da categoria azul não encontrado')

# Board asset regression check
app_js = (root / 'js/app.js').read_text(encoding='utf-8')
if 'assets/images/board.svg' in app_js:
    errors.append('O aplicativo ainda referencia o tabuleiro SVG provisório')
if 'assets/images/board.jpg' not in app_js:
    errors.append('O aplicativo não referencia a arte oficial board.jpg')

# Content consistency
questions = json.loads((root/'data/questions.json').read_text(encoding='utf-8'))
cards = json.loads((root/'data/cards.json').read_text(encoding='utf-8'))
if len(questions) != 50: errors.append('Quantidade de perguntas diferente de 50')
if len(cards) != 10: errors.append('Quantidade de cartas diferente de 10')
if len({q['id'] for q in questions}) != len(questions): errors.append('IDs de perguntas repetidos')
if len({c['id'] for c in cards}) != len(cards): errors.append('IDs de cartas repetidos')

if errors:
    print('\n'.join('ERRO: '+e for e in errors))
    sys.exit(1)
print('Integridade estática aprovada: JSON, arquivos, cache, dependências locais, ícones e bancos de conteúdo.')
