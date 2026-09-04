from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
questions_path = root / 'data' / 'questions.json'
cards_path = root / 'data' / 'cards.json'
out_path = root / 'js' / 'questions.js'

questions = json.loads(questions_path.read_text(encoding='utf-8'))
cards = json.loads(cards_path.read_text(encoding='utf-8'))

out = (
    'window.TRILHAS_QUESTIONS = ' + json.dumps(questions, ensure_ascii=False, indent=2) + ';\n\n' +
    'window.TRILHAS_CARDS = ' + json.dumps(cards, ensure_ascii=False, indent=2) + ';\n'
)
out_path.write_text(out, encoding='utf-8')
print(f'Banco atualizado: {len(questions)} perguntas e {len(cards)} cartas.')
