import base64, json, os, sys, urllib.request
KEY = os.environ['GEMINI_VERTEX_API_KEY']
MODEL = os.environ.get('MODEL', 'gemini-2.5-flash-image')
A = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets') + '/'
def part(path):
    mime = 'image/png'
    return {'inlineData': {'mimeType': mime, 'data': base64.b64encode(open(path, 'rb').read()).decode()}}
def gen(out, prompt, images):
    body = {'contents': [{'role': 'user', 'parts': [part(p) for p in images] + [{'text': prompt}]}],
            'generationConfig': {'responseModalities': ['TEXT', 'IMAGE'], 'imageConfig': {'aspectRatio': '1:1'}}}
    url = 'https://aiplatform.googleapis.com/v1/publishers/google/models/%s:generateContent?key=%s' % (MODEL, KEY)
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        print(out, 'HTTP', e.code, e.read().decode()[:400]); return False
    for c in r.get('candidates', []):
        for p in c.get('content', {}).get('parts', []):
            if 'inlineData' in p:
                open(out, 'wb').write(base64.b64decode(p['inlineData']['data'])); print('wrote', out); return True
            if 'text' in p: print('text:', p['text'][:200])
    print(out, 'no image', json.dumps(r)[:300]); return False

STYLE = ("Create a single video-game character sprite in EXACTLY the same art style as the first two reference images "
         "(the chunky 16-bit painted pixel-art style of Mark and Marissa: big expressive head, bold dark outline, warm shading, visible pixels). "
         "Use the third image (a photo of the real person) only for their likeness, hair, outfit and colors. "
         "Full body, standing, facing the camera, happy smile, arms relaxed, feet visible. "
         "One character only, centered, on a perfectly flat solid pure magenta (#FF00FF) background with no shadow, no floor, no text.")
# Output goes to art/family; reference crops of the real photos stay OUT of the repo (pass REFS=<dir>)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'family') + '/'
REFS = os.environ.get('REFS', D)
PEOPLE = {
    'aaron': "Young man: curly black hair, short beard stubble, light grey three-piece suit with vest, sage green bow tie, white shirt, tan brown shoes, pink boutonniere.",
    'amma': "Woman: black hair center-parted and pulled back in a low bun, dusty rose pink silk saree with gold zari and the pallu draped over her shoulder, gold necklace and gold bangles, warm smile.",
    'appa': "Man: COMPLETELY BALD shiny head with NO hair on top, short salt-and-pepper beard and mustache, black tuxedo, black bow tie, white shirt, burgundy boutonniere, big smile.",
    'luke': "Young man: short black hair, clean shaven, light grey three-piece suit with vest, sage green long necktie, white shirt, pink boutonniere, big smile.",
    'dada': "Older man: short black hair greying at the sides, mustache, black tuxedo with black vest, black bow tie, white shirt, red boutonniere, big smile.",
    'mama': "Woman: black hair pulled back, rose pink saree with darker pink pattern and gold border, pallu over her shoulder, gold necklace, warm smile.",
    'ruth': "Young woman: dark hair in an elegant updo with pink flowers, sage green embellished lehenga with sparkles and a matching dupatta, holding a small pink and white rose bouquet, big smile.",
}
for name in sys.argv[1:]:
    gen(D + name + '.png', STYLE + ' The person: ' + PEOPLE[name], [A + 'char-mark.png', A + 'char-marissa.png', os.path.join(REFS, 'ref-' + name + '.png')])
